# Backend Service: GitHub Actions Anomaly Detection

## 1. Introduction
This directory contains the Python backend service for the **Machine Learning-Based Discovery of Anomalous Structural Changes in GitHub Actions Workflows** project.

The backend provides:
1. **Safe YAML parsing** of GitHub Actions workflow files.
2. **Structural feature extraction** into tabular numerical/categorical representations.
3. **Machine learning anomaly detection** using an unsupervised Isolation Forest model.
4. **Structural comparison** between a workflow and its baseline version.
5. **A RESTful API** built with FastAPI for communication with the React frontend (developed by Partner B).

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── __init__.py           # Application package initializer
│   ├── main.py               # FastAPI application entrypoint
│   ├── api/                  # API routers and endpoint declarations
│   ├── parser/               # Safe YAML parsing and workflow syntax validation
│   ├── features/             # Structural feature extraction and schema definitions
│   ├── models/               # ML model wrappers, artifact loaders, and inference logic
│   ├── services/             # Orchestration between parser, features, and ML
│   ├── schemas/              # Pydantic data validation schemas for requests and responses
│   └── storage/              # SQLite persistence for analysis history
├── tests/                    # Pytest test suite (unit and integration tests)
├── requirements.txt          # Python dependencies with pinned versions
└── README.md                 # This documentation file
```

---

## 3. Understanding the Virtual Environment (`.venv`)

### What is a Virtual Environment?
In Python, installing packages globally can lead to conflicts between different projects that require different versions of the same library. A **virtual environment** is an isolated folder (here named `.venv`) that contains its own Python interpreter and its own independent set of installed libraries.

### Working with the Virtual Environment (Windows PowerShell)

1. **Activate the environment**:
   ```powershell
   .\backend\.venv\Scripts\Activate.ps1
   ```
   *(Note: You will see `(.venv)` appear at the beginning of your PowerShell prompt).*

2. **Run Python inside the environment**:
   ```powershell
   .\backend\.venv\Scripts\python.exe <script.py>
   ```

3. **Install or update dependencies**:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   ```

4. **Run tests**:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
   ```

5. **Start the FastAPI development server**:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
   ```

---

## 4. Key Dependencies Explained

| Package | Purpose | Why We Use It |
| :--- | :--- | :--- |
| **PyYAML** | YAML parsing | Enables `yaml.safe_load()` to parse GitHub Actions workflow files securely without executing code. |
| **FastAPI** | Web framework | High performance, automatic OpenAPI documentation, asynchronous support, and strong typing. |
| **Uvicorn** | ASGI web server | Lightning-fast asynchronous server implementation to run FastAPI. |
| **Pydantic** | Data validation | Validates and serializes API request and response data types automatically. |
| **Scikit-learn** | Machine Learning | Provides the `IsolationForest` anomaly detection algorithm and evaluation metrics. |
| **Pandas & NumPy** | Data manipulation | Tabular manipulation of workflow features and efficient numerical vector operations. |
| **Joblib** | Model serialization | Efficiently saves and loads trained scikit-learn models and preprocessing pipelines. |
| **Pytest & HTTPX** | Testing | Test runner and asynchronous HTTP client for testing API endpoints. |

---

## 5. Security Principles
- **No Arbitrary Code Execution**: Uploaded workflow files are treated strictly as untrusted text/data.
- **Strict Safe Load**: Custom YAML tags (such as `!!python/object`) are rejected.
- **Analysis-Only**: The backend inspects and computes metrics; it never executes commands found in workflow files.
