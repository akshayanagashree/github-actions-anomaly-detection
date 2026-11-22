# Dataset Documentation & Provenance Guide

## 1. Overview & Dataset Purpose

This document provides complete documentation of the workflow dataset created for the capstone project:
> *"Machine Learning-Based Discovery of Anomalous Structural Changes in GitHub Actions Workflows"*

The dataset provides a standardized, paired benchmark of **28 GitHub Actions workflow YAML files** designed for training unsupervised anomaly detection models, evaluating AST structural diffing algorithms, and assessing false positive rates on unseen repository architectures.

---

## 2. Authentic vs. Synthetic Sample Methodology

To maintain academic integrity, the dataset strictly distinguishes between **authentic collected workflows** and **controlled synthetic modifications**:

### 2.1. Authentic Normal Workflows (`dataset/normal/`, $N=13$)
These workflows were collected directly from authentic public production repositories representing diverse software stacks (Python, Node.js, Go, C, Docker). Each workflow preserves its original structure, comments, licensing attribution, and repository provenance:

| ID | Repository | Ecosystem | License | Source Commit / Ref | Original Filename |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `WF-NORM-001` | `pallets/flask` | Python | BSD-3-Clause | `main` | `tests.yaml` |
| `WF-NORM-002` | `encode/uvicorn` | Python | BSD-3-Clause | `master` | `test.yml` |
| `WF-NORM-003` | `pypa/sampleproject` | Python | MIT | `main` | `test.yml` |
| `WF-NORM-004` | `actions/checkout` | GitHub / TS | MIT | `main` | `test.yml` |
| `WF-NORM-005` | `cli/cli` | Go | MIT | `trunk` | `lint.yml` |
| `WF-NORM-006` | `psf/requests` | Python | Apache-2.0 | `main` | `tests.yml` |
| `WF-NORM-007` | `pytest-dev/pytest` | Python | MIT | `main` | `test.yml` |
| `WF-NORM-008` | `docker/build-push-action` | Docker | Apache-2.0 | `master` | `ci.yml` |
| `WF-NORM-009` | `expressjs/express` | Node.js | MIT | `master` | `ci.yml` |
| `WF-NORM-010` | `curl/curl` | C | curl License | `master` | `linux.yml` |
| `WF-NORM-011` | `actions/starter-workflows` | Multi | MIT | `main` | `python-package.yml`|
| `WF-NORM-012` | `fastapi/fastapi` | Python | MIT | `master` | `test.yml` |
| `WF-NORM-013` | `pypa/pip` | Python | MIT | `main` | `tests.yml` |

### 2.2. Controlled Anomalous Variants (`dataset/anomalous/`, $N=15$)
Because production repositories do not commit live vulnerabilities or malware, anomalous workflows were synthesized by injecting **controlled structural mutations** derived from documented security standards:
- **OWASP Top 10 for CI/CD Security Risks**
- **SLSA (Supply Chain Levels for Software Artifacts)**
- **GitHub Security Lab Research (GHSL)**

Every anomalous workflow is explicitly paired with an authentic parent via `pair_id` and documented in `dataset/manifest.csv`:

| ID | Pair ID | Parent ID | Anomaly Category | Modification Description |
| :--- | :--- | :--- | :--- | :--- |
| `WF-ANOM-001` | `PAIR-001` | `WF-NORM-001` | `permission_escalation` | Top-level permissions set to `write-all` |
| `WF-ANOM-002` | `PAIR-001` | `WF-NORM-001` | `suspicious_shell_step` | Shell step executing remote `curl \| bash` payload |
| `WF-ANOM-003` | `PAIR-002` | `WF-NORM-002` | `runner_tampering` | Runner migrated from `ubuntu-latest` to `self-hosted` |
| `WF-ANOM-004` | `PAIR-002` | `WF-NORM-002` | `trigger_modification` | Trigger changed from `pull_request` to `pull_request_target` |
| `WF-ANOM-005` | `PAIR-003` | `WF-NORM-003` | `action_pinning_degradation`| Pinned commit SHA replaced with unpinned mutable branch `@main` |
| `WF-ANOM-006` | `PAIR-004` | `WF-NORM-004` | `oidc_privilege_escalation`| Injected `permissions: id-token: write` on untrusted pull request |
| `WF-ANOM-007` | `PAIR-005` | `WF-NORM-005` | `unauthorized_job_addition`| Added unauthorized `telemetry` job exfiltrating environment variables |
| `WF-ANOM-008` | `PAIR-006` | `WF-NORM-006` | `suspicious_shell_step` | Injected step stealing `GITHUB_TOKEN` via curl POST |
| `WF-ANOM-009` | `PAIR-007` | `WF-NORM-007` | `security_gate_removal` | Deleted security linting job; subsequent jobs execute without dependencies |
| `WF-ANOM-010` | `PAIR-008` | `WF-NORM-008` | `secret_exposure_env` | Bound repository secrets directly to workflow top-level `env:` scope |
| `WF-ANOM-011` | `PAIR-009` | `WF-NORM-009` | `workflow_dispatch_tampering`| Added unauthenticated manual dispatch trigger |
| `WF-ANOM-012` | `PAIR-010` | `WF-NORM-010` | `dependency_tampering` | Removed `needs` dependency, allowing deployment before test completion |
| `WF-ANOM-013` | `PAIR-011` | `WF-NORM-011` | `runner_tampering` | Replaced cloud runner with unverified self-hosted runner label |
| `WF-ANOM-014` | `PAIR-012` | `WF-NORM-012` | `permission_escalation` | Granted `contents: write` across all matrix jobs |
| `WF-ANOM-015` | `PAIR-013` | `WF-NORM-013` | `reusable_workflow_tampering`| Switched reusable workflow reference to untrusted external fork |

---

## 3. Data Integrity & Credential Sanitization Audit

- **Zero Real Secrets**: All workflows have been audited to ensure **zero real secrets, API tokens, or credentials** are contained in the dataset. Secret references use simulated syntax (e.g. `${{ secrets.DUMMY_TOKEN }}`).
- **Format Validation**: All 28 files have been verified using PyYAML `safe_load`.
- **Integrity Script**: Validated continuously via `python dataset/validate_dataset.py`.

---

## 4. Dataset Expansion Guidelines

To expand the dataset with additional open-source repositories:
1. Save the unmodified authentic workflow under `dataset/normal/<ecosystem>_<project>.yml`.
2. Assign a new `pair_id` (e.g., `PAIR-014`) and `id` (`WF-NORM-014`).
3. Create 1 or 2 controlled anomalous variants under `dataset/anomalous/` modifying exactly one structural dimension.
4. Append metadata records to `dataset/manifest.csv`.
5. Run `python scripts/generate_feature_dataset.py` to regenerate `dataset/features.csv`.
6. Run `python dataset/validate_dataset.py` to ensure schema completeness.
