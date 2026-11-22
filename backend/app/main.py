"""FastAPI application entrypoint for GitHub Actions Anomaly Detection.

Configures CORS for Partner B's React frontend, registers API routers,
handles application lifecycle, and defines standardized error formatting.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.routes import router as api_router
from backend.app.models.anomaly_detector import get_detector
from backend.app.storage.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to pre-warm models and initialize database."""
    # 1. Initialize SQLite schema
    init_db()

    # 2. Pre-load Isolation Forest model and standardizer into memory
    try:
        detector = get_detector()
        print(f"[Lifespan] Loaded {detector.metadata.get('model_type')} (threshold: {detector.threshold:.4f})")
    except Exception as exc:
        print(f"[Lifespan WARNING] ML model pre-warm failed: {exc}")

    yield


app = FastAPI(
    title="GitHub Actions Workflow Anomaly Detection API",
    description="REST API for analyzing GitHub Actions YAML workflows and detecting structural anomalies using machine learning and AST comparison.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS origins for Partner B's React frontend
# Defaults cover Create React App (3000) and Vite (5173) on both localhost and 127.0.0.1
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
env_origins = os.getenv("CORS_ORIGINS")
origins = [o.strip() for o in env_origins.split(",") if o.strip()] if env_origins else DEFAULT_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router)


def health_check() -> dict:
    """Convenience helper for environment smoke tests."""
    from backend.app.api.routes import get_health
    h = get_health()
    return {
        "status": h.status,
        "service": h.service,
        "phase": "Phase 8: Complete Backend Integration",
        "version": app.version,
    }



@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Format HTTP exceptions into standardized ErrorResponse schema."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "Request Error",
            "detail": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled errors and format into standardized 500 JSON."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.get("/", tags=["Root"])
def root_status() -> dict:
    """Root info endpoint directing clients to documentation and health status."""
    return {
        "service": "GitHub Actions Workflow Anomaly Detection API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health_check": "/api/health",
        "analyze_endpoint": "/api/analyze",
    }
