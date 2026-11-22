# Feature Schema Specification

- **Schema Version**: `1.0.0`
- **Total Features**: 30 numerical features
- **Format**: Ordered 1D numerical vector (integers, floats, binary 0/1 flags)
- **Shared Agreement**: Used identically during model training (Phase 5/6), batch dataset preparation, and online inference in the FastAPI backend (Phase 7/8).

---

## 1. Feature Catalog

| # | Feature Name | Type | Category | Range | Description & Cybersecurity Rationale | Limitations |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `job_count` | `int` | `topology` | $[0, \infty)$ | Total number of jobs declared in the workflow. Significant deviations indicate unexpected additions (e.g., crypto-miner / telemetry) or job deletions. | Does not indicate what individual jobs execute. |
| 2 | `step_count` | `int` | `topology` | $[0, \infty)$ | Total number of steps across all jobs. Outliers signal payload injection or truncated builds. | A high step count is common in complex mono-repos. |
| 3 | `avg_steps_per_job` | `float` | `topology` | $[0.0, \infty)$ | Mean steps per job (`step_count / max(1, job_count)`). Measures task density. | May mask disparity between one huge job and several small ones. |
| 4 | `max_steps_per_job` | `int` | `topology` | $[0, \infty)$ | Maximum steps contained in any single job. Detects bloated single-job script dumps. | Large monolithic deployment scripts may be legitimate. |
| 5 | `trigger_count` | `int` | `triggers` | $[0, \infty)$ | Number of distinct events configured under `on`. Multi-trigger workflows have broader execution exposure. | Does not analyze event filters (branches, tags). |
| 6 | `has_pull_request_target` | `int` | `triggers` | $\{0, 1\}$ | Binary flag (1 if `pull_request_target` trigger is set). Flags known **PwnRequest** vulnerability risk where untrusted PR code can access repo write tokens. | Can be used safely if PR code is never checked out. |
| 7 | `has_workflow_dispatch` | `int` | `triggers` | $\{0, 1\}$ | Binary flag (1 if manual execution trigger is enabled). | Manual execution is standard in release pipelines. |
| 8 | `has_schedule` | `int` | `triggers` | $\{0, 1\}$ | Binary flag (1 if cron-scheduled trigger is configured). Periodic tasks are common vectors for covert persistence. | Scheduled nightly builds are common in normal repos. |
| 9 | `has_broad_write_permissions`| `int` | `permissions` | $\{0, 1\}$ | Binary flag (1 if `permissions: write-all` or global write is configured). Severe violation of least privilege. | Some administrative release workflows legitimately request broad write. |
| 10 | `has_id_token_write` | `int` | `permissions` | $\{0, 1\}$ | Binary flag (1 if `id-token: write` is granted). Grants OpenID Connect (OIDC) token minting to exchange for AWS/GCP/Azure credentials. | Standard requirement for legitimate keyless cloud deployments. |
| 11 | `has_contents_write` | `int` | `permissions` | $\{0, 1\}$ | Binary flag (1 if `contents: write` is granted). Allows workflow steps to commit code directly back to Git. | Standard in automated release tagging / changelog bots. |
| 12 | `explicit_permission_count` | `int` | `permissions` | $[0, \infty)$ | Number of explicit permission scopes defined. Workflows with explicit permissions exhibit higher security maturity. | A count of 0 implies default repository permissions (often read/write by default). |
| 13 | `has_permissions_block` | `int` | `permissions` | $\{0, 1\}$ | Binary flag (1 if top-level or job permissions block is defined, else 0). Missing block signals reliance on repository-wide defaults. | Missing block does not inherently mean malicious. |
| 14 | `has_self_hosted_runner` | `int` | `runners` | $\{0, 1\}$ | Binary flag (1 if any job targets a `self-hosted` runner pool). Shifts execution boundary to private infrastructure. | Organizations with dedicated hardware legitimately use self-hosted runners. |
| 15 | `runner_types_count` | `int` | `runners` | $[0, \infty)$ | Number of distinct runner strings across all jobs. High diversity indicates heterogeneous runner dependencies. | Matrix builds across ubuntu, macos, and windows naturally have higher counts. |
| 16 | `github_hosted_ratio` | `float` | `runners` | $[0.0, 1.0]$ | Proportion of jobs running on official GitHub-hosted runners (`ubuntu-*`, `windows-*`, `macos-*`). | 0.0 is normal for 100% self-hosted internal enterprise repos. |
| 17 | `total_dependencies_count` | `int` | `dependencies` | $[0, \infty)$ | Total sum of `needs` dependency declarations across all jobs. Measures DAG topology complexity. | Workflows with independent parallel matrix jobs legitimately have 0 dependencies. |
| 18 | `jobs_with_needs_count` | `int` | `dependencies` | $[0, \infty)$ | Number of jobs that depend on at least one upstream job. Sudden removal indicates bypassed security gates. | Simple single-job workflows naturally have 0. |
| 19 | `total_actions_count` | `int` | `supply_chain` | $[0, \infty)$ | Total external actions invoked via `uses:`. Measures third-party dependency footprint. | Does not evaluate internal code within the action. |
| 20 | `pinned_actions_count` | `int` | `supply_chain` | $[0, \infty)$ | Number of actions pinned to an immutable 40-character commit SHA. Strong defense against supply chain hijacking. | Pinned actions may still contain vulnerabilities if never updated. |
| 21 | `unpinned_actions_count` | `int` | `supply_chain` | $[0, \infty)$ | Number of actions referencing mutable tags (`@v4`, `@main`, `@master`). Vulnerable to upstream tag rewrites. | Floating tags (e.g., `@v4`) are extremely prevalent in open source. |
| 22 | `unpinned_actions_ratio` | `float` | `supply_chain` | $[0.0, 1.0]$ | Ratio of unpinned actions to total actions (`unpinned_actions / max(1, total_actions)`). | Workflows with 0 actions default safely to 0.0. |
| 23 | `third_party_actions_count`| `int` | `supply_chain` | $[0, \infty)$ | Number of actions from creators other than `actions` or `github`. Increases supply chain risk surface. | Many reputable actions (e.g. `docker/*`, `pypa/*`) are third-party to GitHub. |
| 24 | `shell_step_count` | `int` | `execution` | $[0, \infty)$ | Number of steps executing inline shell scripts via `run:`. Inline scripts lack the auditability of packaged actions. | Shell scripts are standard for build commands (`pytest`, `npm test`). |
| 25 | `shell_step_ratio` | `float` | `execution` | $[0.0, 1.0]$ | Proportion of steps executing shell scripts (`shell_steps / max(1, step_count)`). | High ratios are typical for build-from-source C/C++ projects. |
| 26 | `has_curl_or_wget_step` | `int` | `execution` | $\{0, 1\}$ | Binary flag (1 if any shell step invokes `curl` or `wget`). Correlates with remote script retrieval or data exfiltration. | Frequently used in CI to download toolchains, compilers, or test assets. |
| 27 | `secrets_referenced_count` | `int` | `secrets_env` | $[0, \infty)$ | Number of distinct secret variables referenced across the workflow. Wide secret exposure increases blast radius. | Does not inspect whether secret is actually transmitted over the network. |
| 28 | `has_secret_references` | `int` | `secrets_env` | $\{0, 1\}$ | Binary flag (1 if any `secrets.*` variable is used, else 0). | Release and deploy workflows naturally require secrets. |
| 29 | `environment_count` | `int` | `secrets_env` | $[0, \infty)$ | Number of jobs targeting explicit GitHub deployment environments (`environment:`). | Many simple test workflows do not declare environments. |
| 30 | `reusable_workflow_count` | `int` | `secrets_env` | $[0, \infty)$ | Number of external reusable workflows invoked (`uses:` pointing to `.yml` or `.github/workflows/`). | Modular enterprise repositories legitimately use reusable workflows. |

---

## 2. Handling Categorical & Missing Values

### 2.1 Categorical Feature Strategy
Unsupervised anomaly detection algorithms (such as Isolation Forest) rely on Euclidean or tree-partitioning metrics. Directly encoding categories as arbitrary integers ($1, 2, 3$) introduces false ordinal relationships (e.g. implying that runner type 3 is "greater than" runner type 1).
To maintain pure statistical integrity:
1. **Runner Categories**: Decomposed into binary indicators (`has_self_hosted_runner`), distinct counts (`runner_types_count`), and continuous proportions (`github_hosted_ratio`).
2. **Action Origins**: Decomposed into counts (`pinned_actions_count`, `third_party_actions_count`) and ratios (`unpinned_actions_ratio`).
3. **Permissions**: Decomposed into specific security-relevant binary flags (`has_broad_write_permissions`, `has_id_token_write`, `has_contents_write`).

### 2.2 Missing Values & Zero-Division Resilience
- In minimal or malformed workflows with 0 jobs or 0 steps, all ratio features are computed using `max(1, denominator)`.
- No feature ever yields `NaN`, `null`, or `inf`.
- Workflows with omitted sections (e.g., no `permissions:` block or no `env:` block) default deterministically to `0`.

---

## 3. Comparative Structural Diff Schema

When analyzing a workflow against a baseline version, the engine extracts structural difference metrics and structured findings:

```json
{
  "schema_version": "1.0.0",
  "diff_metrics": {
    "diff_jobs": 1,
    "diff_steps": 2,
    "diff_triggers": 0,
    "diff_unpinned_actions": 1,
    "diff_secrets": 2,
    "has_permission_escalation": 1,
    "has_runner_change": 1
  },
  "added_jobs": ["telemetry-job"],
  "removed_jobs": [],
  "added_triggers": [],
  "removed_triggers": [],
  "findings": [
    {
      "category": "permission_escalation",
      "severity": "high",
      "description": "Permissions elevated to broad write ('write-all'); violates principle of least privilege."
    },
    {
      "category": "runner_tampering",
      "severity": "high",
      "description": "Introduced self-hosted runner configuration; executes build jobs on private unmanaged host infrastructure."
    }
  ]
}
```

This response schema is consumed directly by Partner B's React frontend to power the structural comparison UI and findings dashboard.
