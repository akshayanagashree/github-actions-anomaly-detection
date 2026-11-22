# Frontend Review, Integration Test & Quality Assurance Report

**Project**: Machine Learning-Based Discovery of Anomalous Structural Changes in GitHub Actions Workflows  
**Phase**: Phase 8 — Comprehensive Frontend Review, Integration Testing & PR Preparation  
**Active Branch**: `feature/frontend` (Partner B)  
**Target Branch**: `main`  
**Date**: November 22, 2026  

---

## 1. Executive Summary

This report documents the rigorous quality audit, integration test suite, and end-to-end verification of the React cybersecurity web application developed by Partner B. The application connects directly to Partner A's FastAPI backend and Isolation Forest ML pipeline to parse GitHub Actions workflows, extract 30 AST structural features, detect topological anomalies, perform pairwise structural diffing, and audit historical analyses.

### Key Verification Metrics
- **Frontend Test Suite (Vitest)**: **7 test files passed, 39 tests passed (100% pass rate)**.
- **Backend Test Suite (Pytest)**: **57 tests passed, 0 failures (100% pass rate)**.
- **Production Build (`vite build`)**: **Clean exit code 0 in 23.64s** (2,079 modules transformed).
- **Backend Service Alignment**: 100% adherence to `docs/api_contract.md` across `/api/analyze`, `/api/history`, `/api/results/{id}`, and `/api/health`.
- **Integrity**: Zero mock data is presented as real analysis. When history is empty, an explicit "Demo / Baseline Fixture" badge and notice are rendered.

---

## 2. Page-by-Page Integration & Quality Verification

### 1. Security Overview Dashboard (`/dashboard`)
- **Real-Time Data Fetching**: On mount, queries `GET /api/history` via `analysisService.getHistory(50, 0)`.
- **Telemetry Derivation**: Dynamically computes Total Workflows, Normal Workflows, Potential Anomalies, and Anomaly Percentage directly from SQLite stored analyses.
- **Empty State & Baseline Fallback**: If the database is empty, the UI displays an informative banner: *"Initial Telemetry State: Displaying baseline demonstration metrics until live workflow analyses are submitted."*
- **Visual Trends**: Recharts area and bar charts render analysis activity trends and category breakdowns with dark theme cybersecurity styling.
- **Recent Analysis Stream**: Recent runs render with file status badges (`Normal` vs `Anomaly Detected`), execution dates, and clickable navigation to the results view.

### 2. Workflow Upload & Validation (`/upload`)
- **Drag-and-Drop & File Picker**: Powered by the reusable `FileUploadZone` component with active drag states, file type checks, and clear buttons.
- **Client-Side Validation**:
  - Rejects files without `.yml` or `.yaml` extensions before HTTP transmission.
  - Rejects files exceeding 1 MB (`1,048,576 bytes`), matching backend constraints.
  - Rejects zero-byte or empty files with actionable guidance.
- **Real-Time YAML Preview**: Automatically reads the first 4 KB of the file to render a syntax-highlighted 16-line preview card.
- **Comparative Baseline Selection**: Includes an expandable optional baseline selector for pairwise AST structural diffing.
- **Multipart `FormData` Transmission**: Packages `file` and optional `baseline_file` into `FormData` and posts to `POST /api/analyze`.
- **Perceived Progress & Error Handling**: Displays a stepped loading indicator during model inference. Catches FastAPI `400 Bad Request` (malformed YAML syntax) and `422 Unprocessable Entity` and displays clear error alerts.
- **Success Banner**: Upon completion, displays an interactive preview card with the assigned UUID (`ana_...`), file status, anomaly score, and direct navigation buttons.

### 3. Structural Analysis Results (`/results`)
- **Metadata Card**: Displays target filename, UUID, ISO timestamp, model version (`IsolationForest v1.0.0`), and baseline pairing tag.
- **Calibrated Score Meter**:
  - Visual gauge renders score `0.0`–`1.0` alongside the calibrated decision threshold (`0.5373`).
  - Score interpretation clearly distinguishes that this is an **unsupervised topological outlier metric, NOT a probability of malice**.
- **Extracted Structural Features**: Renders all 30 engineered metrics (job count, step count, runner types, permission scopes, pull_request_target triggers, unpinned action ratios).
- **Isolation Forest Z-Score Deviations**: Renders top contributing feature deviations with normalized z-scores, observed values, and baseline averages.
- **Findings Table**: Clearly delineates between statistical ML anomalies (`ML_DETECTION`) and AST policy rule detections (`RULE_FINDING`).
- **Hardening Recommendations**: Suggests actionable remediation (e.g. SHA-256 commit hash pinning, scoped OIDC permissions, removing broad write privileges).

### 4. Workflow AST Comparison (`/comparison`)
- **Live Paired Workflow Adapter**: Dynamically ingests `structural_differences` and `comparison_summary` from paired runs.
- **Quantitative Summary Bar**: Counter badges for added jobs/steps (+), removed jobs/steps (-), and modified configurations (~).
- **Categorized AST Diffs**: Granular inspection across:
  - Jobs (Added, Removed, Modified).
  - Steps (Added, Removed, Modified).
  - Permissions (Scope escalation, OIDC `id-token` write, top-level `write-all`).
  - Runners (Switching from GitHub-hosted `ubuntu-latest` to private `self-hosted`).
  - Triggers (Dangerous triggers such as `pull_request_target` with head checkout).
  - External Actions (Unpinned mutable branches `@main`).
- **Synchronized Side-by-Side Viewer**: Dual-pane comparison displaying baseline reference against modified workflow structure.
- **Scenario Exploration**: Allows toggling between live API comparisons and benchmark scenarios (Privilege Escalation Drift vs Routine Maintenance).

### 5. Analysis History & Audit Trail (`/history`)
- **Live Querying**: Directly fetches historical records from `GET /api/history` with limit/offset pagination.
- **Search & Filter Tabs**: Real-time client-side search by filename or analysis ID; filter by `ALL`, `ANOMALOUS`, `NORMAL`, or `PAIRED` workflows.
- **Drill-Down Inspection**: Clicking "Inspect" retrieves the complete `AnalysisResponse` via `GET /api/results/{id}` and seamlessly navigates to the Results or Comparison page.
- **Empty State**: Renders a dedicated empty state illustration with a "Load Demo Fixtures" button for presentation walkthroughs.

---

## 3. Real Backend API Integration Verification (`dataset/demo/`)

All 10 benchmark workflows from `dataset/demo/` were tested against the live backend API routes:

| Demo Workflow | Type | Baseline | Actual API Response | Verification Outcome |
| :--- | :---: | :---: | :--- | :--- |
| `01_normal_ci.yml` | Single | None | HTTP 200: `classification: "normal"`, `anomaly_score: 0.2270`, 30 features extracted, 0 diffs. | **PASSED** (Conforms to normal distribution) |
| `02_normal_test.yml` | Single | None | HTTP 200: `classification: "normal"`, `anomaly_score: 0.3210`, 2 jobs (`lint`, `test`). | **PASSED** (Conforms to normal distribution) |
| `03_added_permission.yml` | Paired | `01_normal_ci.yml` | HTTP 200: 2 high-severity diffs (`write-all` escalation and `id-token: write` OIDC escalation). | **PASSED** (Structural diff discovered both escalations) |
| `04_added_job.yml` | Paired | `01_normal_ci.yml` | HTTP 200: 1 high-severity diff (Added `publish-metrics` job on `self-hosted` runner). | **PASSED** (Job addition & runner shift flagged) |
| `05_changed_trigger.yml` | Paired | `01_normal_ci.yml` | HTTP 200: Critical trigger change (`pull_request_target` trigger substitution). | **PASSED** (Trigger drift identified) |
| `06_changed_action.yml` | Paired | `01_normal_ci.yml` | HTTP 200: Action changes from pinned versions to mutable `@main` branches. | **PASSED** (Supply chain risk warning emitted) |
| `07_removed_step.yml` | Paired | `01_normal_ci.yml` | HTTP 200: Step removal diff (Deleted core `Run test suite` verification). | **PASSED** (Step removal discovered) |
| `08_modified_dependency.yml` | Paired | `01_normal_ci.yml` | HTTP 200: Dependency graph change (Deploy job runs unconditionally without test dependency). | **PASSED** (Graph modification flagged) |
| `09_invalid.yml` | Single | None | **HTTP 400 Bad Request**: Structured syntax parsing error detail returned. | **PASSED** (Gracefully caught & alerted by frontend) |
| `10_empty.yml` | Single | None | **HTTP 400 Bad Request**: "File is empty or contains only whitespace." | **PASSED** (Client and server rejection verified) |

---

## 4. Frontend Bugs Identified & Resolved in Phase 8

During the review, five specific bugs and UX inconsistencies were identified and resolved strictly within frontend ownership:

1. **Bug 1: Case Sensitivity in Upload Success Banner (`UploadPage.jsx`)**
   - *Issue*: `UploadPage.jsx` checked `result.classification === 'ANOMALY'` (uppercase). Partner A’s FastAPI backend returns lowercase `'normal'` or `'anomalous'`. As a result, an anomalous workflow would render a "Normal Structure" badge in the upload success card.
   - *Fix*: Normalized status check to `result.classification?.toLowerCase() === 'anomalous' || result.classification === 'ANOMALY' || Boolean(result.is_anomaly)`.

2. **Bug 2: Stale Status Indicator in Collapsed Sidebar (`Sidebar.jsx`)**
   - *Issue*: When the sidebar was collapsed, the bottom status dot rendered amber with `title="Mock Data Active"`, contradicting the live FastAPI connection.
   - *Fix*: Updated to an emerald pulsing dot with `title="FastAPI Backend Connected (:8000)"` and proper `aria-label`.

3. **Bug 3: Missing High/Medium Severity Mapping (`StructuredDiffSection.jsx` & `FindingsTable.jsx`)**
   - *Issue*: `StructuredDiffSection` and `FindingsTable` switch statements only handled `'CRITICAL'` and `'WARNING'`, defaulting all backend `'high'` severity changes (such as permission escalations) to `'Info'`.
   - *Fix*: Added explicit `case 'HIGH'` (danger badge), `case 'MEDIUM'` (warning badge), and `case 'LOW'` (neutral badge).

4. **Bug 4: Hardcoded Legacy Decision Threshold in Formatters (`formatters.js`)**
   - *Issue*: `getAnomalySeverity` defaulted to `threshold = 0.5` rather than Partner A's calibrated decision threshold `0.5373`.
   - *Fix*: Updated default threshold to `0.5373`.

5. **Bug 5: Asynchronous React State Update Warnings in Vitest (`App.test.jsx` & `Dashboard.test.jsx`)**
   - *Issue*: In headless test runs, background health checks and history calls resolving asynchronously caused React `act(...)` warning logs.
   - *Fix*: Wrapped assertions in `await waitFor(() => ...)` to ensure clean asynchronous test resolution.

---

## 5. Accessibility (a11y) & Visual Quality Audit

- **Semantic Landmarks**: Standard HTML5 landmarks used throughout: `<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>`, `<section>`.
- **Keyboard Navigation**: All interactive elements (sidebar tabs, upload zones, buttons, scenario switchers) are reachable via `Tab` with visible focus rings (`focus:ring-2 focus:ring-blue-500`).
- **Color Contrast & Readability**:
  - Dark mode palette based on `slate-950` (`#020617`), `slate-900` (`#0f172a`), and `slate-800` (`#1e293b`).
  - Text uses `slate-100` (`#f1f5f9`) for headings and `slate-400` (`#94a3b8`) for secondary text, satisfying WCAG AAA contrast (> 7:1).
  - Status indicators use double encoding (icon + text badge + color) so information is not conveyed by color alone.
- **Responsive Layout**:
  - Desktop (>= 1024px): Persistent, collapsible sidebar navigation with expanded data source telemetry.
  - Tablet & Mobile (< 1024px): Responsive hamburger header button reveals an off-canvas drawer with backdrop blur. Grid layouts collapse from 2 columns to 1 column.

---

## 6. Screenshots & Visual Interface Guide

For presentations, academic grading, and report documentation, below is the visual layout specification corresponding to each interface:

### Interface 1: Security Overview Dashboard
```text
+-----------------------------------------------------------------------------------------+
| [=] SecWorkflow ML       API: FastAPI Live (:8000)  Model: IsolationForest-v1.0.0 [Upload] |
+---------------+-------------------------------------------------------------------------+
| [Dashboard]   |  TOTAL WORKFLOWS     NORMAL WORKFLOWS     POTENTIAL ANOMALIES   ANOMALY % |
| [Upload]      |      [ 148 ]             [ 134 ]                 [ 14 ]          [ 9.5% ] |
| [Results]     +-------------------------------------------------------------------------+
| [Comparison]  |  [ Weekly Analysis Trends Area Chart ]  |  [ Anomaly Severity Bar Chart ]|
| [History]     +-------------------------------------------------------------------------+
|               |  RECENT WORKFLOW AUDIT STREAM                                           |
| feature/front |  - 03_added_permission.yml   ID: ana_3e5c49   [Anomaly Detected]  0.742 |
| Partner B     |  - 01_normal_ci.yml          ID: ana_63b9f1   [Normal Structure]  0.227 |
+---------------+-------------------------------------------------------------------------+
```

### Interface 2: Workflow Upload & Drag-and-Drop
```text
+-----------------------------------------------------------------------------------------+
| UPLOAD GITHUB ACTIONS WORKFLOW                                                          |
| [ Sparkles Notice: FastAPI Service Layer Connected via multipart/form-data ]           |
|                                                                                         |
| +-------------------------------------------------------------------------------------+ |
| |   [ UploadCloud Icon ]                                                              | |
| |   Drag & drop target workflow YAML file here, or click to browse                    | |
| |   Accepted formats: .yml, .yaml (Max file size: 1 MB)                               | |
| +-------------------------------------------------------------------------------------+ |
| [x] Enable Comparative Baseline Analysis                                                |
| +-------------------------------------------------------------------------------------+ |
| |   (Optional) Select baseline workflow to compute AST structural diff                | |
| +-------------------------------------------------------------------------------------+ |
|                                                                    [ Analyze Workflow ] |
+-----------------------------------------------------------------------------------------+
```

### Interface 3: Structural Analysis Results
```text
+-----------------------------------------------------------------------------------------+
| [ShieldAlert]  03_added_permission.yml  [Anomaly Detected]  [Baseline Paired]           |
| ID: ana_3e5c491ff274  •  Model: IsolationForest-v1.0.0  •  Nov 22, 2026                 |
|                                                                                         |
| [ML Structural Anomaly Score]                                       Score: 0.742        |
| [====================================|----------------]   Threshold: 0.5373             |
| Interpretation: High topological deviation: Workflow exhibits atypical permissions.     |
+--------------------------------------------+--------------------------------------------+
| 30 EXTRACTED STRUCTURAL FEATURES           | STRUCTURAL FINDINGS & ML DETECTIONS        |
| - Total Jobs: 1                            | [CRITICAL] [ML Statistical Anomaly]        |
| - Total Steps: 4                           |   Deviating Feature: permissions_count     |
| - Runner Types: ubuntu-latest              | [HIGH] [AST Structural Rule]               |
| - Permissions: write-all (Broad write)     |   Permissions escalated to write-all       |
| - Has Self-Hosted Runner: No               | [HIGH] [AST Structural Rule]               |
| - Pull Request Target Trigger: No          |   OIDC id-token elevated to write          |
+--------------------------------------------+--------------------------------------------+
```

### Interface 4: Workflow AST Comparison
```text
+-----------------------------------------------------------------------------------------+
| WORKFLOW AST COMPARISON: 01_normal_ci.yml (Baseline) vs 03_added_permission.yml         |
| Changes Detected: [ 0 Added ]  [ 0 Removed ]  [ 2 Modified ]                            |
| View Mode: [Categorized Diffs]  [Side-by-Side Code]                                     |
+-----------------------------------------------------------------------------------------+
| [Key Icon] PERMISSIONS DRIFT                                                            |
| - Scope: workflow.permissions                                                           |
|   Before: None  -->  After: write-all  [HIGH SEVERITY]                                  |
|   Note: Permissions escalated to broad write ('write-all').                             |
|                                                                                         |
| - Scope: jobs.test.permissions.id-token                                                 |
|   Before: None  -->  After: write      [HIGH SEVERITY]                                  |
|   Note: Permission 'id-token' elevated to 'write' (OIDC cloud credential minting).      |
+-----------------------------------------------------------------------------------------+
```

---

## 7. Verification Commands

To reproduce the complete test and build results:

```powershell
# 1. Frontend automated unit & component tests
cd frontend
npm run test

# 2. Frontend production build
npm run build

# 3. Backend automated tests (Partner A test suite)
cd ..
$env:PYTHONPATH="."
python -m pytest backend/tests

# 4. Direct route verification script
python "C:\Users\deept\.gemini\antigravity\brain\58aa863a-b7b5-490b-bc52-ec6ed027dc25\scratch\verify_api.py"
```

---

## 8. Pull Request Preparation

- **Source Branch**: `feature/frontend`
- **Target Branch**: `main`
- **PR Title**: `feat(frontend): Complete React Cybersecurity UI, AST Visualizer & FastAPI Integration (Phases 1-8)`
- **Auto-merge**: Disabled per instructions. Awaiting manual review and approval by team members.
