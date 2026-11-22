# Dataset Research & Collection Guide

## 1. Overview & Objective
This document outlines the methodology for researching, collecting, and structuring the GitHub Actions workflow dataset used to train and evaluate our anomaly detection engine.

To ensure scientific validity and practical utility:
1. **Authentic Baselines**: Ground truth "normal" samples are gathered directly from prominent, well-maintained open-source repositories with permissive licenses.
2. **Controlled Anomalous Variants**: Deviations are synthesized by applying specific, documented structural modifications that represent known supply chain attack vectors, operational misconfigurations, and privilege escalations.
3. **Paired Structure**: Every anomalous workflow is explicitly linked to its parent baseline workflow via a `pair_id`.
4. **Data Leakage Prevention**: During train/test splitting, variants derived from the same parent workflow are kept strictly within the same split (grouped splitting).

---

## 2. Authentic Workflows in the Dataset

The initial dataset comprises **13 authentic baseline workflows** collected from premier open-source projects across Python, Node.js, Go, C, and Docker ecosystems:

| Pair ID | Normal Workflow ID | Repository | Ref | License | Original File | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PAIR-001` | `WF-NORM-001` | `pallets/flask` | `main` | BSD-3-Clause | `tests.yaml` | Multi-OS pytest matrix across Python 3.9-3.13 |
| `PAIR-002` | `WF-NORM-002` | `encode/uvicorn` | `master` | BSD-3-Clause | `main.yml` | Matrix testing and coverage reporting for ASGI server |
| `PAIR-003` | `WF-NORM-003` | `pypa/sampleproject` | `main` | MIT | `test.yml` | PyPA standard Python packaging CI pipeline |
| `PAIR-004` | `WF-NORM-004` | `actions/checkout` | `main` | MIT | `test.yml` | Self-testing workflow for actions/checkout |
| `PAIR-005` | `WF-NORM-005` | `cli/cli` | `trunk` | MIT | `lint.yml` | Go code quality verification using golangci-lint |
| `PAIR-006` | `WF-NORM-006` | `psf/requests` | `main` | Apache-2.0 | `run-tests.yml` | Cross-platform pytest matrix for HTTP library |
| `PAIR-007` | `WF-NORM-007` | `pytest-dev/pytest` | `main` | MIT | `test.yml` | Multi-architecture test matrix for pytest |
| `PAIR-008` | `WF-NORM-008` | `docker/build-push-action`| `master` | Apache-2.0 | `ci.yml` | Docker build, QEMU emulation, and Buildx validation |
| `PAIR-009` | `WF-NORM-009` | `expressjs/express` | `master` | MIT | `ci.yml` | Node.js matrix testing across current/legacy Node |
| `PAIR-010` | `WF-NORM-010` | `curl/curl` | `master` | curl | `linux.yml` | Autotools/CMake builds with multiple TLS backends |
| `PAIR-011` | `WF-NORM-011` | `actions/starter-workflows`| `main` | MIT | `python-package.yml` | Official GitHub starter template for Python CI |
| `PAIR-012` | `WF-NORM-012` | `fastapi/fastapi` | `master` | MIT | `test.yml` | Comprehensive FastAPI testing suite |
| `PAIR-013` | `WF-NORM-013` | `pypa/pip` | `main` | MIT | `ci.yml` | Pip package manager CI build and test suite |

---

## 3. Structural Anomaly Categories

The initial dataset introduces **15 controlled anomalous variants** across **10 key structural categories**:

| Category | Description | Security / Operational Risk | Example Modification in Dataset |
| :--- | :--- | :--- | :--- |
| **`permission_escalation`** | Granting broad write scopes (e.g., `write-all` or multi-resource write). | Overprivileged workflows violate least privilege; compromised steps gain full write access. | Added `permissions: write-all` to Flask test workflow (`WF-ANOM-001`). |
| **`runner_tampering`** | Shifting runner configuration from standard GitHub-hosted to unvetted self-hosted pools. | Self-hosted runners execute untrusted code directly on internal infrastructure. | Swapped `ubuntu-latest` for `[self-hosted, linux]` in Flask (`WF-ANOM-002`) and Pip (`WF-ANOM-015`). |
| **`trigger_modification`** | Changing triggers from `pull_request` to `pull_request_target` with PR head checkout. | Known PwnRequest supply chain vulnerability; runs untrusted PR code with repo write secrets. | Injected `pull_request_target` + PR head SHA checkout in Uvicorn (`WF-ANOM-003`). |
| **`suspicious_shell_step`** | Ingesting unverified remote scripts via shell piping (`curl \| bash`) or exfiltration commands. | Remote code execution without cryptographic checksum pinning; potential credential leakage. | Injected `curl ... \| bash` in Uvicorn (`WF-ANOM-004`) and base64 env exfiltration in FastAPI (`WF-ANOM-014`). |
| **`unauthorized_job_addition`** | Injecting independent background jobs that communicate externally. | Hidden persistence, background crypto-mining, or data harvesting. | Injected `telemetry-sync` job in Sampleproject (`WF-ANOM-005`). |
| **`action_pinning_degradation`**| Replacing pinned actions with unpinned third-party actions on floating tags (`@master`). | Downstream compromises in unpinned dependencies immediately affect builds. | Swapped `actions/setup-node@v4` with `community-contrib/setup-node@master` in Checkout (`WF-ANOM-006`). |
| **`dependency_tampering`** | Removing or omitting required `needs` dependency relationships between jobs. | Circumvents security gates; deployment tasks may proceed even if tests fail. | Added report publishing job without `needs: [lint]` in GitHub CLI (`WF-ANOM-007`). |
| **`secret_exposure_env`** | Binding repository secrets (`secrets.*`) into generic test steps. | Third-party test dependencies or compromised test scripts can log or extract tokens. | Passed `PROD_API_KEY` into standard pytest step in Requests (`WF-ANOM-008`). |
| **`security_gate_removal`** | Deleting verification jobs (linting, type checking, security scanning). | Weakens automated quality gates and masks newly introduced vulnerabilities. | Removed `docs`/`style` verification jobs in Pytest (`WF-ANOM-009`). |
| **`oidc_privilege_escalation`** | Adding elevated `id-token: write` permissions to open pull request workflows. | Uncontrolled OIDC token generation allows unauthorized federated cloud access (AWS/GCP). | Added `id-token: write` to Docker CI (`WF-ANOM-010`). |
| **`reusable_workflow_tampering`**| Ingesting external unpinned reusable workflows from third-party organizations. | Grants foreign organizations control over CI pipeline execution. | Injected untrusted reusable workflow call in Express (`WF-ANOM-011`). |
| **`workflow_dispatch_tampering`**| Introducing manual trigger inputs that pass unescaped variables into shell scripts. | Command injection vulnerability during manual runs. | Passed unescaped `custom_build_command` input directly into bash in Curl (`WF-ANOM-012`). |

---

## 4. Dataset Manifest Schema (`dataset/manifest.csv`)

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique sample ID (e.g., `WF-NORM-001`, `WF-ANOM-001`). |
| `pair_id` | String | Group identifier linking a baseline workflow with all its modified variants (e.g., `PAIR-001`). |
| `filename` | String | Path to YAML file relative to `dataset/` (e.g., `normal/flask_tests.yaml`). |
| `label` | String | Ground truth classification: `normal` or `anomalous`. |
| `anomaly_category` | String | Classification category (`none` for normal, or category name). |
| `modification_description`| String | Plain text description of structural alterations. |
| `rationale` | String | Justification for why this structural change warrants human review. |
| `parent_workflow` | String | ID of baseline workflow (points to self for normal workflows). |
| `source_repo` | String | GitHub repository (`owner/repo`). |
| `source_ref` | String | Commit SHA, tag, or branch from which the baseline was fetched. |
| `license` | String | Open-source license governing the original workflow. |
| `source_url` | String | Canonical URL used for collection. |
| `collection_date` | String | Date of collection (`YYYY-MM-DD`). |
| `original_filename` | String | Original workflow filename within `.github/workflows/`. |

---

## 5. Anti-Leakage Strategy & Machine Learning Guidelines

> [!IMPORTANT]
> **Data Leakage Warning**: In machine learning, evaluating a model on synthetic modifications of workflows it saw during training produces artificially inflated accuracy metrics.
> To prevent data leakage:
> - **Never use random train/test splitting**.
> - Always use **`GroupShuffleSplit`** or **`GroupKFold`** using `pair_id` as the grouping key.
> - If `PAIR-001` (Flask) is in the training set, its normal baseline and all its anomalous variants must remain in the training set. The test set must only contain completely unseen pairs.

---

## 6. Dataset Limitations & Future Expansion

### Limitations
1. **Sample Size**: The initial dataset contains 28 curated workflows designed for rapid verification, proof-of-concept modeling, and feature engineering.
2. **Contextual Diversity**: Different ecosystems have differing norms (e.g., Docker workflows are naturally more complex than simple Python package builds).
3. **Absence of Real Secrets**: No live credentials or secrets are present; all references use placeholders (`${{ secrets.PROD_API_KEY }}`).

### How to Expand the Dataset
1. Edit `scripts/build_dataset.py` and append new workflow entries to `SOURCES`.
2. Define corresponding controlled modifications under `generate_anomalies()`.
3. Run:
   ```powershell
   .\backend\.venv\Scripts\python.exe scripts/build_dataset.py
   .\backend\.venv\Scripts\python.exe dataset/validate_dataset.py
   ```
4. Re-run tests to confirm schema and grouping invariants:
   ```powershell
   .\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_dataset.py -v
   ```
