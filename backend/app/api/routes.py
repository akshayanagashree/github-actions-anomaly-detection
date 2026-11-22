"""FastAPI route handlers for GitHub Actions Workflow Anomaly Detection API.

Provides endpoints for workflow analysis, AST comparison, historical run lookup,
and health diagnostics.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.models.anomaly_detector import get_detector
from backend.app.parser.models import WorkflowParsingError
from backend.app.parser.workflow_parser import MAX_WORKFLOW_SIZE_BYTES
from backend.app.schemas.analysis import (
    AnalysisResponse,
    AnalyzeJsonRequest,
    ErrorResponse,
    HealthResponse,
    HistoryResponse,
)
from backend.app.services.analysis_service import perform_analysis
from backend.app.storage.database import (
    get_analysis_by_id,
    init_db,
    list_analysis_history,
)

router = APIRouter(prefix="/api", tags=["Workflow Analysis"])


ALLOWED_EXTENSIONS = {".yml", ".yaml"}


def validate_file_metadata(upload_file: UploadFile) -> None:
    """Validate uploaded file extension and content type."""
    if not upload_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )
    ext = Path(upload_file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Only .yml and .yaml workflow files are accepted.",
        )


def read_and_validate_file_content(upload_file: UploadFile) -> str:
    """Safely read uploaded file contents with size and UTF-8 encoding checks."""
    content_bytes = upload_file.file.read()

    if len(content_bytes) > MAX_WORKFLOW_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File '{upload_file.filename}' exceeds maximum allowed size limit of {MAX_WORKFLOW_SIZE_BYTES} bytes (1 MB).",
        )

    if not content_bytes.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{upload_file.filename}' is empty or contains only whitespace.",
        )

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{upload_file.filename}' contains invalid UTF-8 characters: {e}",
        )

    return content_str


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Service health and ML model readiness check."""
    detector = get_detector()
    model_loaded = detector.is_loaded

    # Check database connection
    db_connected = False
    try:
        init_db()
        db_connected = True
    except Exception:
        db_connected = False

    return HealthResponse(
        status="healthy",
        service="github-actions-anomaly-detection",
        version="1.0.0",
        model_loaded=model_loaded,
        model_type=detector.metadata.get("model_type", "IsolationForest"),
        model_version=detector.metadata.get("schema_version", "1.0.0"),
        total_features=len(detector.feature_names),
        database_connected=db_connected,
    )


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid YAML syntax or file format"},
        413: {"model": ErrorResponse, "description": "File payload exceeds 1MB limit"},
        500: {"model": ErrorResponse, "description": "Internal server analysis error"},
    },
)
def analyze_workflow(
    file: UploadFile = File(..., description="Target GitHub Actions workflow YAML file"),
    baseline_file: Optional[UploadFile] = File(
        None, description="Optional baseline workflow YAML file for AST structural diffing"
    ),
) -> AnalysisResponse:
    """Analyze an uploaded GitHub Actions workflow YAML file for structural anomalies.

    Extracts 30 structural features, scores deviations against authentic open-source
    baselines with Isolation Forest, and performs AST comparison if a baseline file is provided.
    """
    validate_file_metadata(file)
    target_content = read_and_validate_file_content(file)

    baseline_content: Optional[str] = None
    baseline_filename: Optional[str] = None

    if baseline_file:
        validate_file_metadata(baseline_file)
        baseline_content = read_and_validate_file_content(baseline_file)
        baseline_filename = baseline_file.filename

    try:
        result = perform_analysis(
            workflow_yaml=target_content,
            filename=file.filename,
            baseline_yaml=baseline_content,
            baseline_filename=baseline_filename,
        )
        return result
    except WorkflowParsingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"YAML Parsing Error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error: {str(exc)}",
        )


@router.post(
    "/analyze/json",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid YAML syntax or format"},
        413: {"model": ErrorResponse, "description": "Payload exceeds 1MB limit"},
        500: {"model": ErrorResponse, "description": "Internal server analysis error"},
    },
)
def analyze_workflow_json(payload: AnalyzeJsonRequest) -> AnalysisResponse:
    """Analyze workflow from raw YAML string contents (suitable for web editors or raw text submission)."""
    raw_bytes = payload.workflow_yaml.encode("utf-8")
    if len(raw_bytes) > MAX_WORKFLOW_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Workflow payload exceeds maximum allowed size of {MAX_WORKFLOW_SIZE_BYTES} bytes (1 MB).",
        )

    if not payload.workflow_yaml.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow YAML content is empty.",
        )

    if payload.baseline_yaml:
        b_bytes = payload.baseline_yaml.encode("utf-8")
        if len(b_bytes) > MAX_WORKFLOW_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Baseline workflow payload exceeds maximum allowed size of {MAX_WORKFLOW_SIZE_BYTES} bytes (1 MB).",
            )

    try:
        result = perform_analysis(
            workflow_yaml=payload.workflow_yaml,
            filename=payload.filename or "workflow.yml",
            baseline_yaml=payload.baseline_yaml,
            baseline_filename=payload.baseline_filename,
        )
        return result
    except WorkflowParsingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"YAML Parsing Error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error: {str(exc)}",
        )


@router.get("/history", response_model=HistoryResponse)
def get_history(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of historical records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> HistoryResponse:
    """Retrieve paginated historical workflow analysis records, ordered newest first."""
    items, total = list_analysis_history(limit=limit, offset=offset)
    return HistoryResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/results/{analysis_id}",
    response_model=AnalysisResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Analysis record not found"},
    },
)
def get_analysis_result(analysis_id: str) -> AnalysisResponse:
    """Retrieve full analysis results, features, differences, and recommendations for a previous run."""
    result = get_analysis_by_id(analysis_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis result with ID '{analysis_id}' not found.",
        )
    return AnalysisResponse.model_validate(result)
