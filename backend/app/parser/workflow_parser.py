"""Core GitHub Actions YAML Workflow Parser.

Performs safe loading, syntax normalization, schema validation, and structural
extraction from untrusted YAML workflow files without executing any code.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import yaml

from backend.app.parser.models import (
    ActionReference,
    ParsedJob,
    ParsedStep,
    ParsedWorkflow,
    WorkflowParsingError,
)

MAX_WORKFLOW_SIZE_BYTES = 1024 * 1024  # 1 MB maximum allowed file size
SHA1_REGEX = re.compile(r"^[0-9a-fA-F]{40}$")
SECRET_REGEX = re.compile(r"(?:secrets|SECRETS)\.([a-zA-Z0-9_]+)")

# Top-level keys officially recognized by GitHub Actions
KNOWN_TOP_LEVEL_KEYS = {
    "name", "on", "permissions", "env", "defaults", "concurrency",
    "jobs", "run-name"
}


def safe_load_yaml(content: Union[str, bytes]) -> Dict[str, Any]:
    """Safely parse raw YAML workflow text using PyYAML safe_load.

    Enforces size boundaries and normalizes YAML 1.1 specification quirks
    (such as unquoted 'on:' parsing as boolean True).
    """
    if content is None:
        raise WorkflowParsingError("Workflow content cannot be None.")

    if isinstance(content, bytes):
        if len(content) > MAX_WORKFLOW_SIZE_BYTES:
            raise WorkflowParsingError(
                f"Workflow payload exceeds maximum size limit of {MAX_WORKFLOW_SIZE_BYTES} bytes."
            )
        try:
            content = content.decode("utf-8")
        except UnicodeDecodeError as e:
            raise WorkflowParsingError(f"Workflow content is not valid UTF-8: {e}")

    if not isinstance(content, str):
        raise WorkflowParsingError(f"Expected string or bytes for workflow, got {type(content).__name__}")

    if len(content.encode("utf-8")) > MAX_WORKFLOW_SIZE_BYTES:
        raise WorkflowParsingError(
            f"Workflow payload exceeds maximum size limit of {MAX_WORKFLOW_SIZE_BYTES} bytes."
        )

    if not content.strip():
        raise WorkflowParsingError("Workflow content is empty.")

    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        raise WorkflowParsingError(f"YAML syntax parsing error: {exc}", details={"yaml_error": str(exc)})

    if data is None:
        raise WorkflowParsingError("Parsed YAML content is empty or contains only comments.")

    if not isinstance(data, dict):
        raise WorkflowParsingError(
            f"Invalid workflow format: Root must be a dictionary/mapping, got {type(data).__name__}."
        )

    # Normalize YAML 1.1 boolean key quirk: unquoted 'on:' parses as True
    normalized_data: Dict[str, Any] = {}
    for k, v in data.items():
        if k is True:
            normalized_data["on"] = v
        else:
            normalized_data[str(k)] = v

    return normalized_data


def extract_secrets_from_value(value: Any) -> Set[str]:
    """Recursively search any data structure for GitHub Actions secrets references (e.g., secrets.TOKEN)."""
    secrets_found: Set[str] = set()

    if isinstance(value, str):
        matches = SECRET_REGEX.findall(value)
        for m in matches:
            secrets_found.add(m)
    elif isinstance(value, dict):
        for k, v in value.items():
            secrets_found.update(extract_secrets_from_value(k))
            secrets_found.update(extract_secrets_from_value(v))
    elif isinstance(value, list):
        for item in value:
            secrets_found.update(extract_secrets_from_value(item))

    return secrets_found


def parse_action_reference(uses_str: str) -> ActionReference:
    """Parse an external action or reusable workflow string ('uses').

    Identifies repository, action path, version tag, commit SHA pinning,
    and classifies kind: 'github_action', 'reusable_workflow', 'docker', or 'local'.
    """
    uses_clean = uses_str.strip()

    # 1. Docker action
    if uses_clean.startswith("docker://"):
        return ActionReference(
            raw=uses_clean,
            kind="docker",
            repo=uses_clean[len("docker://"):],
            is_pinned_sha=False,
            is_official=False,
        )

    # 2. Local action in same repository
    if uses_clean.startswith("./") or uses_clean.startswith(".\\"):
        return ActionReference(
            raw=uses_clean,
            kind="local",
            path=uses_clean,
            is_pinned_sha=False,
            is_official=False,
        )

    # 3. Remote action or reusable workflow: owner/repo[/path]@ref
    parts = uses_clean.split("@", 1)
    target = parts[0]
    ref = parts[1] if len(parts) > 1 else None

    target_segments = target.split("/")
    owner = target_segments[0] if len(target_segments) > 0 else None
    repo = target_segments[1] if len(target_segments) > 1 else None
    subpath = "/".join(target_segments[2:]) if len(target_segments) > 2 else None

    # Check if this is a reusable workflow (contains .github/workflows or ends with .yml/.yaml)
    is_reusable = (
        ".github/workflows" in target
        or target.endswith(".yml")
        or target.endswith(".yaml")
    )
    kind = "reusable_workflow" if is_reusable else "github_action"

    is_sha = bool(ref and SHA1_REGEX.match(ref))
    is_official = owner in ("actions", "github")

    return ActionReference(
        raw=uses_clean,
        kind=kind,
        owner=owner,
        repo=repo,
        path=subpath,
        ref=ref,
        is_pinned_sha=is_sha,
        is_official=is_official,
    )


def parse_step(raw_step: Any, step_index: int) -> Tuple[ParsedStep, List[str]]:
    """Parse a single step structure within a job."""
    warnings: List[str] = []

    if not isinstance(raw_step, dict):
        warnings.append(f"Step at index {step_index} is not a dictionary; skipped.")
        return ParsedStep(name=f"Invalid Step {step_index}"), warnings

    name = str(raw_step.get("name")) if raw_step.get("name") is not None else None
    step_id = str(raw_step.get("id")) if raw_step.get("id") is not None else None
    uses = str(raw_step.get("uses")).strip() if raw_step.get("uses") is not None else None
    run = str(raw_step.get("run")) if raw_step.get("run") is not None else None
    shell = str(raw_step.get("shell")) if raw_step.get("shell") is not None else None
    if_cond = str(raw_step.get("if")) if raw_step.get("if") is not None else None

    # Normalize env variables
    env_dict: Dict[str, str] = {}
    raw_env = raw_step.get("env")
    if isinstance(raw_env, dict):
        for ek, ev in raw_env.items():
            env_dict[str(ek)] = str(ev)

    # Normalize with args
    with_dict: Dict[str, Any] = {}
    raw_with = raw_step.get("with")
    if isinstance(raw_with, dict):
        with_dict = raw_with

    # Extract secrets from env, with, run, if
    secrets: Set[str] = set()
    secrets.update(extract_secrets_from_value(raw_step))

    action_ref = parse_action_reference(uses) if uses else None

    return ParsedStep(
        name=name,
        id=step_id,
        uses=uses,
        action_ref=action_ref,
        run=run,
        shell=shell,
        if_condition=if_cond,
        env=env_dict,
        with_args=with_dict,
        secrets_referenced=sorted(list(secrets)),
        is_run_command=bool(run),
        is_action=bool(uses),
    ), warnings


def parse_job(job_id: str, raw_job: Any) -> Tuple[Optional[ParsedJob], List[str]]:
    """Parse a single job structure from the workflow."""
    warnings: List[str] = []

    if not isinstance(raw_job, dict):
        warnings.append(f"Job '{job_id}' is not a dictionary; skipped.")
        return None, warnings

    name = str(raw_job.get("name")) if raw_job.get("name") is not None else None

    # runs-on: can be string or list
    runs_on_raw = raw_job.get("runs-on")
    runs_on: List[str] = []
    if isinstance(runs_on_raw, str):
        runs_on = [runs_on_raw]
    elif isinstance(runs_on_raw, list):
        runs_on = [str(item) for item in runs_on_raw]
    elif runs_on_raw is not None:
        runs_on = [str(runs_on_raw)]

    # needs: can be string or list
    needs_raw = raw_job.get("needs")
    needs: List[str] = []
    if isinstance(needs_raw, str):
        needs = [needs_raw]
    elif isinstance(needs_raw, list):
        needs = [str(item) for item in needs_raw]

    # permissions
    permissions = raw_job.get("permissions")

    # environment
    environment = raw_job.get("environment")

    # timeout-minutes
    timeout = raw_job.get("timeout-minutes")
    timeout_minutes: Optional[int] = None
    if isinstance(timeout, int):
        timeout_minutes = timeout
    elif isinstance(timeout, str) and timeout.isdigit():
        timeout_minutes = int(timeout)

    continue_on_error = raw_job.get("continue-on-error") if isinstance(raw_job.get("continue-on-error"), bool) else None
    strategy = raw_job.get("strategy") if isinstance(raw_job.get("strategy"), dict) else None

    # services
    services_raw = raw_job.get("services")
    services = list(services_raw.keys()) if isinstance(services_raw, dict) else []

    # env
    env_dict: Dict[str, str] = {}
    raw_env = raw_job.get("env")
    if isinstance(raw_env, dict):
        for ek, ev in raw_env.items():
            env_dict[str(ek)] = str(ev)

    # Job-level reusable workflow call
    uses_raw = str(raw_job.get("uses")).strip() if raw_job.get("uses") is not None else None
    reusable_ref = parse_action_reference(uses_raw) if uses_raw else None

    # Steps
    steps_raw = raw_job.get("steps")
    steps: List[ParsedStep] = []
    if isinstance(steps_raw, list):
        for idx, s in enumerate(steps_raw):
            parsed_step, step_warns = parse_step(s, idx)
            steps.append(parsed_step)
            warnings.extend(step_warns)
    elif not uses_raw:
        warnings.append(f"Job '{job_id}' contains no steps or reusable workflow call.")

    # Secrets referenced across this job
    job_secrets: Set[str] = set()
    job_secrets.update(extract_secrets_from_value(raw_job))

    return ParsedJob(
        job_id=job_id,
        name=name,
        runs_on=runs_on,
        needs=needs,
        permissions=permissions,
        environment=environment,
        timeout_minutes=timeout_minutes,
        continue_on_error=continue_on_error,
        strategy=strategy,
        services=services,
        env=env_dict,
        steps=steps,
        uses=uses_raw,
        reusable_ref=reusable_ref,
        secrets_referenced=sorted(list(job_secrets)),
    ), warnings


def parse_workflow(content: Union[str, bytes]) -> ParsedWorkflow:
    """High-level entrypoint to safely parse and validate a GitHub Actions workflow.

    Returns a comprehensive ParsedWorkflow object ready for structural comparison
    and feature extraction.
    """
    raw_dict = safe_load_yaml(content)
    warnings: List[str] = []

    # Workflow name
    name = str(raw_dict.get("name")) if raw_dict.get("name") is not None else None

    # Triggers ('on')
    on_raw = raw_dict.get("on")
    triggers: List[str] = []
    trigger_details: Dict[str, Any] = {}

    if isinstance(on_raw, str):
        triggers = [on_raw]
    elif isinstance(on_raw, list):
        triggers = [str(item) for item in on_raw]
    elif isinstance(on_raw, dict):
        triggers = [str(k) for k in on_raw.keys()]
        trigger_details = on_raw
    elif on_raw is None:
        warnings.append("Workflow has no triggers ('on') defined.")
    else:
        triggers = [str(on_raw)]

    # Top-level permissions
    permissions = raw_dict.get("permissions")

    # Top-level env
    top_env: Dict[str, str] = {}
    if isinstance(raw_dict.get("env"), dict):
        for ek, ev in raw_dict["env"].items():
            top_env[str(ek)] = str(ev)

    concurrency = raw_dict.get("concurrency")

    # Parse jobs
    jobs_raw = raw_dict.get("jobs")
    parsed_jobs: Dict[str, ParsedJob] = {}

    if not isinstance(jobs_raw, dict):
        warnings.append("Workflow has no valid 'jobs' mapping defined.")
    else:
        for j_id, j_data in jobs_raw.items():
            parsed_j, j_warns = parse_job(str(j_id), j_data)
            warnings.extend(j_warns)
            if parsed_j:
                parsed_jobs[str(j_id)] = parsed_j

    # Compute global workflow aggregates
    total_jobs = len(parsed_jobs)
    total_steps = sum(len(j.steps) for j in parsed_jobs.values())

    # Collect all actions and secrets
    all_secrets: Set[str] = set()
    all_secrets.update(extract_secrets_from_value(raw_dict))

    all_actions: List[ActionReference] = []
    for j in parsed_jobs.values():
        if j.reusable_ref:
            all_actions.append(j.reusable_ref)
        for s in j.steps:
            if s.action_ref:
                all_actions.append(s.action_ref)

    # Check for unknown top-level keys
    for k in raw_dict.keys():
        if k not in KNOWN_TOP_LEVEL_KEYS:
            warnings.append(f"Unrecognized top-level workflow key: '{k}'")

    raw_yaml_str = content if isinstance(content, str) else content.decode("utf-8", errors="replace")

    return ParsedWorkflow(
        name=name,
        triggers=triggers,
        trigger_details=trigger_details,
        permissions=permissions,
        env=top_env,
        concurrency=concurrency,
        jobs=parsed_jobs,
        total_jobs=total_jobs,
        total_steps=total_steps,
        all_secrets_referenced=sorted(list(all_secrets)),
        all_action_references=all_actions,
        warnings=warnings,
        raw_dict=raw_dict,
    )


def parse_workflow_string(content: Union[str, bytes], filename: Optional[str] = None) -> ParsedWorkflow:
    """Parse workflow from string or bytes with optional filename attribution."""
    wf = parse_workflow(content)
    if filename and not wf.name:
        wf.name = filename
    return wf


def parse_workflow_file(file_path: Union[str, Any]) -> ParsedWorkflow:
    """Parse workflow directly from a filesystem path."""
    from pathlib import Path
    p = Path(file_path)
    with open(p, "r", encoding="utf-8") as f:
        return parse_workflow_string(f.read(), filename=p.name)

