/**
 * Utility functions for formatting dates, numbers, and anomaly indicators.
 */

export function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return 'N/A';
  return Number(score).toFixed(3);
}

export function getAnomalySeverity(score, threshold = 0.5373) {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 0.75) return 'high';
  if (score >= threshold) return 'medium';
  return 'low';
}
