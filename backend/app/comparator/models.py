"""Data models for structural comparison between GitHub Actions workflows.

Defines schemas for individual structural differences, change categories,
severity levels, and comprehensive comparison summaries.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class ChangeCategory(str, Enum):
    """Categorization of structural workflow modifications."""

    JOB_ADDITION = "job_addition"
    JOB_REMOVAL = "job_removal"
    JOB_CONFIGURATION = "job_configuration"
    STEP_ADDITION = "step_addition"
    STEP_REMOVAL = "step_removal"
    STEP_MODIFICATION = "step_modification"
    PERMISSION_CHANGE = "permission_change"
    TRIGGER_CHANGE = "trigger_change"
    RUNNER_CHANGE = "runner_change"
    DEPENDENCY_CHANGE = "dependency_change"
    ACTION_CHANGE = "action_change"
    ENVIRONMENT_CHANGE = "environment_change"
    REUSABLE_WORKFLOW_CHANGE = "reusable_workflow_change"


class ChangeSeverity(str, Enum):
    """Advisory severity level for human triage (not a verdict of maliciousness)."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class StructuralDifference(BaseModel):
    """Represents a discrete structural difference between baseline and modified workflows."""

    category: ChangeCategory = Field(..., description="Category of the structural change")
    location: str = Field(..., description="Path to change (e.g., 'jobs.build', 'permissions.id-token')")
    baseline_value: Optional[Any] = Field(None, description="Original value in baseline workflow")
    modified_value: Optional[Any] = Field(None, description="New value in modified workflow")
    description: str = Field(..., description="Objective, human-readable explanation of change")
    severity: ChangeSeverity = Field(..., description="Advisory severity level for security/ops triage")
    requires_human_review: bool = Field(True, description="Whether change warrants human review")


class ComparisonSummary(BaseModel):
    """Aggregated numerical metrics summarizing all structural changes."""

    total_changes: int = Field(0, description="Total count of discrete structural differences")
    jobs_added: int = Field(0, description="Number of newly introduced jobs")
    jobs_removed: int = Field(0, description="Number of removed jobs")
    steps_added: int = Field(0, description="Number of newly introduced steps")
    steps_removed: int = Field(0, description="Number of removed steps")
    steps_modified: int = Field(0, description="Number of modified steps")
    permissions_changed: int = Field(0, description="Number of permission modifications")
    triggers_changed: int = Field(0, description="Number of trigger modifications")
    runners_changed: int = Field(0, description="Number of runner configuration changes")
    dependencies_changed: int = Field(0, description="Number of job dependency changes")
    actions_changed: int = Field(0, description="Number of external action changes")
    environments_changed: int = Field(0, description="Number of deployment environment changes")
    reusable_workflows_changed: int = Field(0, description="Number of reusable workflow call changes")
    has_critical_or_high_changes: bool = Field(
        False, description="True if any high or critical severity changes were flagged"
    )


class ComparisonResult(BaseModel):
    """Complete structural comparison output schema for API responses and UI visualization."""

    baseline_workflow_name: Optional[str] = Field(None, description="Name of the baseline workflow")
    modified_workflow_name: Optional[str] = Field(None, description="Name of the modified workflow")
    summary: ComparisonSummary = Field(..., description="Statistical summary of structural differences")
    differences: List[StructuralDifference] = Field(
        default_factory=list, description="Ordered list of discrete structural differences"
    )
    timestamp: str = Field(..., description="ISO 8601 timestamp of analysis")
