"""Pydantic schemas for GitHub Actions Workflow Anomaly Detection API.

Defines strongly typed models for analysis requests, detailed responses,
history summaries, and service health checks.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from backend.app.comparator.models import ComparisonSummary, StructuralDifference


class FeatureDeviation(BaseModel):
    """Atypical structural feature deviation identified via z-score against baseline scaler."""

    feature: str = Field(..., description="Name of the structural feature")
    value: Union[int, float] = Field(..., description="Observed feature value in the analyzed workflow")
    z_score: float = Field(..., description="Z-score deviation relative to authentic baseline distribution")
    description: str = Field(..., description="Human-readable explanation of what this feature measures")


class WorkflowSummary(BaseModel):
    """High-level structural summary of the parsed workflow."""

    name: str = Field(..., description="Workflow name defined in YAML or fallback filename")
    total_jobs: int = Field(..., description="Total number of discrete jobs")
    job_ids: List[str] = Field(default_factory=list, description="List of job IDs declared in workflow")
    total_steps: int = Field(..., description="Total count of steps across all jobs")
    triggers: List[str] = Field(default_factory=list, description="Event triggers that invoke this workflow")
    runners: List[str] = Field(default_factory=list, description="List of runner environments (runs-on)")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="Top-level and job-level permissions")
    has_broad_write_permissions: bool = Field(False, description="Flag indicating if broad write permissions are enabled")
    has_self_hosted_runner: bool = Field(False, description="Flag indicating if self-hosted runners are specified")


class AnalysisResponse(BaseModel):
    """Comprehensive response schema for a workflow anomaly analysis."""

    analysis_id: str = Field(..., description="Unique identifier for this analysis run (UUID/ana_...)")
    filename: str = Field(..., description="Filename of the analyzed workflow")
    status: str = Field("success", description="Status of the analysis run ('success' or 'error')")
    created_at: str = Field(..., description="ISO 8601 UTC timestamp of when analysis was executed")
    has_baseline: bool = Field(False, description="Whether a baseline workflow was provided for comparison")
    baseline_filename: Optional[str] = Field(None, description="Filename of baseline workflow if provided")

    workflow_summary: WorkflowSummary = Field(..., description="Structural summary of the analyzed workflow")

    # Machine Learning Outlier Metrics (Explicitly non-dogmatic: NOT probabilities)
    anomaly_score: float = Field(
        ...,
        description="Calibrated structural anomaly score between 0.0 (strictly conforms to baseline) and 1.0 (extreme topological outlier). This is a statistical deviation metric, NOT a probability of malice.",
    )
    raw_score: float = Field(..., description="Raw Isolation Forest outlier score (-score_samples)")
    threshold: float = Field(..., description="Decision boundary threshold for statistical anomaly classification")
    is_anomaly: bool = Field(..., description="Whether raw_score exceeds threshold")
    classification: str = Field(..., description="'normal' if within baseline bounds, 'anomalous' if outlier")
    score_interpretation: str = Field(
        ...,
        description="Non-dogmatic explanation of structural anomaly score and reviewer guidance",
    )
    model_version: str = Field("1.0.0", description="Version of the deployed anomaly detection model")
    model_type: str = Field("IsolationForest", description="Machine learning algorithm name")

    # Features and Explanations
    extracted_features: Dict[str, Union[int, float]] = Field(
        default_factory=dict, description="The 30 engineered numerical features extracted from the workflow"
    )
    top_contributing_deviations: List[FeatureDeviation] = Field(
        default_factory=list,
        description="Top features that deviate most significantly from baseline open-source norms",
    )

    # Comparative AST Differences (only populated when baseline workflow provided)
    structural_differences: Optional[List[StructuralDifference]] = Field(
        None, description="Granular AST differences between baseline and modified workflows"
    )
    comparison_summary: Optional[ComparisonSummary] = Field(
        None, description="High-level counts and severity breakdown of detected differences"
    )

    # Actionable Developer Guidance
    findings: List[str] = Field(
        default_factory=list, description="High-level structural findings and notable characteristics"
    )
    explanations: List[str] = Field(
        default_factory=list, description="Detailed explanations of why certain structural attributes were flagged"
    )
    warnings: List[str] = Field(
        default_factory=list, description="Security and reliability warnings warranting human triage"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Actionable best-practice recommendations for workflow hardening"
    )


class HistoryItemSummary(BaseModel):
    """Compact summary of a previous analysis run for history listing."""

    analysis_id: str = Field(..., description="Unique analysis ID")
    filename: str = Field(..., description="Filename analyzed")
    has_baseline: bool = Field(..., description="Whether a baseline was included")
    baseline_filename: Optional[str] = Field(None, description="Baseline filename if provided")
    status: str = Field(..., description="Status ('success' or 'error')")
    anomaly_score: Optional[float] = Field(None, description="Calibrated anomaly score (0.0 to 1.0)")
    classification: Optional[str] = Field(None, description="'normal' or 'anomalous'")
    score_interpretation: Optional[str] = Field(None, description="Score explanation")
    total_jobs: int = Field(0, description="Job count")
    total_steps: int = Field(0, description="Step count")
    total_differences: int = Field(0, description="Count of structural differences")
    high_severity_differences: int = Field(0, description="Count of high/critical differences")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class HistoryResponse(BaseModel):
    """Paginated response for historical analysis runs."""

    items: List[HistoryItemSummary] = Field(default_factory=list, description="List of previous analysis runs")
    total: int = Field(..., description="Total count of historical analyses recorded")
    limit: int = Field(..., description="Pagination limit")
    offset: int = Field(..., description="Pagination offset")


class HealthResponse(BaseModel):
    """Service health and model readiness response."""

    status: str = Field("healthy", description="Service status")
    service: str = Field("github-actions-anomaly-detection", description="Service identifier")
    version: str = Field("1.0.0", description="API version")
    model_loaded: bool = Field(..., description="Whether ML Isolation Forest model is loaded in memory")
    model_type: str = Field(..., description="Name of loaded ML algorithm")
    model_version: str = Field(..., description="Model artifact version")
    total_features: int = Field(..., description="Number of features evaluated by model")
    database_connected: bool = Field(..., description="Whether SQLite history database is operational")


class AnalyzeJsonRequest(BaseModel):
    """JSON payload schema for direct workflow text submission."""

    workflow_yaml: str = Field(..., description="YAML content of the workflow to analyze")
    filename: Optional[str] = Field("workflow.yml", description="Optional filename identifier")
    baseline_yaml: Optional[str] = Field(None, description="Optional YAML content of baseline workflow")
    baseline_filename: Optional[str] = Field(None, description="Optional baseline filename identifier")


class ErrorResponse(BaseModel):
    """Standardized API error response format."""

    error: str = Field(..., description="Error category or short title")
    detail: str = Field(..., description="Detailed description of why the request failed")
    code: str = Field(..., description="Machine-readable error code")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
