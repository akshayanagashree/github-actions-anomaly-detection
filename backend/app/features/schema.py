"""Feature Schema and Versioning Specification for GitHub Actions Anomaly Detection.

Defines the exact feature names, ordering, data types, value domains,
and semantic categories used consistently across training and inference.
"""

from typing import Any, Dict, List

FEATURE_SCHEMA_VERSION = "1.0.0"

FEATURE_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    # 1. Workflow Scale & Topology
    "job_count": {
        "type": "int",
        "category": "topology",
        "description": "Total number of jobs declared in the workflow.",
        "min": 0,
        "default": 0,
    },
    "step_count": {
        "type": "int",
        "category": "topology",
        "description": "Total number of steps declared across all jobs.",
        "min": 0,
        "default": 0,
    },
    "avg_steps_per_job": {
        "type": "float",
        "category": "topology",
        "description": "Average number of steps per job (step_count / max(1, job_count)).",
        "min": 0.0,
        "default": 0.0,
    },
    "max_steps_per_job": {
        "type": "int",
        "category": "topology",
        "description": "Maximum number of steps in any individual job.",
        "min": 0,
        "default": 0,
    },

    # 2. Trigger Characteristics
    "trigger_count": {
        "type": "int",
        "category": "triggers",
        "description": "Number of distinct workflow triggers defined under 'on'.",
        "min": 0,
        "default": 0,
    },
    "has_pull_request_target": {
        "type": "int",
        "category": "triggers",
        "description": "Binary flag (1 if pull_request_target trigger is configured, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "has_workflow_dispatch": {
        "type": "int",
        "category": "triggers",
        "description": "Binary flag (1 if manual workflow_dispatch trigger is configured, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "has_schedule": {
        "type": "int",
        "category": "triggers",
        "description": "Binary flag (1 if scheduled cron trigger is configured, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },

    # 3. Privilege & Permission Scopes
    "has_broad_write_permissions": {
        "type": "int",
        "category": "permissions",
        "description": "Binary flag (1 if 'write-all' or equivalent broad write scope is set, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "has_id_token_write": {
        "type": "int",
        "category": "permissions",
        "description": "Binary flag (1 if OIDC token minting 'id-token: write' is requested, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "has_contents_write": {
        "type": "int",
        "category": "permissions",
        "description": "Binary flag (1 if repository write 'contents: write' is requested, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "explicit_permission_count": {
        "type": "int",
        "category": "permissions",
        "description": "Total count of individual permission entries explicitly declared.",
        "min": 0,
        "default": 0,
    },
    "has_permissions_block": {
        "type": "int",
        "category": "permissions",
        "description": "Binary flag (1 if top-level or job permissions block is defined, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },

    # 4. Runner Architecture
    "has_self_hosted_runner": {
        "type": "int",
        "category": "runners",
        "description": "Binary flag (1 if any job runs on self-hosted or private runner pool, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "runner_types_count": {
        "type": "int",
        "category": "runners",
        "description": "Number of distinct runner specification strings across all jobs.",
        "min": 0,
        "default": 0,
    },
    "github_hosted_ratio": {
        "type": "float",
        "category": "runners",
        "description": "Proportion of jobs executing on standard GitHub-hosted virtual environments [0.0 - 1.0].",
        "min": 0.0,
        "max": 1.0,
        "default": 1.0,
    },

    # 5. Job Dependencies
    "total_dependencies_count": {
        "type": "int",
        "category": "dependencies",
        "description": "Total sum of 'needs' edges between jobs across the workflow graph.",
        "min": 0,
        "default": 0,
    },
    "jobs_with_needs_count": {
        "type": "int",
        "category": "dependencies",
        "description": "Number of jobs that declare at least one 'needs' dependency.",
        "min": 0,
        "default": 0,
    },

    # 6. Supply Chain & Action Pinning
    "total_actions_count": {
        "type": "int",
        "category": "supply_chain",
        "description": "Total external actions referenced via 'uses:' across all jobs.",
        "min": 0,
        "default": 0,
    },
    "pinned_actions_count": {
        "type": "int",
        "category": "supply_chain",
        "description": "Number of actions pinned to an immutable 40-character commit SHA.",
        "min": 0,
        "default": 0,
    },
    "unpinned_actions_count": {
        "type": "int",
        "category": "supply_chain",
        "description": "Number of actions using floating branch or major version tags (e.g., @v4, @main).",
        "min": 0,
        "default": 0,
    },
    "unpinned_actions_ratio": {
        "type": "float",
        "category": "supply_chain",
        "description": "Proportion of external actions that are unpinned [0.0 - 1.0].",
        "min": 0.0,
        "max": 1.0,
        "default": 0.0,
    },
    "third_party_actions_count": {
        "type": "int",
        "category": "supply_chain",
        "description": "Number of actions created by organizations other than 'actions' or 'github'.",
        "min": 0,
        "default": 0,
    },

    # 7. Scripting & Shell Commands
    "shell_step_count": {
        "type": "int",
        "category": "execution",
        "description": "Number of steps executing inline shell scripts via 'run:'.",
        "min": 0,
        "default": 0,
    },
    "shell_step_ratio": {
        "type": "float",
        "category": "execution",
        "description": "Proportion of steps that execute shell commands (shell_steps / max(1, step_count)).",
        "min": 0.0,
        "max": 1.0,
        "default": 0.0,
    },
    "has_curl_or_wget_step": {
        "type": "int",
        "category": "execution",
        "description": "Binary flag (1 if any shell step invokes 'curl' or 'wget' network downloads, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },

    # 8. Environment, Secrets & Reusable Workflows
    "secrets_referenced_count": {
        "type": "int",
        "category": "secrets_environment",
        "description": "Number of distinct secret variables referenced across the entire workflow.",
        "min": 0,
        "default": 0,
    },
    "has_secret_references": {
        "type": "int",
        "category": "secrets_environment",
        "description": "Binary flag (1 if any 'secrets.*' expression is referenced, else 0).",
        "min": 0,
        "max": 1,
        "default": 0,
    },
    "environment_count": {
        "type": "int",
        "category": "secrets_environment",
        "description": "Number of jobs specifying an explicit deployment 'environment:'.",
        "min": 0,
        "default": 0,
    },
    "reusable_workflow_count": {
        "type": "int",
        "category": "secrets_environment",
        "description": "Number of reusable workflow calls invoked via 'uses:'.",
        "min": 0,
        "default": 0,
    },
}

# Immutable ordered list of feature column names
FEATURE_NAMES: List[str] = list(FEATURE_DEFINITIONS.keys())
TOTAL_FEATURES_COUNT: int = len(FEATURE_NAMES)
