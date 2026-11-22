"""Structural Comparison Engine for GitHub Actions Workflows.

Compares two parsed workflow models (or raw YAML contents) and produces
a rich, categorized AST-level diff highlighting changes in topology,
permissions, runners, dependencies, actions, triggers, steps, and environments.
"""

from datetime import datetime
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from backend.app.comparator.models import (
    ChangeCategory,
    ChangeSeverity,
    ComparisonResult,
    ComparisonSummary,
    StructuralDifference,
)
from backend.app.parser import (
    ActionReference,
    ParsedJob,
    ParsedStep,
    ParsedWorkflow,
    parse_workflow,
)

NETWORK_FETCH_REGEX = re.compile(r"\b(curl|wget|fetch|Invoke-WebRequest|Invoke-RestMethod)\b", re.IGNORECASE)
PIPE_TO_SHELL_REGEX = re.compile(r"\|\s*(bash|sh|zsh|pwsh|powershell|cmd)\b", re.IGNORECASE)


def _format_value_for_diff(val: Any) -> Any:
    """Format complex objects into serializable values for baseline/modified fields."""
    if val is None:
        return None
    if isinstance(val, (str, int, float, bool, list)):
        return val
    if isinstance(val, dict):
        return {str(k): _format_value_for_diff(v) for k, v in val.items()}
    if hasattr(val, "model_dump"):
        return val.model_dump()
    return str(val)


def _compare_triggers(
    base_triggers: List[str],
    mod_triggers: List[str],
    base_details: Dict[str, Any],
    mod_details: Dict[str, Any],
) -> List[StructuralDifference]:
    """Identify added, removed, or modified workflow triggers."""
    diffs: List[StructuralDifference] = []
    base_set = set(base_triggers)
    mod_set = set(mod_triggers)

    added = mod_set - base_set
    removed = base_set - mod_set

    for trig in sorted(added):
        if trig.lower() == "pull_request_target":
            diffs.append(StructuralDifference(
                category=ChangeCategory.TRIGGER_CHANGE,
                location=f"on.{trig}",
                baseline_value=None,
                modified_value=trig,
                description=(
                    "Added 'pull_request_target' trigger. This trigger executes in the context of the base branch "
                    "with repository write secrets; checking out untrusted pull request code introduces PwnRequest supply chain risk."
                ),
                severity=ChangeSeverity.HIGH,
                requires_human_review=True,
            ))
        elif trig.lower() == "workflow_dispatch":
            diffs.append(StructuralDifference(
                category=ChangeCategory.TRIGGER_CHANGE,
                location=f"on.{trig}",
                baseline_value=None,
                modified_value=_format_value_for_diff(mod_details.get(trig, {})),
                description="Added manual 'workflow_dispatch' trigger allowing on-demand workflow runs.",
                severity=ChangeSeverity.LOW,
                requires_human_review=False,
            ))
        elif trig.lower() == "schedule":
            diffs.append(StructuralDifference(
                category=ChangeCategory.TRIGGER_CHANGE,
                location=f"on.{trig}",
                baseline_value=None,
                modified_value=_format_value_for_diff(mod_details.get(trig, [])),
                description="Added scheduled cron trigger. Recurring automated execution introduced.",
                severity=ChangeSeverity.LOW,
                requires_human_review=True,
            ))
        else:
            diffs.append(StructuralDifference(
                category=ChangeCategory.TRIGGER_CHANGE,
                location=f"on.{trig}",
                baseline_value=None,
                modified_value=trig,
                description=f"Added workflow trigger event '{trig}'.",
                severity=ChangeSeverity.LOW,
                requires_human_review=True,
            ))

    for trig in sorted(removed):
        diffs.append(StructuralDifference(
            category=ChangeCategory.TRIGGER_CHANGE,
            location=f"on.{trig}",
            baseline_value=trig,
            modified_value=None,
            description=f"Removed workflow trigger event '{trig}'. Workflow will no longer execute on this event.",
            severity=ChangeSeverity.MEDIUM if trig in ("push", "pull_request") else ChangeSeverity.LOW,
            requires_human_review=True,
        ))

    return diffs


def _compare_permissions(
    base_perms: Optional[Union[Dict[str, str], str]],
    mod_perms: Optional[Union[Dict[str, str], str]],
    location_prefix: str,
) -> List[StructuralDifference]:
    """Identify added, removed, or escalated permission scopes."""
    diffs: List[StructuralDifference] = []

    if base_perms == mod_perms:
        return diffs

    # Broad write detection
    def is_broad(p: Any) -> bool:
        if isinstance(p, str):
            return "write-all" in p.lower() or p.lower() == "write"
        if isinstance(p, dict):
            return "write-all" in p or sum(1 for v in p.values() if str(v).lower() == "write") >= 5
        return False

    base_is_broad = is_broad(base_perms)
    mod_is_broad = is_broad(mod_perms)

    if not base_is_broad and mod_is_broad:
        diffs.append(StructuralDifference(
            category=ChangeCategory.PERMISSION_CHANGE,
            location=f"{location_prefix}.permissions",
            baseline_value=_format_value_for_diff(base_perms),
            modified_value=_format_value_for_diff(mod_perms),
            description="Permissions escalated to broad write ('write-all'). Violates the principle of least privilege.",
            severity=ChangeSeverity.HIGH,
            requires_human_review=True,
        ))
        return diffs

    # Granular scope comparisons
    base_dict = base_perms if isinstance(base_perms, dict) else {}
    mod_dict = mod_perms if isinstance(mod_perms, dict) else {}

    all_scopes = set(base_dict.keys()) | set(mod_dict.keys())

    for scope in sorted(all_scopes):
        b_val = str(base_dict.get(scope, "")).lower()
        m_val = str(mod_dict.get(scope, "")).lower()

        if b_val != m_val:
            # Check for escalation to write
            if m_val == "write" and b_val != "write":
                sev = ChangeSeverity.HIGH if scope == "id-token" else ChangeSeverity.MEDIUM
                desc = (
                    f"Permission '{scope}' elevated to 'write'. "
                    f"{'Allows OpenID Connect (OIDC) cloud credential minting.' if scope == 'id-token' else 'Grants resource write privileges.'}"
                )
                diffs.append(StructuralDifference(
                    category=ChangeCategory.PERMISSION_CHANGE,
                    location=f"{location_prefix}.permissions.{scope}",
                    baseline_value=b_val or None,
                    modified_value=m_val,
                    description=desc,
                    severity=sev,
                    requires_human_review=True,
                ))
            elif b_val == "write" and m_val != "write":
                diffs.append(StructuralDifference(
                    category=ChangeCategory.PERMISSION_CHANGE,
                    location=f"{location_prefix}.permissions.{scope}",
                    baseline_value=b_val,
                    modified_value=m_val or None,
                    description=f"Permission '{scope}' reduced from 'write' to '{m_val or 'none'}'. Hardened privilege scope.",
                    severity=ChangeSeverity.INFO,
                    requires_human_review=False,
                ))
            elif m_val:
                diffs.append(StructuralDifference(
                    category=ChangeCategory.PERMISSION_CHANGE,
                    location=f"{location_prefix}.permissions.{scope}",
                    baseline_value=b_val or None,
                    modified_value=m_val,
                    description=f"Permission '{scope}' set to '{m_val}'.",
                    severity=ChangeSeverity.LOW,
                    requires_human_review=False,
                ))

    return diffs


def _compare_runners(
    job_id: str,
    base_runners: List[str],
    mod_runners: List[str],
) -> List[StructuralDifference]:
    """Detect changes in runner configuration (e.g. GitHub-hosted to self-hosted)."""
    diffs: List[StructuralDifference] = []
    if base_runners == mod_runners:
        return diffs

    base_self = any("self-hosted" in r.lower() or "private" in r.lower() for r in base_runners)
    mod_self = any("self-hosted" in r.lower() or "private" in r.lower() for r in mod_runners)

    if not base_self and mod_self:
        diffs.append(StructuralDifference(
            category=ChangeCategory.RUNNER_CHANGE,
            location=f"jobs.{job_id}.runs-on",
            baseline_value=base_runners,
            modified_value=mod_runners,
            description="Runner changed from GitHub-hosted to self-hosted private runner pool. Code executes on private host infrastructure.",
            severity=ChangeSeverity.HIGH,
            requires_human_review=True,
        ))
    elif base_self and not mod_self:
        diffs.append(StructuralDifference(
            category=ChangeCategory.RUNNER_CHANGE,
            location=f"jobs.{job_id}.runs-on",
            baseline_value=base_runners,
            modified_value=mod_runners,
            description="Runner changed from self-hosted to standard GitHub-hosted runner.",
            severity=ChangeSeverity.INFO,
            requires_human_review=False,
        ))
    else:
        diffs.append(StructuralDifference(
            category=ChangeCategory.RUNNER_CHANGE,
            location=f"jobs.{job_id}.runs-on",
            baseline_value=base_runners,
            modified_value=mod_runners,
            description=f"Runner specification modified from {base_runners} to {mod_runners}.",
            severity=ChangeSeverity.LOW,
            requires_human_review=True,
        ))

    return diffs


def _compare_dependencies(
    job_id: str,
    base_needs: List[str],
    mod_needs: List[str],
) -> List[StructuralDifference]:
    """Detect added or removed 'needs' job dependencies."""
    diffs: List[StructuralDifference] = []
    base_set = set(base_needs)
    mod_set = set(mod_needs)

    removed_deps = base_set - mod_set
    added_deps = mod_set - base_set

    for dep in sorted(removed_deps):
        diffs.append(StructuralDifference(
            category=ChangeCategory.DEPENDENCY_CHANGE,
            location=f"jobs.{job_id}.needs",
            baseline_value=dep,
            modified_value=None,
            description=f"Removed dependency requirement on job '{dep}'. Job '{job_id}' will execute without waiting for '{dep}' to succeed.",
            severity=ChangeSeverity.HIGH if any(w in dep.lower() for w in ["test", "lint", "scan", "check"]) else ChangeSeverity.MEDIUM,
            requires_human_review=True,
        ))

    for dep in sorted(added_deps):
        diffs.append(StructuralDifference(
            category=ChangeCategory.DEPENDENCY_CHANGE,
            location=f"jobs.{job_id}.needs",
            baseline_value=None,
            modified_value=dep,
            description=f"Added dependency requirement on job '{dep}'.",
            severity=ChangeSeverity.INFO,
            requires_human_review=False,
        ))

    return diffs


def _compare_steps(
    job_id: str,
    base_steps: List[ParsedStep],
    mod_steps: List[ParsedStep],
) -> List[StructuralDifference]:
    """Compare step lists within a matching job, matching by ID or name where feasible."""
    diffs: List[StructuralDifference] = []

    # Map steps by identifier (id -> name -> position)
    base_map: Dict[str, Tuple[int, ParsedStep]] = {}
    for idx, s in enumerate(base_steps):
        key = s.id or s.name or f"step_index_{idx}"
        base_map[key] = (idx, s)

    mod_map: Dict[str, Tuple[int, ParsedStep]] = {}
    for idx, s in enumerate(mod_steps):
        key = s.id or s.name or f"step_index_{idx}"
        mod_map[key] = (idx, s)

    base_keys = set(base_map.keys())
    mod_keys = set(mod_map.keys())

    # 1. Added steps
    added_keys = mod_keys - base_keys
    for k in sorted(added_keys):
        idx, step = mod_map[k]
        loc = f"jobs.{job_id}.steps[{idx}]"

        # Check for dangerous patterns in added step
        sev = ChangeSeverity.LOW
        desc_parts = [f"Added step '{step.name or step.id or f'#{idx}'}'"]

        if step.is_run_command and step.run:
            if NETWORK_FETCH_REGEX.search(step.run) and PIPE_TO_SHELL_REGEX.search(step.run):
                sev = ChangeSeverity.HIGH
                desc_parts.append("executes unverified remote script via shell piping ('curl | bash')")
            elif NETWORK_FETCH_REGEX.search(step.run):
                sev = ChangeSeverity.HIGH
                desc_parts.append("executes network download command (curl/wget)")
            else:
                desc_parts.append("executes shell command")

        if step.is_action and step.uses:
            desc_parts.append(f"invokes external action '{step.uses}'")
            if step.action_ref and not step.action_ref.is_pinned_sha and not step.action_ref.is_official:
                sev = ChangeSeverity.HIGH
                desc_parts.append("(unpinned third-party action)")

        if step.secrets_referenced:
            sev = max(sev, ChangeSeverity.MEDIUM, key=lambda s: list(ChangeSeverity).index(s))
            desc_parts.append(f"references secrets: {', '.join(step.secrets_referenced)}")

        diffs.append(StructuralDifference(
            category=ChangeCategory.STEP_ADDITION,
            location=loc,
            baseline_value=None,
            modified_value=_format_value_for_diff(step.model_dump()),
            description=". ".join(desc_parts) + ".",
            severity=sev,
            requires_human_review=sev in (ChangeSeverity.CRITICAL, ChangeSeverity.HIGH, ChangeSeverity.MEDIUM),
        ))

    # 2. Removed steps
    removed_keys = base_keys - mod_keys
    for k in sorted(removed_keys):
        idx, step = base_map[k]
        loc = f"jobs.{job_id}.steps[{idx}]"
        sev = ChangeSeverity.MEDIUM if any(w in (step.name or "").lower() for w in ["test", "lint", "scan", "check"]) else ChangeSeverity.LOW
        diffs.append(StructuralDifference(
            category=ChangeCategory.STEP_REMOVAL,
            location=loc,
            baseline_value=_format_value_for_diff(step.model_dump()),
            modified_value=None,
            description=f"Removed step '{step.name or step.id or f'#{idx}'}'.",
            severity=sev,
            requires_human_review=True,
        ))

    # 3. Modified matching steps
    matching_keys = base_keys & mod_keys
    for k in sorted(matching_keys):
        b_idx, b_step = base_map[k]
        m_idx, m_step = mod_map[k]
        loc = f"jobs.{job_id}.steps[{m_idx}]"

        # Action reference changed
        if b_step.uses != m_step.uses:
            sev = ChangeSeverity.LOW
            desc = f"Action reference modified from '{b_step.uses}' to '{m_step.uses}'."
            # Check pinning degradation
            if b_step.action_ref and b_step.action_ref.is_pinned_sha:
                if m_step.action_ref and not m_step.action_ref.is_pinned_sha:
                    sev = ChangeSeverity.MEDIUM
                    desc = f"Action pinning degraded: '{b_step.uses}' (SHA pinned) replaced by '{m_step.uses}' (floating tag)."

            if m_step.action_ref and not m_step.action_ref.is_official and not m_step.action_ref.is_pinned_sha:
                sev = ChangeSeverity.HIGH
                desc = f"Action swapped to unpinned third-party action: '{m_step.uses}'."

            diffs.append(StructuralDifference(
                category=ChangeCategory.ACTION_CHANGE,
                location=f"{loc}.uses",
                baseline_value=b_step.uses,
                modified_value=m_step.uses,
                description=desc,
                severity=sev,
                requires_human_review=True,
            ))

        # Run command modified
        if b_step.run != m_step.run:
            sev = ChangeSeverity.LOW
            desc = "Inline shell command script modified."
            if m_step.run and NETWORK_FETCH_REGEX.search(m_step.run) and not (b_step.run and NETWORK_FETCH_REGEX.search(b_step.run)):
                sev = ChangeSeverity.HIGH
                desc = "Shell step modified to include network fetch command (curl/wget)."

            diffs.append(StructuralDifference(
                category=ChangeCategory.STEP_MODIFICATION,
                location=f"{loc}.run",
                baseline_value=b_step.run,
                modified_value=m_step.run,
                description=desc,
                severity=sev,
                requires_human_review=sev == ChangeSeverity.HIGH,
            ))

        # Secrets references added to step
        b_sec = set(b_step.secrets_referenced)
        m_sec = set(m_step.secrets_referenced)
        added_sec = m_sec - b_sec
        if added_sec:
            diffs.append(StructuralDifference(
                category=ChangeCategory.STEP_MODIFICATION,
                location=f"{loc}.secrets",
                baseline_value=sorted(list(b_sec)),
                modified_value=sorted(list(m_sec)),
                description=f"Newly introduced secret reference(s) into step: {', '.join(sorted(added_sec))}.",
                severity=ChangeSeverity.MEDIUM,
                requires_human_review=True,
            ))

    return diffs


def compare_workflows(
    baseline: Union[str, bytes, ParsedWorkflow],
    modified: Union[str, bytes, ParsedWorkflow],
) -> ComparisonResult:
    """Perform comprehensive structural AST comparison between baseline and modified workflows.

    Identifies differences across topology, jobs, steps, runners, permissions,
    dependencies, external actions, triggers, and deployment environments.
    """
    base_wf = baseline if isinstance(baseline, ParsedWorkflow) else parse_workflow(baseline)
    mod_wf = modified if isinstance(modified, ParsedWorkflow) else parse_workflow(modified)

    differences: List[StructuralDifference] = []

    # 1. Triggers comparison
    trigger_diffs = _compare_triggers(
        base_wf.triggers,
        mod_wf.triggers,
        base_wf.trigger_details,
        mod_wf.trigger_details,
    )
    differences.extend(trigger_diffs)

    # 2. Workflow-level permissions comparison
    top_perm_diffs = _compare_permissions(base_wf.permissions, mod_wf.permissions, "workflow")
    differences.extend(top_perm_diffs)

    # 3. Jobs comparison (additions, removals, and modifications)
    base_job_ids = set(base_wf.jobs.keys())
    mod_job_ids = set(mod_wf.jobs.keys())

    added_jobs = mod_job_ids - base_job_ids
    removed_jobs = base_job_ids - mod_job_ids
    common_jobs = base_job_ids & mod_job_ids

    # Added jobs
    for j_id in sorted(added_jobs):
        job = mod_wf.jobs[j_id]
        sev = ChangeSeverity.MEDIUM
        desc = f"Added new job '{j_id}' (runs-on: {job.runs_on}, steps: {len(job.steps)})."
        # Check if added job uses self-hosted or curl
        if any("self-hosted" in r.lower() for r in job.runs_on):
            sev = ChangeSeverity.HIGH
            desc += " Configured with private self-hosted runner."
        differences.append(StructuralDifference(
            category=ChangeCategory.JOB_ADDITION,
            location=f"jobs.{j_id}",
            baseline_value=None,
            modified_value=_format_value_for_diff(job.model_dump()),
            description=desc,
            severity=sev,
            requires_human_review=True,
        ))

    # Removed jobs
    for j_id in sorted(removed_jobs):
        job = base_wf.jobs[j_id]
        sev = ChangeSeverity.MEDIUM if any(w in j_id.lower() for w in ["test", "lint", "scan", "check"]) else ChangeSeverity.LOW
        differences.append(StructuralDifference(
            category=ChangeCategory.JOB_REMOVAL,
            location=f"jobs.{j_id}",
            baseline_value=_format_value_for_diff(job.model_dump()),
            modified_value=None,
            description=f"Removed job '{j_id}'. Pipeline no longer executes these tasks.",
            severity=sev,
            requires_human_review=True,
        ))

    # Common jobs (detailed internal comparison)
    for j_id in sorted(common_jobs):
        b_job = base_wf.jobs[j_id]
        m_job = mod_wf.jobs[j_id]

        # Job permissions
        job_perm_diffs = _compare_permissions(b_job.permissions, m_job.permissions, f"jobs.{j_id}")
        differences.extend(job_perm_diffs)

        # Runner comparison
        runner_diffs = _compare_runners(j_id, b_job.runs_on, m_job.runs_on)
        differences.extend(runner_diffs)

        # Dependencies comparison
        dep_diffs = _compare_dependencies(j_id, b_job.needs, m_job.needs)
        differences.extend(dep_diffs)

        # Deployment environment comparison
        if b_job.environment != m_job.environment:
            differences.append(StructuralDifference(
                category=ChangeCategory.ENVIRONMENT_CHANGE,
                location=f"jobs.{j_id}.environment",
                baseline_value=_format_value_for_diff(b_job.environment),
                modified_value=_format_value_for_diff(m_job.environment),
                description=f"Deployment environment altered from '{b_job.environment}' to '{m_job.environment}'.",
                severity=ChangeSeverity.MEDIUM if m_job.environment in ("production", "prod") else ChangeSeverity.LOW,
                requires_human_review=True,
            ))

        # Reusable workflow comparison
        if b_job.uses != m_job.uses:
            differences.append(StructuralDifference(
                category=ChangeCategory.REUSABLE_WORKFLOW_CHANGE,
                location=f"jobs.{j_id}.uses",
                baseline_value=b_job.uses,
                modified_value=m_job.uses,
                description=f"Reusable workflow call changed from '{b_job.uses}' to '{m_job.uses}'.",
                severity=ChangeSeverity.HIGH if m_job.uses and not (b_job.uses) else ChangeSeverity.MEDIUM,
                requires_human_review=True,
            ))

        # Job configuration (timeout, continue-on-error)
        if b_job.timeout_minutes != m_job.timeout_minutes:
            differences.append(StructuralDifference(
                category=ChangeCategory.JOB_CONFIGURATION,
                location=f"jobs.{j_id}.timeout-minutes",
                baseline_value=b_job.timeout_minutes,
                modified_value=m_job.timeout_minutes,
                description=f"Execution timeout altered from {b_job.timeout_minutes} to {m_job.timeout_minutes} minutes.",
                severity=ChangeSeverity.INFO,
                requires_human_review=False,
            ))

        if b_job.continue_on_error != m_job.continue_on_error:
            differences.append(StructuralDifference(
                category=ChangeCategory.JOB_CONFIGURATION,
                location=f"jobs.{j_id}.continue-on-error",
                baseline_value=b_job.continue_on_error,
                modified_value=m_job.continue_on_error,
                description=f"Failure handling ('continue-on-error') toggled from {b_job.continue_on_error} to {m_job.continue_on_error}.",
                severity=ChangeSeverity.LOW,
                requires_human_review=True,
            ))

        # Steps comparison
        step_diffs = _compare_steps(j_id, b_job.steps, m_job.steps)
        differences.extend(step_diffs)

    # 4. Synthesize Summary
    summary = ComparisonSummary(
        total_changes=len(differences),
        jobs_added=sum(1 for d in differences if d.category == ChangeCategory.JOB_ADDITION),
        jobs_removed=sum(1 for d in differences if d.category == ChangeCategory.JOB_REMOVAL),
        steps_added=sum(1 for d in differences if d.category == ChangeCategory.STEP_ADDITION),
        steps_removed=sum(1 for d in differences if d.category == ChangeCategory.STEP_REMOVAL),
        steps_modified=sum(1 for d in differences if d.category == ChangeCategory.STEP_MODIFICATION),
        permissions_changed=sum(1 for d in differences if d.category == ChangeCategory.PERMISSION_CHANGE),
        triggers_changed=sum(1 for d in differences if d.category == ChangeCategory.TRIGGER_CHANGE),
        runners_changed=sum(1 for d in differences if d.category == ChangeCategory.RUNNER_CHANGE),
        dependencies_changed=sum(1 for d in differences if d.category == ChangeCategory.DEPENDENCY_CHANGE),
        actions_changed=sum(1 for d in differences if d.category == ChangeCategory.ACTION_CHANGE),
        environments_changed=sum(1 for d in differences if d.category == ChangeCategory.ENVIRONMENT_CHANGE),
        reusable_workflows_changed=sum(1 for d in differences if d.category == ChangeCategory.REUSABLE_WORKFLOW_CHANGE),
        has_critical_or_high_changes=any(d.severity in (ChangeSeverity.CRITICAL, ChangeSeverity.HIGH) for d in differences),
    )

    return ComparisonResult(
        baseline_workflow_name=base_wf.name,
        modified_workflow_name=mod_wf.name,
        summary=summary,
        differences=differences,
        timestamp=datetime.now().isoformat(),
    )
