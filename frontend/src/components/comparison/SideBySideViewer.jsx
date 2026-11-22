import React from 'react';
import { Columns, FileCode, CheckCircle2 } from 'lucide-react';
import Badge from '../common/Badge';

/**
 * SideBySideViewer provides a synchronized dual-pane inspection
 * between baseline workflow code blocks and modified target blocks.
 */
export default function SideBySideViewer({
  baselineFilename = 'baseline.yml',
  modifiedFilename = 'modified.yml',
  blocks = [],
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Columns className="h-4 w-4 text-blue-400" />
          <h4 className="text-sm font-bold text-white">Side-by-Side Structural Inspection</h4>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {blocks.length} structural sections
        </span>
      </div>

      {/* Synchronized Columns Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 text-xs font-mono font-semibold">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
          <FileCode className="h-4 w-4 text-emerald-400" />
          <span>Baseline: {baselineFilename}</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-300">
          <FileCode className="h-4 w-4 text-blue-400" />
          <span>Target: {modifiedFilename}</span>
        </div>
      </div>

      {/* Structural Block Comparison Pairs */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div
            key={index}
            className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60"
          >
            {/* Section label */}
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 font-mono">
                {block.section}
              </span>
              {block.status === 'modified' ? (
                <Badge variant="warning" size="sm">
                  ~ Structural Diff
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  = Identical
                </Badge>
              )}
            </div>

            {/* Side-by-side pre blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs font-mono">
              {/* Baseline side */}
              <div className="p-3.5 overflow-x-auto bg-slate-950 text-slate-400 leading-relaxed">
                <pre>{block.baseline}</pre>
              </div>

              {/* Modified side */}
              <div
                className={`p-3.5 overflow-x-auto leading-relaxed ${
                  block.status === 'modified'
                    ? 'bg-blue-950/20 text-slate-200'
                    : 'bg-slate-950 text-slate-400'
                }`}
              >
                <pre>{block.modified}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
