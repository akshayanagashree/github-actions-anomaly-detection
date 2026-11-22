import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  BrainCircuit,
  Binary,
  CheckCircle2,
} from 'lucide-react';
import Badge from '../common/Badge';

/**
 * FindingsTable renders structural findings and clearly distinguishes
 * statistical ML anomaly predictions from rule-based policy detections.
 */
export default function FindingsTable({ findings = [] }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-white">No Structural Vulnerabilities Detected</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The workflow satisfies security best practices with no unverified runners or elevated permissions.
        </p>
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <Badge variant="danger" size="sm" dot>
            Critical
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="danger" size="sm" dot>
            High
          </Badge>
        );
      case 'WARNING':
      case 'MEDIUM':
        return (
          <Badge variant="warning" size="sm" dot>
            Warning
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="neutral" size="sm">
            Low
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge variant="info" size="sm">
            Info
          </Badge>
        );
    }
  };

  const getSourceBadge = (sourceType) => {
    if (sourceType === 'ML_DETECTION') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
          <BrainCircuit className="h-3 w-3" />
          <span>ML Statistical Anomaly</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
        <Binary className="h-3 w-3" />
        <span>AST Structural Rule</span>
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Structural Findings & Detections</h4>
            <p className="text-[11px] text-slate-400">
              Evaluations categorized by ML model inference and structural AST rules
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {findings.length} findings identified
        </span>
      </div>

      <div className="space-y-3">
        {findings.map((finding) => (
          <div
            key={finding.id || finding.title}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                {getSeverityBadge(finding.severity)}
                {getSourceBadge(finding.source_type)}
                <span className="text-xs text-slate-400 font-mono">
                  [{finding.category}]
                </span>
              </div>
              {finding.priority && (
                <span className="text-[11px] font-mono text-slate-400">
                  Priority:{' '}
                  <strong className="text-slate-200">{finding.priority}</strong>
                </span>
              )}
            </div>

            <div>
              <h5 className="text-sm font-semibold text-white">{finding.title}</h5>
              <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                {finding.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
