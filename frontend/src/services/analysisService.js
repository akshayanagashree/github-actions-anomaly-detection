import apiClient from './apiClient';

/**
 * Service handling workflow upload, structural anomaly detection,
 * historical query, and service health checks.
 *
 * Implements real FastAPI backend communication according to docs/api_contract.md.
 */

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

/**
 * Uploads a target workflow YAML (and optional baseline YAML) for analysis via multipart/form-data.
 *
 * @param {File} targetFile - The primary GitHub Actions workflow file.
 * @param {File|null} baselineFile - Optional baseline workflow file for structural comparison.
 * @param {Function} onProgress - Optional callback for upload progress percentages.
 * @returns {Promise<Object>} AnalysisResponse matching FastAPI schema.
 */
export async function analyzeWorkflow(targetFile, baselineFile = null, onProgress = null) {
  if (!targetFile) {
    throw new Error('Target workflow file is required.');
  }

  // If mock mode is explicitly activated in .env
  if (USE_MOCK_DATA) {
    return simulateMockAnalysis(targetFile, baselineFile, onProgress);
  }

  // REAL API INTEGRATION: POST /api/analyze
  const formData = new FormData();
  formData.append('file', targetFile);
  if (baselineFile) {
    formData.append('baseline_file', baselineFile);
  }

  const response = await apiClient.post('/api/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
}

/**
 * Retrieves paginated historical analysis records from backend SQLite database.
 *
 * @param {number} limit - Maximum number of records to return.
 * @param {number} offset - Pagination offset.
 * @returns {Promise<Object>} HistoryResponse { items: [], total, limit, offset }
 */
export async function getHistory(limit = 50, offset = 0) {
  if (USE_MOCK_DATA) {
    return {
      items: [],
      total: 0,
      limit,
      offset,
      isDemoData: true,
    };
  }

  const response = await apiClient.get('/api/history', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Fetches complete analysis result, features, differences, and recommendations by ID.
 *
 * @param {string} analysisId - Unique run ID (e.g. ana_2d8b744581cd).
 * @returns {Promise<Object>} AnalysisResponse
 */
export async function getResultById(analysisId) {
  if (!analysisId) {
    throw new Error('Analysis ID is required.');
  }

  const response = await apiClient.get(`/api/results/${analysisId}`);
  return response.data;
}

/**
 * Checks service health, model readiness, and SQLite database connectivity.
 *
 * @returns {Promise<Object>} HealthResponse
 */
export async function checkBackendHealth() {
  try {
    const response = await apiClient.get('/api/health');
    return {
      connected: true,
      data: response.data,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message || 'Backend unreachable',
    };
  }
}

/**
 * Offline simulation helper used ONLY when VITE_USE_MOCK_DATA=true.
 */
function simulateMockAnalysis(targetFile, baselineFile, onProgress) {
  return new Promise((resolve) => {
    if (onProgress) {
      onProgress(35);
      setTimeout(() => onProgress(75), 300);
      setTimeout(() => onProgress(100), 600);
    }

    setTimeout(() => {
      resolve({
        analysis_id: `ana_${Date.now().toString(36)}`,
        filename: targetFile.name,
        status: 'success',
        created_at: new Date().toISOString(),
        has_baseline: Boolean(baselineFile),
        baseline_filename: baselineFile ? baselineFile.name : null,
        workflow_summary: {
          name: targetFile.name.replace(/\.ya?ml$/, ''),
          total_jobs: 2,
          job_ids: ['build', 'deploy'],
          total_steps: 6,
          triggers: ['push'],
          runners: ['ubuntu-latest'],
          permissions: {},
          has_broad_write_permissions: false,
          has_self_hosted_runner: false,
        },
        anomaly_score: 0.285,
        raw_score: 0.412,
        threshold: 0.5373,
        is_anomaly: false,
        classification: 'normal',
        score_interpretation: 'Conforms to baseline patterns (Demo Fixture).',
        model_version: '1.0.0',
        model_type: 'IsolationForest',
        extracted_features: {
          job_count: 2,
          step_count: 6,
        },
        top_contributing_deviations: [],
        structural_differences: null,
        comparison_summary: null,
        findings: ['Demo workflow parsed in offline development mode.'],
        explanations: [],
        warnings: [],
        recommendations: ['Connect live FastAPI backend to run real model inference.'],
      });
    }, 700);
  });
}
