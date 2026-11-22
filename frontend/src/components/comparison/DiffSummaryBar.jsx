import React from 'react';
import { PlusCircle, MinusCircle, RefreshCw, FileCode, ArrowRight, GitCompare } from 'lucide-react';

/**
 * DiffSummaryBar renders quantitative change statistics (additions, removals, modifications)
 * and file version headers for structural workflow comparisons.
 */
export default function DiffSummaryBar({
  baselineFilename = 'baseline.yml',
  modifiedFilename = 'modified.yml',
  summary = {},
  selectedScenario = 'drift',
  onScenarioChange,
}) {
  const {
    totalChanges = 0,
    additionsCount = 0,
    removalsCount = 0,
    modificationsCount = 0,
  } = summary;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* File Comparison Identity Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Structural AST Comparison
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
              <span className="text-slate-300 font-semibold">{baselineFilename}</span>
              <span className="text-slate-500 font-sans">(Baseline)</span>
              <ArrowRight className="h-3 w-3 text-blue-400" />
              <span className="text-blue-400 font-semibold">{modifiedFilename}</span>
              <span className="text-slate-500 font-sans">(Modified Target)</span>
            </div>
          </div>
        </div>

        {/* Scenario Switcher for Demo */}
        {onScenarioChange && (
          <div className="flex items-center space-x-2 self-start md:self-auto text-xs">
            <span className="text-slate-400 text-[11px]">Diff Scenario:</span>
            <button
              onClick={() => onScenarioChange('drift')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedScenario === 'drift'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Runner & Privilege Shift
            </button>
            <button
              onClick={() => onScenarioChange('maintenance')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedScenario === 'maintenance'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Routine Upgrade
            </button>
          </div>
        )}
      </div>

      {/* Quantitative Change Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Total Diffs
            </span>
            <span className="text-xl font-mono font-bold text-white mt-0.5 block">
              {totalChanges}
            </span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-xs font-semibold">
            &Delta;
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
              Additions
            </span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">
              +{additionsCount}
            </span>
          </div>
          <PlusCircle className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider block">
              Removals
            </span>
            <span className="text-xl font-mono font-bold text-rose-400 mt-0.5 block">
              -{removalsCount}
            </span>
          </div>
          <MinusCircle className="h-5 w-5 text-rose-400" />
        </div>

        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">
              Modifications
            </span>
            <span className="text-xl font-mono font-bold text-amber-400 mt-0.5 block">
              ~{modificationsCount}
            </span>
          </div>
          <RefreshCw className="h-5 w-5 text-amber-400" />
        </div>
      </div>
    </div>
  );
}
