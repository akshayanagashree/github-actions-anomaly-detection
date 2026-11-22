import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * RecommendationsCard displays actionable security hardening steps
 * and AST configuration warnings.
 */
export default function RecommendationsCard({
  recommendations = [],
  warnings = [],
}) {
  return (
    <div className="space-y-6">
      {/* Actionable Recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Recommended Security Actions</h4>
            <p className="text-[11px] text-slate-400">
              Hardening guidelines to align workflow with CI/CD security standards
            </p>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-2.5">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start space-x-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No remediation steps required.</p>
        )}
      </div>

      {/* Configuration Warnings */}
      {warnings.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-lg space-y-3">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <h4 className="text-sm font-bold">Workflow Warnings ({warnings.length})</h4>
          </div>
          <div className="space-y-2">
            {warnings.map((warn, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed"
              >
                {warn}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
