/**
 * File validation utilities for GitHub Actions workflows.
 */

export const MAX_WORKFLOW_FILE_SIZE = 1 * 1024 * 1024; // 1MB Limit matching Partner A FastAPI backend
export const ALLOWED_EXTENSIONS = ['.yml', '.yaml'];

/**
 * Validates whether an uploaded file is a valid YAML workflow within size limits.
 * @param {File} file - The file object from <input> or DataTransfer.
 * @param {number} maxBytes - Maximum allowed size in bytes (default 2MB).
 * @returns {{ isValid: boolean, error: string | null, details: object }}
 */
export function validateWorkflowFile(file, maxBytes = MAX_WORKFLOW_FILE_SIZE) {
  if (!file) {
    return {
      isValid: false,
      error: 'No file selected. Please select a .yml or .yaml file.',
      details: null,
    };
  }

  const filename = file.name || '';
  const lowerName = filename.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `Invalid file extension for "${filename}". Only .yml and .yaml workflow files are supported.`,
      details: { name: filename, size: file.size },
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: `The file "${filename}" is empty (0 bytes). Please upload a valid workflow.`,
      details: { name: filename, size: 0 },
    };
  }

  if (file.size > maxBytes) {
    const formattedMax = formatFileSize(maxBytes);
    const formattedActual = formatFileSize(file.size);
    return {
      isValid: false,
      error: `File size (${formattedActual}) exceeds the maximum allowed limit of ${formattedMax}.`,
      details: { name: filename, size: file.size },
    };
  }

  return {
    isValid: true,
    error: null,
    details: {
      name: filename,
      size: file.size,
      formattedSize: formatFileSize(file.size),
      type: file.type || 'application/x-yaml',
      lastModified: file.lastModified,
    },
  };
}

/**
 * Formats byte values into human-readable strings (B, KB, MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || Number.isNaN(bytes)) return 'N/A';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
