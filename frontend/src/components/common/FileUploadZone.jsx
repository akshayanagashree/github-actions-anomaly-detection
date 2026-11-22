import React, { useState, useRef } from 'react';
import { UploadCloud, FileCode, CheckCircle2, AlertCircle, X, HardDrive } from 'lucide-react';
import { validateWorkflowFile, formatFileSize } from '../../utils/fileValidators';
import Badge from './Badge';

/**
 * Reusable File Upload Dropzone.
 * Handles drag-and-drop, manual selection, client validation, and file preview.
 */
export default function FileUploadZone({
  id = 'file-upload',
  label = 'Upload Workflow File',
  description = 'Supports GitHub Actions workflow definitions (.yml, .yaml)',
  selectedFile = null,
  onFileSelect,
  onFileRemove,
  disabled = false,
  isOptional = false,
  error = null,
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const displayError = error || localError;

  // Process and validate selected file
  const handleFiles = (files) => {
    if (disabled) return;
    setLocalError(null);

    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateWorkflowFile(file);

    if (!validation.isValid) {
      setLocalError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (onFileSelect) {
      onFileSelect(file, validation.details);
    }
  };

  // Drag and Drop event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileRemove) onFileRemove();
  };

  return (
    <div className="space-y-2">
      {/* Zone Label & Optional Tag */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-200">
          {label}
        </label>
        {isOptional ? (
          <span className="text-[11px] text-slate-500 font-medium">Optional Baseline</span>
        ) : (
          <span className="text-[11px] text-blue-400 font-medium">Required (.yml, .yaml)</span>
        )}
      </div>

      {/* Drop Area Container */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-slate-800'
              : isDragActive
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
              : displayError
              ? 'border-rose-500/60 bg-rose-500/5 hover:border-rose-500'
              : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900'
          }`}
        >
          <input
            ref={fileInputRef}
            id={id}
            type="file"
            accept=".yml,.yaml"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
            data-testid={`file-input-${id}`}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
                isDragActive
                  ? 'bg-blue-600 text-white border-blue-400 scale-110'
                  : 'bg-slate-800/80 text-blue-400 border-slate-700'
              }`}
            >
              <UploadCloud className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-200">
                <span className="text-blue-400 font-semibold underline decoration-blue-500/40 underline-offset-2">
                  Click to browse
                </span>{' '}
                or drag & drop workflow YAML here
              </p>
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
              <span>Max size: 1 MB</span>
              <span>&bull;</span>
              <span>Format: .github/workflows/*.yml</span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card Preview */
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
              <FileCode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-white truncate">
                  {selectedFile.name}
                </p>
                <Badge variant="success" size="sm" dot>
                  Validated
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {formatFileSize(selectedFile.size)} &bull; {selectedFile.type || 'text/yaml'}
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 flex-shrink-0"
              title="Remove File"
              aria-label="Remove File"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Validation Error Banner */}
      {displayError && (
        <div className="flex items-start space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Validation Error</p>
            <p className="mt-0.5 text-rose-300">{displayError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
