# GitHub Actions Workflow Anomaly Detection — Backend Service

## 1. Introduction

This service powers the backend and machine learning intelligence for the capstone project:
> **"Machine Learning-Based Discovery of Anomalous Structural Changes in GitHub Actions Workflows"**

The service provides:
1. **Safe YAML Parsing**: Secure AST extraction using PyYAML `safe_load` with 1 MB payload limits and zero execution guarantees.
2. **Structural Feature Engineering**: 30-dimensional numerical feature extraction (Schema v1.0.0) capturing topology, permissions, runners, dependencies, unpinned actions, and shell steps.
3. **Machine Learning Anomaly Detection**: Unsupervised Isolation Forest model detecting macro topological deviations, with calibrated scores ($0.0 - 1.0$) and z-score explainability.
4. **AST Structural Comparison Engine**: Deterministic fine-grained diffing between baseline and modified workflows across 10 change categories.
5. **FastAPI REST API**: Production REST endpoints (`/api/health`, `/api/analyze`, `/api/analyze/json`, `/api/history`, `/api/results/{id}`) with CORS pre-configured for Partner B's React frontend.
6. **SQLite History Persistence**: Lightweight storage for analysis runs with indexed pagination.

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── api/                 # REST API endpoints & routers (routes.py)
│   ├── comparator/          # AST structural diffing engine (engine.py, models.py)
│   ├── features/            # 30-feature numerical extraction (feature_extractor.py, schema.py)
│   ├── models/              # ML inference service & artifacts (anomaly_detector.py)
│   │   └── artifacts/       # model.joblib, preprocessor.joblib, metadata.json
│   ├── parser/              # Safe YAML parser & AST models (workflow_parser.py, models.py)
│   ├── schemas/             # Pydantic request & response schemas (analysis.py)
│   ├── services/            # Pipeline coordinator (analysis_service.py)
│   ├── storage/             # SQLite persistence layer (database.py)
│   └── main.py              # FastAPI application entrypoint & CORS middleware
├── tests/                   # 57 automated unit and integration tests
├── history.db               # SQLite database file (auto-created on startup)
└── requirements.txt         # Pinned backend dependencies
```

---

## 3. System Requirements & Environment Setup

- **Python Version**: Python 3.11, 3.12, 3.13, or 3.14 (Verified running on Python 3.14.2 64-bit on Windows 11).
- **Operating System**: Windows 10/11, macOS, or Linux.

### Setup Instructions (Windows PowerShell)

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create the virtual environment
python -m venv .venv

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Upgrade pip and install pinned dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Setup Instructions (Linux / macOS / Bash)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Key Artifact & Dataset Locations

- **Trained Model Artifacts**: `backend/app/models/artifacts/`
  - `model.joblib`: Serialized Isolation Forest estimator.
  - `preprocessor.joblib`: Fitted `StandardScaler` for z-score feature normalization.
  - `metadata.json`: Feature registry, contamination ($0.15$), threshold ($0.5373$), and CV metrics.
- **Workflow Dataset**: `dataset/`
  - `dataset/normal/`: 13 authentic open-source workflows from major repositories.
  - `dataset/anomalous/`: 15 controlled anomalous variants across 10 structural categories.
  - `dataset/manifest.csv`: Provenance and pairing records.
  - `dataset/features.csv`: 28 rows x 35 columns tabular feature matrix.
- **Demonstration Test Cases**: `dataset/demo/`
  - 10 structured demo test cases (`01_normal_ci.yml` through `10_empty.yml`) with a dedicated `README.md`.

---

## 5. Environment Variables (Optional)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins. |
| `HISTORY_DB_PATH`| `backend/history.db` | Absolute or relative path to SQLite history database file. |

---

## 6. Running the Backend Server

Start the FastAPI application with Uvicorn:
```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Base URL**: `http://localhost:8000` (or `http://127.0.0.1:8000`)
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Health Endpoint**: `http://localhost:8000/api/health`

---

## 7. Testing & Verification

### Run Complete Automated Test Suite (57 Tests)
```powershell
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### Run End-to-End Subsystem Integration Audit
```powershell
.\backend\.venv\Scripts\python.exe scripts/verify_backend_integration.py
```

### Run Dataset Validation
```powershell
.\backend\.venv\Scripts\python.exe dataset/validate_dataset.py
```

---

## 8. Common Errors & Troubleshooting

1. **Windows 11 Smart App Control (SAC) blocks DLL loading**:
   - *Symptom*: `ImportError: DLL load failed while importing _pydantic_core: An Application Control policy has blocked this file.`
   - *Solution*: Use pre-vetted `pydantic==2.13.5` (pinned in `requirements.txt`), whose native extension is digitally signed and trusted by Windows SAC.
2. **Port 8000 Already in Use**:
   - *Symptom*: `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)`.
   - *Solution*: Start the server on an alternative port:
     `uvicorn backend.app.main:app --host 127.0.0.1 --port 8080 --reload`
3. **Invalid File Extension Error (HTTP 400)**:
   - *Symptom*: `{"error": "Request Error", "detail": "Invalid file extension '.txt'. Only .yml and .yaml workflow files are accepted."}`
   - *Solution*: Ensure uploaded files have `.yml` or `.yaml` extensions.
4. **Payload Too Large (HTTP 413)**:
   - *Symptom*: `{"error": "Request Error", "detail": "File exceeds maximum allowed size limit of 1048576 bytes (1 MB)."}`
   - *Solution*: The security guard rejects files over 1 MB. Ensure workflow files are within limits.
