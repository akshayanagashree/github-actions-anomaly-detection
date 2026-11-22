/**
 * MOCK DATA FIXTURES FOR CYBERSECURITY ANALYTICS
 * ----------------------------------------------------
 * NOTE: This file contains realistic mock dataset fixtures used
 * exclusively for frontend development and offline demonstration.
 * Every record is clearly marked with `isMockData: true`.
 * In Phase 7, all views will swap to live API endpoints provided by Partner A.
 */

export const IS_MOCK_DATA = true;

export const MOCK_SYSTEM_METRICS = {
  isMockData: true,
  totalAnalyzed: 148,
  normalWorkflows: 124,
  potentialAnomalies: 24,
  anomalyPercentage: 16.2,
  highSeverityAnomalies: 9,
  mediumSeverityAnomalies: 15,
  lastUpdated: '2026-11-19T21:30:00Z',
};

export const MOCK_ANALYSIS_TRENDS = [
  { isMockData: true, date: 'Nov 13', analyzed: 16, normal: 14, anomalies: 2 },
  { isMockData: true, date: 'Nov 14', analyzed: 22, normal: 19, anomalies: 3 },
  { isMockData: true, date: 'Nov 15', analyzed: 19, normal: 17, anomalies: 2 },
  { isMockData: true, date: 'Nov 16', analyzed: 25, normal: 20, anomalies: 5 },
  { isMockData: true, date: 'Nov 17', analyzed: 21, normal: 18, anomalies: 3 },
  { isMockData: true, date: 'Nov 18', analyzed: 27, normal: 22, anomalies: 5 },
  { isMockData: true, date: 'Nov 19', analyzed: 18, normal: 14, anomalies: 4 },
];

export const MOCK_ANOMALY_CATEGORIES = [
  { isMockData: true, name: 'Runner Tampering', count: 8, color: '#EF4444' },
  { isMockData: true, name: 'Permission Escalation', count: 7, color: '#F97316' },
  { isMockData: true, name: 'Untrusted External Actions', count: 5, color: '#F59E0B' },
  { isMockData: true, name: 'Trigger Injection', count: 3, color: '#8B5CF6' },
  { isMockData: true, name: 'Suspicious Step Injection', count: 1, color: '#EC4899' },
];

export const MOCK_RECENT_ANALYSES = [
  {
    isMockData: true,
    id: 'anlyz-9801',
    filename: 'release-pipeline.yml',
    repo: 'acme-corp/payment-service',
    timestamp: '2026-11-19T21:14:00Z',
    status: 'ANOMALY',
    anomalyScore: 0.884,
    primaryFinding: 'Self-hosted unverified runner introduced in release job',
    severity: 'high',
    jobCount: 4,
    stepCount: 22,
  },
  {
    isMockData: true,
    id: 'anlyz-9802',
    filename: 'ci.yml',
    repo: 'acme-corp/web-portal',
    timestamp: '2026-11-19T20:45:00Z',
    status: 'NORMAL',
    anomalyScore: 0.112,
    primaryFinding: 'Structural pattern conforms to standard multi-stage test suite',
    severity: 'low',
    jobCount: 3,
    stepCount: 15,
  },
  {
    isMockData: true,
    id: 'anlyz-9803',
    filename: 'security-scan.yml',
    repo: 'acme-corp/auth-service',
    timestamp: '2026-11-19T19:30:00Z',
    status: 'ANOMALY',
    anomalyScore: 0.745,
    primaryFinding: 'Global write-all permissions assigned to pull_request trigger',
    severity: 'high',
    jobCount: 2,
    stepCount: 9,
  },
  {
    isMockData: true,
    id: 'anlyz-9804',
    filename: 'nightly-build.yml',
    repo: 'acme-corp/data-pipeline',
    timestamp: '2026-11-19T18:12:00Z',
    status: 'NORMAL',
    anomalyScore: 0.188,
    primaryFinding: 'Scheduled cron execution matches baseline architecture',
    severity: 'low',
    jobCount: 5,
    stepCount: 28,
  },
  {
    isMockData: true,
    id: 'anlyz-9805',
    filename: 'deploy-staging.yml',
    repo: 'acme-corp/api-gateway',
    timestamp: '2026-11-19T16:50:00Z',
    status: 'ANOMALY',
    anomalyScore: 0.620,
    primaryFinding: 'New unpinned third-party action referenced outside verified organization',
    severity: 'medium',
    jobCount: 2,
    stepCount: 12,
  },
  {
    isMockData: true,
    id: 'anlyz-9806',
    filename: 'lint-and-format.yml',
    repo: 'acme-corp/frontend-shared',
    timestamp: '2026-11-19T15:20:00Z',
    status: 'NORMAL',
    anomalyScore: 0.082,
    primaryFinding: 'Clean structural verification without privilege changes',
    severity: 'low',
    jobCount: 1,
    stepCount: 6,
  },
];
