# System Limitations & Future Scope

This document provides a candid academic assessment of the boundaries, constraints, and known limitations of the GitHub Actions Workflow Anomaly Detection engine.

---

## 1. Dataset Scale & Diversity Boundaries

1. **Sample Size ($N=28$)**:
   - The dataset contains 13 authentic workflows and 15 controlled anomalous variants across 13 repository pairs.
   - While adequate for evaluating unsupervised tree ensembles (`IsolationForest`) and AST comparison algorithms with group-aware cross-validation, the dataset is too small for deep learning architectures (e.g. Graph Neural Networks or Transformer models) without severe overfitting.
2. **Synthetic Anomaly Imbalance**:
   - Because public repositories rarely publish confirmed malicious workflows, the anomalous samples were synthesized through controlled modifications based on documented CI/CD security vulnerabilities (OWASP Top 10 for CI/CD, Supply Chain Levels for Software Artifacts - SLSA).
   - Although realistic, synthetic anomalies may not capture all zero-day evasion techniques.

---

## 2. Static Analysis vs. Dynamic Runtime Analysis

1. **Static YAML Parsing Only**:
   - The engine parses workflow definitions statically as structured text and YAML trees.
   - It **does not execute workflows** and **does not simulate GitHub Actions runners**.
2. **Opaque Third-Party Actions**:
   - When a workflow references an external action (e.g., `uses: some-org/some-action@v1`), the parser analyzes the action reference, pinning state, and parameters.
   - The engine **cannot inspect the internal implementation** of third-party actions hosted in remote repositories (e.g., whether an action's JavaScript code contains obfuscated malware or telemetry).
3. **Dynamic Shell Commands**:
   - The parser inspects shell steps for notable commands (`curl`, `wget`, `bash`) via regex.
   - It cannot perform full abstract interpretation of complex multi-line bash scripts, environment variable substitutions, or obfuscated payloads (e.g., base64-decoded commands executed at runtime).

---

## 3. High-Dimensional Sensitivity (Single-Line Perturbations)

1. **Outlier Detection Manifold**:
   - Isolation Forest operates across a 30-dimensional feature space.
   - A single-line modification (e.g., changing `id-token: write` or altering an action tag) shifts only 1 or 2 dimensions while the remaining 28 dimensions remain identical to the baseline.
   - Consequently, subtle targeted mutations can remain embedded inside the dense cluster of normal workflows, leading to false negatives in unsupervised outlier detection alone.
2. **Mitigation**:
   - This limitation is specifically addressed by our **Dual-Engine Architecture**: when a baseline workflow is provided, the deterministic **AST Structural Comparator** catches every exact single-line change regardless of ML outlier score.

---

## 4. Non-Dogmatic Anomaly Interpretation

1. **Deviation $\neq$ Malice**:
   - An anomaly score indicates that a workflow's topology diverges from standard open-source conventions.
   - An atypical configuration (such as running on a self-hosted runner, requesting broad write permissions, or using a monorepo matrix with 10 jobs) may be completely benign and authorized.
2. **Human-in-the-Loop Requirement**:
   - The system is designed as an **advisory triage aid** for security reviewers and DevOps engineers, not an automated blocking mechanism.

---

## 5. Future Improvements

1. **Dataset Expansion**:
   - Expand dataset to 500+ authentic open-source workflows using GitHub REST API scraping across Kubernetes, Rust, Go, Python, and JavaScript ecosystems.
2. **Action SHA Verification**:
   - Integrate with the GitHub REST API or OpenSSF Scorecard to automatically query whether unpinned action tags match official release tags.
3. **Graph Neural Network (GNN) Exploration**:
   - Model the workflow directly as a Directed Acyclic Graph (DAG) of jobs and steps, capturing relational dependencies that tabular feature vectors compress.
4. **Integration with GitHub Webhooks**:
   - Deploy as a GitHub App that triggers automated checks on Pull Requests modifying `.github/workflows/*.yml`.
