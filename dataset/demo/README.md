# Demonstration Workflows & Test Suite (`dataset/demo/`)

This directory contains **ten structured test cases** designed for end-to-end testing, frontend demonstration (Partner B's React UI), and API verification of the GitHub Actions Workflow Anomaly Detection system.

---

## 1. Important Concept: Structural Differences vs. ML Anomalies

A fundamental principle of this project is the distinction between **Structural Comparison** and **Machine Learning Anomaly Detection**:

1. **AST Structural Comparison (Deterministic)**:
   - When a baseline workflow (e.g., `01_normal_ci.yml`) is provided alongside a modified workflow, the comparison engine identifies **every exact syntax difference** (e.g. an added step, altered runner, elevated permission, or unpinned action tag).
   - *Guarantee*: If a structural element changed, the comparison engine **will** discover it, categorize it, and assign an advisory severity level (`critical`, `high`, `medium`, `low`, `info`).

2. **Machine Learning Anomaly Detection (Statistical Manifold)**:
   - The ML model (Isolation Forest) evaluates a workflow across 30 holistic structural dimensions simultaneously without requiring a baseline.
   - It computes path lengths across randomized decision trees to determine whether the workflow is a **statistical outlier** compared to authentic open-source CI/CD distributions.
   - *Key Insight*: A small, targeted modification (such as changing a single action tag or removing a single step) represents a micro-shift in a 30-dimensional space. The workflow may still fall within normal open-source cluster bounds. Conversely, macro changes (adding multiple complex jobs or switching to self-hosted runners) produce noticeable outlier scores.
   - **Conclusion**: Anomaly scores reflect **topological divergence**, *not* a guarantee that every single modified file will be flagged as anomalous.

---

## 2. Test Cases Overview

| File | Type | Target Baseline | Description | Expected API Outcome |
| :--- | :---: | :---: | :--- | :--- |
| `01_normal_ci.yml` | **Baseline** | N/A | Standard Python CI workflow with push/pull_request triggers, ubuntu runner, actions/checkout@v4, setup-python@v5, pip install, and pytest. | HTTP 200: `classification: "normal"`, `anomaly_score: ~0.25-0.45`. Zero structural diffs. |
| `02_normal_test.yml`| **Baseline** | N/A | Standard multi-job Node.js workflow (lint + test with `needs: [lint]`). | HTTP 200: `classification: "normal"`, `anomaly_score: ~0.30-0.45`. |
| `03_added_permission.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. Top-level permissions elevated to `write-all` and job requests `id-token: write`. | HTTP 200: Comparative diff flags `permission_change` (`CRITICAL`). Security warning emitted. |
| `04_added_job.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. Added `publish-metrics` job specifying a `self-hosted` runner. | HTTP 200: Comparative diff flags `job_addition` and `runner_change`. Security warning for self-hosted runner. |
| `05_changed_trigger.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. Trigger changed to `pull_request_target` with PR head checkout. | HTTP 200: Comparative diff flags `trigger_change` (`CRITICAL`). Security warning emitted. |
| `06_changed_action.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. Actions altered from immutable tags (`@v4`, `@v5`) to unpinned mutable branch (`@main`). | HTTP 200: Comparative diff flags `action_change`. Security warning for unpinned action supply-chain risks. |
| `07_removed_step.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. The core `Run test suite` verification step was deleted. | HTTP 200: Comparative diff flags `step_removal` (`HIGH`). |
| `08_modified_dependency.yml` | **Modified** | `01_normal_ci.yml` | Derived from `01_normal_ci.yml`. Added `deploy` job that omits `needs: [test]`, allowing unconditional execution. | HTTP 200: Comparative diff flags `job_addition`. |
| `09_invalid.yml` | **Invalid** | N/A | Corrupted YAML syntax (unclosed mapping bracket, bad indentation). | **HTTP 400 Bad Request**: Structured error with parsing message. |
| `10_empty.yml` | **Invalid** | N/A | Completely empty whitespace file. | **HTTP 400 Bad Request**: "File is empty or contains only whitespace." |

---

## 3. How to Test & Upload via API

### A. Testing Single Workflow (Standalone Anomaly Scoring)
Upload any workflow to `POST /api/analyze` without a baseline:
```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -F "file=@dataset/demo/01_normal_ci.yml"
```

### B. Testing Paired Comparison (AST Structural Diffing)
Upload a modified workflow as `file` and `01_normal_ci.yml` as `baseline_file`:
```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -F "file=@dataset/demo/03_added_permission.yml" \
  -F "baseline_file=@dataset/demo/01_normal_ci.yml"
```
The response will contain:
- `structural_differences`: Array of discrete changes with `category`, `location`, `baseline_value`, `modified_value`, `severity`, and `description`.
- `comparison_summary`: Total changes and counts.
- `warnings`: Actionable security triage alerts.

### C. Testing Error Handling (Invalid Files)
```bash
# Test malformed syntax rejection (HTTP 400)
curl -i -X POST "http://localhost:8000/api/analyze" \
  -F "file=@dataset/demo/09_invalid.yml"

# Test empty file rejection (HTTP 400)
curl -i -X POST "http://localhost:8000/api/analyze" \
  -F "file=@dataset/demo/10_empty.yml"
```
