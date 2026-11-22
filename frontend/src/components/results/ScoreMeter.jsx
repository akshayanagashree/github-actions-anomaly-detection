import React from 'react';
import { AlertTriangle, ShieldCheck, HelpCircle, Activity } from 'lucide-react';
import { formatScore } from '../../utils/formatters';

/**
 * ScoreMeter displays the ML anomaly score relative to the decision threshold.
 * Clearly states that scores are raw structural distance metrics, not probabilities.
 */
export default function ScoreMeter({
  score,
  threshold = 0.500,
  interpretation,
  isAnomaly,
}) {
  const numericScore = typeof score === 'number' ? score : 0;
  const clampedScore = Math.min(Math.max(numericScore, 0), 1);
  const percentage = Math.round(clampedScore * 100);
  const thresholdPercentage = Math.round(threshold * 100);

  const getScoreColor = () => {
    if (numericScore >= 0.75) return 'text-rose-400';
    if (numericScore >= threshold) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getBarColor = () => {
    if (numericScore >= 0.75) return 'bg-rose-500 shadow-rose-500/30';
    if (numericScore >= threshold) return 'bg-amber-500 shadow-amber-500/30';
    return 'bg-emerald-500 shadow-emerald-500/30';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">ML Structural Anomaly Score</h4>
            <p className="text-[11px] text-slate-400">
              Statistical distance from learned standard workflow topology
            </p>
          </div>
        </div>

        {/* Score readout */}
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${getScoreColor()}`}>
            {formatScore(score)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Threshold: {formatScore(threshold)}
          </div>
        </div>
      </div>

      {/* Progress / Gauge Meter */}
      <div className="space-y-1.5">
        <div className="relative w-full h-3.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          {/* Threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${thresholdPercentage}%` }}
            title={`Threshold: ${threshold}`}
          />
          {/* Score fill */}
          <div
            className={`h-full rounded-full transition-all duration-500 shadow-lg ${getBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Meter Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>0.00 (Normal Baseline)</span>
          <span className="text-slate-400 font-semibold">
            &Delta; Threshold ({formatScore(threshold)})
          </span>
          <span>1.00 (Max Deviation)</span>
        </div>
      </div>

      {/* Score Interpretation & Disclaimer Box */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
        <div className="flex items-start space-x-2">
          {isAnomaly ? (
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {interpretation ||
              (isAnomaly
                ? 'Workflow structural metrics exceed learned normal bounds.'
                : 'Workflow structure falls within baseline normal distribution.')}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 italic pl-6">
          * Note: Anomaly scores quantify structural feature variance; they do not represent calibrated probability or intent.
        </p>
      </div>
    </div>
  );
}
