/**
 * MOCK ANALYSIS RESULT FIXTURES
 * ----------------------------------------------------
 * Realistic fixtures for Phase 4 UI testing before Partner A's
 * FastAPI backend is connected.
 *
 * Clearly marked with `isMockData: true`.
 * Note: Anomaly scores are raw model metrics, NOT probabilities.
 */

export const MOCK_ANOMALY_RESULT = {
  isMockData: true,
  analysis_id: 'anlyz-9801-rel',
  filename: 'release-pipeline.yml',
  timestamp: '2026-11-19T21:14:00Z',
  model_version: 'IsolationForest-v1.0',
  classification: 'ANOMALY',
  anomaly_score: 0.884,
  threshold: 0.500,
  score_interpretation:
    'Significant structural deviation from learned baseline distribution (Score 0.884 > Threshold 0.500).',
  is_anomaly: true,
  repo: 'acme-corp/payment-service',
  branch: 'main',
  structural_features: {
    job_count: 4,
    step_count: 22,
    runner_types: ['ubuntu-latest', 'self-hosted-prod-arm64'],
    external_actions: [
      'actions/checkout@v4',
      'untrusted-org/deploy-tool@v1.2',
      'actions/upload-artifact@v4',
    ],
    triggers: ['push', 'workflow_dispatch'],
    has_dangerous_permissions: true,
    permissions_summary: 'write-all (Global unrestricted access)',
    has_self_hosted_runner: true,
    has_pull_request_target: false,
    environment_variables_count: 8,
  },
  findings: [
    {
      id: 'f-1',
      severity: 'CRITICAL',
      category: 'Runner Tampering',
      source_type: 'RULE_FINDING',
      title: 'Unverified Self-Hosted Runner Introduced',
      message:
        'Job "release" configures a self-hosted runner ("self-hosted-prod-arm64"). Untrusted runners pose high risk of host compromise and persistent lateral movement.',
      priority: 'Immediate',
    },
    {
      id: 'f-2',
      severity: 'WARNING',
      category: 'Permission Escalation',
      source_type: 'RULE_FINDING',
      title: 'Global write-all Permissions Granted',
      message:
        'Workflow-level permissions grant unrestricted write access to repository contents, security events, and packages instead of scoped least-privilege tokens.',
      priority: 'High',
    },
    {
      id: 'f-3',
      severity: 'WARNING',
      category: 'Untrusted Action Reference',
      source_type: 'RULE_FINDING',
      title: 'Unverified External Action Reference',
      message:
        'Step executes "untrusted-org/deploy-tool@v1.2" which is unpinned to an immutable commit SHA and originates outside verified GitHub publishers.',
      priority: 'High',
    },
    {
      id: 'f-4',
      severity: 'INFO',
      category: 'AST Structural Divergence',
      source_type: 'ML_DETECTION',
      title: 'Statistical Graph Depth Divergence',
      message:
        'ML model flagged structural AST anomaly: step execution depth (22 steps) diverges from cluster median (11 steps).',
      priority: 'Medium',
    },
  ],
  warnings: [
    'Action "untrusted-org/deploy-tool@v1.2" uses a mutable semantic version tag instead of an immutable 40-character commit SHA.',
    'No step execution timeout defined for long-running release build step.',
  ],
  recommendations: [
    'Isolate self-hosted runners inside ephemeral, single-use container environments.',
    'Restrict workflow permissions to least privilege (e.g. "permissions: { contents: read }").',
    'Pin all third-party GitHub Actions to immutable full 40-character commit SHAs.',
    'Require peer reviews and approval for pull requests modifying .github/workflows directory.',
  ],
};

export const MOCK_NORMAL_RESULT = {
  isMockData: true,
  analysis_id: 'anlyz-9802-ci',
  filename: 'ci.yml',
  timestamp: '2026-11-19T20:45:00Z',
  model_version: 'IsolationForest-v1.0',
  classification: 'NORMAL',
  anomaly_score: 0.112,
  threshold: 0.500,
  score_interpretation:
    'Structural graph strictly aligns with verified standard CI/CD workflow topology (Score 0.112 < Threshold 0.500).',
  is_anomaly: false,
  repo: 'acme-corp/web-portal',
  branch: 'main',
  structural_features: {
    job_count: 3,
    step_count: 15,
    runner_types: ['ubuntu-latest'],
    external_actions: [
      'actions/checkout@v4',
      'actions/setup-node@v4',
      'actions/cache@v4',
    ],
    triggers: ['pull_request', 'push'],
    has_dangerous_permissions: false,
    permissions_summary: 'contents: read (Least privilege enforced)',
    has_self_hosted_runner: false,
    has_pull_request_target: false,
    environment_variables_count: 2,
  },
  findings: [
    {
      id: 'f-10',
      severity: 'INFO',
      category: 'Baseline Conformity',
      source_type: 'ML_DETECTION',
      title: 'Normal Structural Graph Conformity',
      message:
        'Workflow graph AST features, dependency edges, and runner assignments strictly match the cluster distribution.',
      priority: 'Low',
    },
    {
      id: 'f-11',
      severity: 'INFO',
      category: 'Security Best Practice',
      source_type: 'RULE_FINDING',
      title: 'Read-Only Permissions Enforced',
      message:
        'Workflow enforces least-privilege token access for automated test execution.',
      priority: 'Low',
    },
  ],
  warnings: [],
  recommendations: [
    'Maintain existing least-privilege permission architecture.',
    'Continue monitoring third-party action dependencies with Dependabot.',
  ],
};
