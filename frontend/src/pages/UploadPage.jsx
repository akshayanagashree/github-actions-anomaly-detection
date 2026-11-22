import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  Sparkles,
  GitCompare,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import FileUploadZone from '../components/common/FileUploadZone';
import { analyzeWorkflow } from '../services/analysisService';
import { formatScore } from '../utils/formatters';

export default function UploadPage({ onNavigate, onSelectAnalysis }) {
  // File selections & metadata
  const [targetFile, setTargetFile] = useState(null);
  const [targetFileDetails, setTargetFileDetails] = useState(null);
  const [yamlPreview, setYamlPreview] = useState('');

  // Baseline comparison configuration
  const [enableBaseline, setEnableBaseline] = useState(false);
  const [baselineFile, setBaselineFile] = useState(null);
  const [baselineFileDetails, setBaselineFileDetails] = useState(null);

  // Analysis lifecycle states
  const [status, setStatus] = useState('idle'); // 'idle' | 'analyzing' | 'success' | 'error'
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Read preview lines from selected YAML file
  const loadYamlPreview = (file) => {
    if (!file) {
      setYamlPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || '';
      const previewLines = text.split('\n').slice(0, 16).join('\n');
      setYamlPreview(previewLines);
    };
    reader.readAsText(file.slice(0, 4096)); // Read first 4KB for preview
  };

  const handleTargetSelect = (file, details) => {
    setTargetFile(file);
    setTargetFileDetails(details);
    setError(null);
    setStatus('idle');
    setResult(null);
    loadYamlPreview(file);
  };

  const handleTargetRemove = () => {
    setTargetFile(null);
    setTargetFileDetails(null);
    setYamlPreview('');
    setError(null);
    setStatus('idle');
  };

  const handleBaselineSelect = (file, details) => {
    setBaselineFile(file);
    setBaselineFileDetails(details);
    setError(null);
  };

  const handleBaselineRemove = () => {
    setBaselineFile(null);
    setBaselineFileDetails(null);
  };

  const handleToggleBaseline = () => {
    if (enableBaseline) {
      // disabling baseline comparison
      setEnableBaseline(false);
      setBaselineFile(null);
      setBaselineFileDetails(null);
    } else {
      setEnableBaseline(true);
    }
  };

  const handleReset = () => {
    handleTargetRemove();
    handleBaselineRemove();
    setEnableBaseline(false);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  };

  // Submit file(s) to analysis service
  const handleAnalyze = async () => {
    if (!targetFile) {
      setError('Please select a target GitHub Actions workflow YAML file to analyze.');
      return;
    }

    setStatus('analyzing');
    setProgress(15);
    setStatusStep('Uploading workflow YAML to telemetry pipeline...');
    setError(null);
    setResult(null);

    try {
      // Progress simulation steps for telemetry perception
      setTimeout(() => {
        setProgress(45);
        setStatusStep('Parsing AST workflow structures and trigger hierarchies...');
      }, 350);

      setTimeout(() => {
        setProgress(80);
        setStatusStep('Executing Isolation Forest structural anomaly inference...');
      }, 700);

      const response = await analyzeWorkflow(
        targetFile,
        enableBaseline ? baselineFile : null,
        (percent) => setProgress(percent)
      );

      setProgress(100);
      setStatusStep('Analysis complete.');
      setResult(response);
      setStatus('success');

      if (onSelectAnalysis) {
        onSelectAnalysis(response);
      }
    } catch (err) {
      setStatus('error');
      setError(
        err.message || 'An unexpected error occurred while communicating with the analysis service.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Integration Notice */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-400" />
          <span>
            <strong>FastAPI Service Layer Connected:</strong> Uploaded workflow files are transmitted via multipart <code>FormData</code> to <code>POST /api/analyze</code>. The 30-feature vector extraction and Isolation Forest outlier scoring are performed live.
          </span>
        </div>
      </div>

      {/* Main Upload Card */}
      <Card
        title="Upload GitHub Actions Workflow"
        subtitle="Submit CI/CD workflow YAML files for structural feature extraction and anomaly discovery"
        icon={UploadCloud}
        action={
          targetFile && status !== 'analyzing' && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Form</span>
            </button>
          )
        }
      >
        <div className="space-y-6">
          {/* Target File Upload Zone (Required) */}
          <FileUploadZone
            id="primary-workflow"
            label="Target Workflow File"
            description="The GitHub Actions workflow you wish to inspect (.github/workflows/*.yml)"
            selectedFile={targetFile}
            onFileSelect={handleTargetSelect}
            onFileRemove={handleTargetRemove}
            disabled={status === 'analyzing'}
          />

          {/* Baseline Workflow Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitCompare className="h-4 w-4 text-blue-400" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Baseline Workflow Comparison
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Compare this workflow against a known-safe baseline to discover job, step, and permission diffs.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleBaseline}
                disabled={status === 'analyzing'}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableBaseline ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    enableBaseline ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Baseline File Upload Zone (Conditional) */}
            {enableBaseline && (
              <div className="mt-4 pl-4 border-l-2 border-blue-500/40 space-y-3">
                <FileUploadZone
                  id="baseline-workflow"
                  label="Baseline Workflow File"
                  description="Original or previous workflow version used as the ground truth baseline"
                  selectedFile={baselineFile}
                  onFileSelect={handleBaselineSelect}
                  onFileRemove={handleBaselineRemove}
                  disabled={status === 'analyzing'}
                  isOptional={true}
                />
              </div>
            )}
          </div>

          {/* Quick YAML Syntax Preview Box */}
          {yamlPreview && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5 font-medium text-slate-300">
                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                  <span>YAML Preview (First 16 lines)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {targetFileDetails?.formattedSize}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-48 selection:bg-blue-600 selection:text-white">
                <pre>{yamlPreview}</pre>
              </div>
            </div>
          )}

          {/* Upload & Analysis Progress Bar */}
          {status === 'analyzing' && (
            <div className="space-y-2.5 p-4 rounded-xl bg-slate-950 border border-blue-500/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400 font-medium flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{statusStep || 'Processing workflow...'}</span>
                </span>
                <span className="font-mono text-slate-300 font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {error && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-rose-300">Analysis Request Failed</h5>
                <p className="mt-1 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {status === 'success' && result && (() => {
            const isAnomalyResult =
              result.classification?.toLowerCase() === 'anomalous' ||
              result.classification === 'ANOMALY' ||
              Boolean(result.is_anomaly);

            return (
              <div
                className={`p-5 rounded-xl bg-slate-950 border space-y-4 ${
                  isAnomalyResult ? 'border-rose-500/30' : 'border-emerald-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isAnomalyResult
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isAnomalyResult ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">Analysis Generated Successfully</h4>
                        {isAnomalyResult ? (
                          <Badge variant="danger" dot size="sm">
                            Anomaly Detected
                          </Badge>
                        ) : (
                          <Badge variant="success" dot size="sm">
                            Normal Structure
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Target: <span className="text-slate-200 font-mono">{result.filename}</span> &bull; ID:{' '}
                        <span className="text-blue-400 font-mono">{result.analysis_id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Anomaly Score</span>
                    <span
                      className={`text-lg font-mono font-bold ${
                        isAnomalyResult ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatScore(result.anomaly_score)}
                    </span>
                  </div>
                </div>

                {/* Action buttons on success */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Analyze Another Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('results')}
                    className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span>View Structural Results</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Form Actions Footer */}
          {status !== 'success' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>
                  Validation occurs client-side before submission to the structural analysis pipeline.
                </span>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!targetFile || status === 'analyzing'}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
                  !targetFile || status === 'analyzing'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:shadow-blue-500/40'
                }`}
              >
                {status === 'analyzing' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Analyze Workflow</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
