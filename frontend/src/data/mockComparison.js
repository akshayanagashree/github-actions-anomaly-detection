/**
 * MOCK WORKFLOW COMPARISON FIXTURES
 * ----------------------------------------------------
 * High-signal AST structural diff fixtures between baseline workflows
 * and modified workflows.
 *
 * Clearly marked with `isMockData: true`.
 * Note: Structural modifications reflect changes, not automatic malice.
 */

export const MOCK_COMPARISON_SCENARIOS = {
  drift: {
    id: 'drift-scenario',
    name: 'Privilege & Runner Structural Shift',
    description: 'High-variance diff introducing self-hosted runner and elevated permissions.',
    baselineFilename: 'baseline-deploy.yml',
    modifiedFilename: 'deploy-production.yml',
    timestamp: '2026-11-19T21:20:00Z',
    summary: {
      totalChanges: 14,
      additionsCount: 5,
      removalsCount: 2,
      modificationsCount: 7,
    },
    structuralDifferences: {
      jobs: {
        added: ['publish-artifacts', 'audit-scan'],
        removed: ['legacy-node16-check'],
        modified: [
          {
            name: 'release',
            change: 'Runner switched from ubuntu-latest to self-hosted-prod-arm64',
            severity: 'CRITICAL',
          },
          {
            name: 'build',
            change: 'Added needs: [audit-scan] dependency barrier',
            severity: 'INFO',
          },
        ],
      },
      steps: {
        added: [
          'Run external deployment agent (untrusted-org/deploy-tool)',
          'Collect container telemetry artifacts',
        ],
        removed: ['Legacy node-gyp build workaround'],
        modified: [
          {
            step: 'Checkout code',
            change: 'Changed fetch-depth from 1 to 0 (Full Git history clone)',
            severity: 'INFO',
          },
        ],
      },
      permissions: [
        {
          scope: 'Global Permissions',
          before: 'contents: read',
          after: 'write-all (Full administrative permissions)',
          severity: 'CRITICAL',
          note: 'Significantly expands write permissions across packages and repo assets.',
        },
      ],
      triggers: [
        {
          trigger: 'pull_request_target',
          status: 'ADDED',
          change: 'Introduced pull_request_target trigger in place of standard pull_request',
          severity: 'WARNING',
          note: 'Executes in the context of the base repository with access to secrets.',
        },
      ],
      runners: [
        {
          job: 'release',
          before: 'ubuntu-latest (GitHub-hosted ephemeral VM)',
          after: 'self-hosted-prod-arm64 (Internal persistent hardware)',
          severity: 'CRITICAL',
          note: 'Self-hosted runner lacks automatic VM destruction between runs.',
        },
      ],
      dependencies: [
        {
          job: 'publish-artifacts',
          before: 'None (New job)',
          after: 'needs: [build, audit-scan]',
          change: 'Job execution graph updated with 2 upstream dependencies.',
        },
      ],
      externalActions: [
        {
          action: 'untrusted-org/deploy-tool@v1.2',
          status: 'ADDED',
          change: 'New third-party action unpinned to full commit SHA',
          severity: 'WARNING',
        },
        {
          action: 'actions/checkout@v3',
          status: 'MODIFIED',
          change: 'Updated version reference to actions/checkout@v4',
          severity: 'INFO',
        },
      ],
      environment: [
        {
          name: 'DEPLOY_SECRET_KEY',
          job: 'release',
          change: 'Exported from repository secret store into runner shell environment',
          severity: 'WARNING',
        },
        {
          name: 'NODE_ENV',
          job: 'build',
          change: 'Configured to production',
          severity: 'INFO',
        },
      ],
    },
    // Raw side-by-side structural comparison blocks
    blocks: [
      {
        section: 'Triggers (on:)',
        baseline: 'on:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]',
        modified: 'on:\n  push:\n    branches: [main]\n  pull_request_target: # [ADDED]\n    branches: [main]',
        status: 'modified',
      },
      {
        section: 'Permissions',
        baseline: 'permissions:\n  contents: read',
        modified: 'permissions: write-all # [MODIFIED: Escalated]',
        status: 'modified',
      },
      {
        section: 'Jobs & Runners',
        baseline: 'jobs:\n  build:\n    runs-on: ubuntu-latest\n  release:\n    runs-on: ubuntu-latest\n  legacy-node16-check: # [REMOVED]\n    runs-on: ubuntu-latest',
        modified: 'jobs:\n  build:\n    runs-on: ubuntu-latest\n  release:\n    runs-on: self-hosted-prod-arm64 # [MODIFIED]\n  publish-artifacts: # [ADDED]\n    runs-on: ubuntu-latest\n  audit-scan: # [ADDED]\n    runs-on: ubuntu-latest',
        status: 'modified',
      },
      {
        section: 'Action Dependencies',
        baseline: '- uses: actions/checkout@v3\n- uses: actions/setup-node@v3',
        modified: '- uses: actions/checkout@v4\n- uses: actions/setup-node@v4\n- uses: untrusted-org/deploy-tool@v1.2 # [ADDED]',
        status: 'modified',
      },
    ],
  },

  maintenance: {
    id: 'maintenance-scenario',
    name: 'Standard Dependency Upgrade',
    description: 'Routine maintenance updating runner image and action versions without permission drift.',
    baselineFilename: 'ci-v1.4.yml',
    modifiedFilename: 'ci-v1.5.yml',
    timestamp: '2026-11-19T20:10:00Z',
    summary: {
      totalChanges: 4,
      additionsCount: 1,
      removalsCount: 0,
      modificationsCount: 3,
    },
    structuralDifferences: {
      jobs: {
        added: [],
        removed: [],
        modified: [
          {
            name: 'test',
            change: 'Matrix updated to include Node 22',
            severity: 'INFO',
          },
        ],
      },
      steps: {
        added: ['Cache npm dependencies with actions/cache@v4'],
        removed: [],
        modified: [],
      },
      permissions: [
        {
          scope: 'Workflow Permissions',
          before: 'contents: read',
          after: 'contents: read',
          severity: 'INFO',
          note: 'Maintains strict least-privilege token access.',
        },
      ],
      triggers: [],
      runners: [
        {
          job: 'test',
          before: 'ubuntu-20.04',
          after: 'ubuntu-latest (ubuntu-22.04)',
          severity: 'INFO',
          note: 'Standard OS image lifecycle upgrade.',
        },
      ],
      dependencies: [],
      externalActions: [
        {
          action: 'actions/setup-node@v3',
          status: 'MODIFIED',
          change: 'Upgraded to actions/setup-node@v4',
          severity: 'INFO',
        },
      ],
      environment: [],
    },
    blocks: [
      {
        section: 'Triggers (on:)',
        baseline: 'on:\n  push:\n    branches: [main]\n  pull_request:',
        modified: 'on:\n  push:\n    branches: [main]\n  pull_request:',
        status: 'unchanged',
      },
      {
        section: 'Permissions',
        baseline: 'permissions:\n  contents: read',
        modified: 'permissions:\n  contents: read',
        status: 'unchanged',
      },
      {
        section: 'Jobs & Runners',
        baseline: 'jobs:\n  test:\n    runs-on: ubuntu-20.04',
        modified: 'jobs:\n  test:\n    runs-on: ubuntu-latest # [MODIFIED]',
        status: 'modified',
      },
      {
        section: 'Action Dependencies',
        baseline: '- uses: actions/setup-node@v3',
        modified: '- uses: actions/setup-node@v4 # [MODIFIED]\n- uses: actions/cache@v4 # [ADDED]',
        status: 'modified',
      },
    ],
  },
};
