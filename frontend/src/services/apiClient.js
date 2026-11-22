import axios from 'axios';

/**
 * Central Axios HTTP client.
 * Configured with base URL from environment variable and standardized error interceptor.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout for ML inference
});

// Response interceptor for consistent error normalization matching Partner A's ErrorResponse
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network error occurred.';

    if (error.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      message = `Cannot reach backend at ${API_BASE_URL}. Ensure FastAPI is running via 'python -m uvicorn backend.app.main:app --port 8000'.`;
    } else if (error.message) {
      message = error.message;
    }

    const customError = {
      message,
      status: error.response?.status || null,
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      raw: error,
    };
    return Promise.reject(customError);
  }
);

export default apiClient;
