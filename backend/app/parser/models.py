"""Data models representing parsed GitHub Actions workflow structures.

Defines Pydantic models for steps, jobs, workflow-level configurations,
action references, and custom parsing exceptions.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class ActionReference(BaseModel):
    """Structured representation of an external action or reusable workflow reference ('uses')."""

    raw: str = Field(..., description="Raw string from uses: field")
    kind: str = Field(
        ...,
        description="Type of reference: 'github_action', 'reusable_workflow', 'docker', 'local', or 'unknown'"
    )
    owner: Optional[str] = Field(None, description="GitHub user/organization if applicable")
    repo: Optional[str] = Field(None, description="Repository name if applicable")
    path: Optional[str] = Field(None, description="Subdirectory or file path within repository")
    ref: Optional[str] = Field(None, description="Git branch, tag, or commit SHA")
    is_pinned_sha: bool = Field(False, description="Whether ref is a 40-character hexadecimal commit SHA")
    is_official: bool = Field(False, description="Whether action is maintained by actions/ or github/")


class ParsedStep(BaseModel):
    """Structured representation of an individual job step."""

    name: Optional[str] = Field(None, description="Step name")
    id: Optional[str] = Field(None, description="Step ID")
    uses: Optional[str] = Field(None, description="Action or reusable workflow reference")
    action_ref: Optional[ActionReference] = Field(None, description="Parsed action reference details")
    run: Optional[str] = Field(None, description="Shell command string (never executed)")
    shell: Optional[str] = Field(None, description="Explicit shell requested (e.g., bash, pwsh)")
    if_condition: Optional[str] = Field(None, description="Conditional execution statement ('if')")
    env: Dict[str, str] = Field(default_factory=dict, description="Step-level environment variables")
    with_args: Dict[str, Any] = Field(default_factory=dict, description="Input parameters passed to action")
    secrets_referenced: List[str] = Field(default_factory=list, description="Names of secrets referenced in step")
    is_run_command: bool = Field(False, description="True if step executes inline shell commands")
    is_action: bool = Field(False, description="True if step invokes an external action")


class ParsedJob(BaseModel):
    """Structured representation of a workflow job."""

    job_id: str = Field(..., description="Unique job key in workflow YAML (e.g., 'build', 'lint')")
    name: Optional[str] = Field(None, description="Human-readable job name")
    runs_on: List[str] = Field(default_factory=list, description="Runner labels (e.g., ['ubuntu-latest'])")
    needs: List[str] = Field(default_factory=list, description="Dependencies on other job IDs")
    permissions: Optional[Union[Dict[str, str], str]] = Field(
        None, description="Job-level permission specifications or 'write-all'/'read-all'"
    )
    environment: Optional[Union[str, Dict[str, Any]]] = Field(
        None, description="Target deployment environment name or object"
    )
    timeout_minutes: Optional[int] = Field(None, description="Configured timeout in minutes")
    continue_on_error: Optional[bool] = Field(None, description="Whether job ignores errors")
    strategy: Optional[Dict[str, Any]] = Field(None, description="Matrix execution strategy if configured")
    services: List[str] = Field(default_factory=list, description="Service containers configured for job")
    env: Dict[str, str] = Field(default_factory=dict, description="Job-level environment variables")
    steps: List[ParsedStep] = Field(default_factory=list, description="Ordered list of steps in job")
    uses: Optional[str] = Field(None, description="Reusable workflow reference if job is reusable workflow call")
    reusable_ref: Optional[ActionReference] = Field(None, description="Parsed reusable workflow reference")
    secrets_referenced: List[str] = Field(default_factory=list, description="Secrets referenced in job definition")


class ParsedWorkflow(BaseModel):
    """Complete structured representation of a parsed GitHub Actions workflow."""

    name: Optional[str] = Field(None, description="Workflow name")
    triggers: List[str] = Field(default_factory=list, description="List of trigger event names (e.g., ['push'])")
    trigger_details: Dict[str, Any] = Field(default_factory=dict, description="Trigger parameters and event config")
    permissions: Optional[Union[Dict[str, str], str]] = Field(
        None, description="Top-level default permissions"
    )
    env: Dict[str, str] = Field(default_factory=dict, description="Top-level environment variables")
    concurrency: Optional[Union[str, Dict[str, Any]]] = Field(
        None, description="Workflow concurrency configuration"
    )
    jobs: Dict[str, ParsedJob] = Field(default_factory=dict, description="Parsed jobs mapped by job ID")
    total_jobs: int = Field(0, description="Total number of jobs in workflow")
    total_steps: int = Field(0, description="Total number of steps across all jobs")
    all_secrets_referenced: List[str] = Field(
        default_factory=list, description="Deduplicated list of all secrets referenced across workflow"
    )
    all_action_references: List[ActionReference] = Field(
        default_factory=list, description="List of all external action references used"
    )
    warnings: List[str] = Field(default_factory=list, description="Structural and validation warnings")
    raw_dict: Dict[str, Any] = Field(default_factory=dict, description="Sanitized, normalized dictionary")

    @property
    def job_ids(self) -> List[str]:
        """Convenience property returning ordered list of job IDs."""
        return list(self.jobs.keys())


class WorkflowParsingError(Exception):
    """Exception raised when a workflow file cannot be parsed or validated."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
