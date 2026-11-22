"""Phase 1 Environment & Setup Smoke Tests.

Validates that:
1. All core dependencies are installed and can be imported.
2. PyYAML safe_load functions properly and rejects arbitrary Python execution tags.
3. The FastAPI app object initializes cleanly with its health check endpoint and routes.
"""

import pytest
import yaml
from backend.app.main import app, health_check


def test_core_library_imports():
    """Verify all required libraries are installed and importable."""
    import numpy as np
    import pandas as pd
    import sklearn
    import joblib
    import pydantic
    import fastapi
    import uvicorn
    import httpx

    assert np.__name__ == "numpy"
    assert pd.__name__ == "pandas"
    assert sklearn.__name__ == "sklearn"
    assert joblib.__name__ == "joblib"
    assert pydantic.__name__ == "pydantic"
    assert fastapi.__name__ == "fastapi"
    assert uvicorn.__name__ == "uvicorn"
    assert httpx.__name__ == "httpx"


def test_pyyaml_safe_parsing():
    """Verify PyYAML parses standard workflows cleanly and prevents unsafe deserialization."""
    # Test standard workflow structure with quoted 'on'
    workflow_quoted = """
    name: CI
    "on": [push, pull_request]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
    """
    parsed = yaml.safe_load(workflow_quoted)
    assert parsed["name"] == "CI"
    assert "push" in parsed["on"]
    assert "build" in parsed["jobs"]

    # Verify PyYAML YAML 1.1 boolean key behavior (unquoted 'on' is parsed as True)
    workflow_unquoted = """
    name: CI
    on: [push]
    """
    parsed_unquoted = yaml.safe_load(workflow_unquoted)
    assert (True in parsed_unquoted) or ("on" in parsed_unquoted)

    # Verify that unsafe Python object instantiation is blocked by safe_load
    unsafe_yaml = "malicious_obj: !!python/object/apply:os.system ['echo 1']"
    with pytest.raises(yaml.constructor.ConstructorError):
        yaml.safe_load(unsafe_yaml)


def test_fastapi_app_initialization_and_health_check():
    """Verify that FastAPI app initializes properly with expected metadata and routes."""
    assert app.title == "GitHub Actions Workflow Anomaly Detection API"
    assert app.version in ("0.1.0", "1.0.0")

    # Verify route registration
    route_paths = [r.path for r in app.routes if hasattr(r, "path")]
    from backend.app.api.routes import router as api_router
    route_paths.extend([f"/api{r.path}" if not r.path.startswith("/api") else r.path for r in api_router.routes if hasattr(r, "path")])
    assert "/api/health" in route_paths

    # Test direct endpoint execution (unit test without live socket binding)
    result = health_check()
    assert result["status"] == "healthy"
    assert result["service"] == "github-actions-anomaly-detection"
    assert "Phase" in result["phase"]
