"""Structural Feature Extractor for GitHub Actions Workflows.

Transforms ParsedWorkflow instances into standardized numerical feature vectors
and provides structural diffing against baseline workflows.
"""

import re
from typing import Any, Dict, List, Set, Union
import numpy as np
import pandas as pd

from backend.app.parser.models import ParsedJob, ParsedStep, ParsedWorkflow
from backend.app.features.schema import (
    FEATURE_DEFINITIONS,
    FEATURE_NAMES,
    FEATURE_SCHEMA_VERSION,
)

GITHUB_HOSTED_RUNNER_PREFIXES = (
    "ubuntu-", "windows-", "macos-", "hosted-"
)
NETWORK_FETCH_REGEX = re.compile(r"\b(curl|wget|fetch|Invoke-WebRequest|Invoke-RestMethod)\b", re.IGNORECASE)


def _check_broad_permissions(perms: Any) -> bool:
    """Check if permissions object grants broad write access (e.g., 'write-all')."""
    if perms is None:
        return False
    if isinstance(perms, str):
        p_str = perms.strip().lower()
        return "write-all" in p_str or p_str == "write"
    if isinstance(perms, dict):
        # If all or most scopes are write, or an explicit write-all key is set
        write_count = sum(1 for v in perms.values() if str(v).lower() == "write")
        return "write-all" in perms or write_count >= 5
    return False


def _check_permission_scope(perms: Any, target_scope: str) -> bool:
    """Check if a specific permission scope (e.g., 'id-token', 'contents') is granted write access."""
    if perms is None:
        return False
    if isinstance(perms, str) and perms.strip().lower() in ("write-all", "write"):
        return True
    if isinstance(perms, dict):
        val = perms.get(target_scope)
        if val and str(val).lower() == "write":
            return True
        if perms.get("write-all"):
            return True
    return False


def _count_explicit_permissions(perms: Any) -> int:
    """Count number of explicit permission entries declared."""
    if perms is None:
        return 0
    if isinstance(perms, str):
        return 1
    if isinstance(perms, dict):
        return len(perms)
    return 0


def _is_github_hosted_runner(runner_str: str) -> bool:
    """Determine if a runner string corresponds to official GitHub-hosted infrastructure."""
    r_lower = runner_str.lower().strip()
    return any(r_lower.startswith(prefix) for prefix in GITHUB_HOSTED_RUNNER_PREFIXES)


def extract_features(workflow: ParsedWorkflow) -> Dict[str, Union[int, float]]:
    """Extract a complete, standardized numerical feature dictionary from a ParsedWorkflow."""
    # 1. Topology
    job_count = workflow.total_jobs
    step_count = workflow.total_steps
    avg_steps_per_job = round(step_count / max(1, job_count), 4)

    steps_per_job = [len(j.steps) for j in workflow.jobs.values()]
    max_steps_per_job = max(steps_per_job) if steps_per_job else 0

    # 2. Triggers
    trigger_count = len(workflow.triggers)
    triggers_set = {t.lower() for t in workflow.triggers}
    has_pull_request_target = 1 if "pull_request_target" in triggers_set else 0
    has_workflow_dispatch = 1 if "workflow_dispatch" in triggers_set else 0
    has_schedule = 1 if "schedule" in triggers_set else 0

    # 3. Permissions
    has_broad_write = 1 if _check_broad_permissions(workflow.permissions) else 0
    has_id_token_write = 1 if _check_permission_scope(workflow.permissions, "id-token") else 0
    has_contents_write = 1 if _check_permission_scope(workflow.permissions, "contents") else 0
    explicit_perms = _count_explicit_permissions(workflow.permissions)
    has_perms_block = 1 if workflow.permissions is not None else 0

    # Check job-level permissions as well
    for job in workflow.jobs.values():
        if job.permissions is not None:
            has_perms_block = 1
            explicit_perms += _count_explicit_permissions(job.permissions)
            if _check_broad_permissions(job.permissions):
                has_broad_write = 1
            if _check_permission_scope(job.permissions, "id-token"):
                has_id_token_write = 1
            if _check_permission_scope(job.permissions, "contents"):
                has_contents_write = 1

    # 4. Runners
    all_runners: List[str] = []
    has_self_hosted = 0
    github_hosted_jobs = 0

    for job in workflow.jobs.values():
        job_is_gh_hosted = False
        for r in job.runs_on:
            all_runners.append(r)
            r_low = r.lower()
            if "self-hosted" in r_low or "private" in r_low:
                has_self_hosted = 1
            if _is_github_hosted_runner(r):
                job_is_gh_hosted = True
        if job_is_gh_hosted:
            github_hosted_jobs += 1

    runner_types_count = len(set(all_runners))
    github_hosted_ratio = round(github_hosted_jobs / max(1, job_count), 4)

    # 5. Dependencies
    total_dependencies = sum(len(j.needs) for j in workflow.jobs.values())
    jobs_with_needs = sum(1 for j in workflow.jobs.values() if j.needs)

    # 6. Supply Chain & Action Pinning
    total_actions = len(workflow.all_action_references)
    pinned_actions = sum(1 for a in workflow.all_action_references if a.is_pinned_sha)
    unpinned_actions = sum(1 for a in workflow.all_action_references if not a.is_pinned_sha)
    unpinned_ratio = round(unpinned_actions / max(1, total_actions), 4)
    third_party_actions = sum(1 for a in workflow.all_action_references if not a.is_official and a.kind == "github_action")

    # 7. Execution & Shell Commands
    shell_steps = 0
    has_curl_wget = 0

    for job in workflow.jobs.values():
        for step in job.steps:
            if step.is_run_command and step.run:
                shell_steps += 1
                if NETWORK_FETCH_REGEX.search(step.run):
                    has_curl_wget = 1

    shell_step_ratio = round(shell_steps / max(1, step_count), 4)

    # 8. Environment, Secrets & Reusables
    secrets_count = len(workflow.all_secrets_referenced)
    has_secrets = 1 if secrets_count > 0 else 0
    env_count = sum(1 for j in workflow.jobs.values() if j.environment is not None)
    reusable_count = sum(1 for a in workflow.all_action_references if a.kind == "reusable_workflow")

    features = {
        "job_count": job_count,
        "step_count": step_count,
        "avg_steps_per_job": avg_steps_per_job,
        "max_steps_per_job": max_steps_per_job,
        "trigger_count": trigger_count,
        "has_pull_request_target": has_pull_request_target,
        "has_workflow_dispatch": has_workflow_dispatch,
        "has_schedule": has_schedule,
        "has_broad_write_permissions": has_broad_write,
        "has_id_token_write": has_id_token_write,
        "has_contents_write": has_contents_write,
        "explicit_permission_count": explicit_perms,
        "has_permissions_block": has_perms_block,
        "has_self_hosted_runner": has_self_hosted,
        "runner_types_count": runner_types_count,
        "github_hosted_ratio": github_hosted_ratio,
        "total_dependencies_count": total_dependencies,
        "jobs_with_needs_count": jobs_with_needs,
        "total_actions_count": total_actions,
        "pinned_actions_count": pinned_actions,
        "unpinned_actions_count": unpinned_actions,
        "unpinned_actions_ratio": unpinned_ratio,
        "third_party_actions_count": third_party_actions,
        "shell_step_count": shell_steps,
        "shell_step_ratio": shell_step_ratio,
        "has_curl_or_wget_step": has_curl_wget,
        "secrets_referenced_count": secrets_count,
        "has_secret_references": has_secrets,
        "environment_count": env_count,
        "reusable_workflow_count": reusable_count,
    }

    # Ensure all defined features exist and return in exact schema order
    return {k: features.get(k, FEATURE_DEFINITIONS[k]["default"]) for k in FEATURE_NAMES}


def extract_feature_vector(workflow: ParsedWorkflow) -> List[float]:
    """Extract an ordered numerical float vector ready for ML model consumption."""
    features_dict = extract_features(workflow)
    return [float(features_dict[name]) for name in FEATURE_NAMES]


def extract_features_dataframe(workflows: List[ParsedWorkflow]) -> pd.DataFrame:
    """Convert multiple ParsedWorkflow instances into a tabular Pandas DataFrame."""
    records = [extract_features(w) for w in workflows]
    df = pd.DataFrame(records, columns=FEATURE_NAMES)
    return df


def extract_workflow_diff(
    current_wf: ParsedWorkflow, baseline_wf: ParsedWorkflow
) -> Dict[str, Any]:
    """Perform structural comparative diffing between current workflow and a baseline.

    Uses the comprehensive comparator engine to extract categorized AST differences,
    metrics, and security review findings.
    """
    from backend.app.comparator.engine import compare_workflows

    comp = compare_workflows(baseline=baseline_wf, modified=current_wf)

    findings = [
        {
            "category": d.category.value,
            "severity": d.severity.value,
            "description": d.description,
            "location": d.location,
        }
        for d in comp.differences
    ]

    added_jobs = [
        d.location.replace("jobs.", "")
        for d in comp.differences
        if d.category.value == "job_addition"
    ]
    removed_jobs = [
        d.location.replace("jobs.", "")
        for d in comp.differences
        if d.category.value == "job_removal"
    ]
    added_triggers = [
        d.location.replace("on.", "")
        for d in comp.differences
        if d.category.value == "trigger_change" and d.baseline_value is None
    ]
    removed_triggers = [
        d.location.replace("on.", "")
        for d in comp.differences
        if d.category.value == "trigger_change" and d.modified_value is None
    ]

    diff_metrics = {
        "diff_jobs": int(current_wf.total_jobs - baseline_wf.total_jobs),
        "diff_steps": int(current_wf.total_steps - baseline_wf.total_steps),
        "diff_triggers": comp.summary.triggers_changed,
        "diff_unpinned_actions": comp.summary.actions_changed,
        "diff_secrets": sum(1 for d in comp.differences if "secret" in d.location),
        "has_permission_escalation": int(comp.summary.permissions_changed > 0),
        "has_runner_change": int(comp.summary.runners_changed > 0),
    }

    return {
        "schema_version": FEATURE_SCHEMA_VERSION,
        "summary": comp.summary.model_dump(),
        "diff_metrics": diff_metrics,
        "added_jobs": sorted(added_jobs),
        "removed_jobs": sorted(removed_jobs),
        "added_triggers": sorted(added_triggers),
        "removed_triggers": sorted(removed_triggers),
        "findings": findings,
        "differences": [d.model_dump() for d in comp.differences],
    }
