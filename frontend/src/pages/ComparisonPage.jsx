import React, { useState } from 'react';
import {
  GitCompare,
  ArrowLeft,
  Upload,
  Layers,
  Columns,
  ListTree,
  ShieldAlert,
  Info,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import DiffSummaryBar from '../components/comparison/DiffSummaryBar';
import StructuredDiffSection from '../components/comparison/StructuredDiffSection';
import SideBySideViewer from '../components/comparison/SideBySideViewer';

import { MOCK_COMPARISON_SCENARIOS } from '../data/mockComparison';

export default function ComparisonPage({ selectedAnalysis, onNavigate }) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('drift');
  const [viewMode, setViewMode] = useState('categorized'); // 'categorized' | 'side-by-side' | 'combined'

  // Live differences adapter for real FastAPI paired analysis
  const liveScenario = (() => {
    if (!selectedAnalysis?.has_baseline || !selectedAnalysis?.structural_differences) return null;
    const diffs = selectedAnalysis.structural_differences || [];
    const cs = selectedAnalysis.comparison_summary || {};

    return {
      id: 'live-paired-analysis',
      name: 'Live Paired Workflow Comparison',
      description: 'Real-time structural AST diff generated from uploaded workflow and baseline.',
      baselineFilename: selectedAnalysis.baseline_filename || 'baseline.yml',
      modifiedFilename: selectedAnalysis.filename || 'modified.yml',
      summary: {
        totalChanges: cs.total_changes ?? diffs.length,
        additionsCount: (cs.jobs_added || 0) + (cs.steps_added || 0),
        removalsCount: (cs.jobs_removed || 0) + (cs.steps_removed || 0),
        modificationsCount:
          (cs.permissions_changed || 0) +
          (cs.runners_changed || 0) +
          (cs.triggers_changed || 0) +
          (cs.steps_modified || 0) +
          (cs.actions_changed || 0) +
          (cs.environments_changed || 0),
      },
      structuralDifferences: {
        jobs: {
          added: diffs.filter((d) => d.category === 'job_addition').map((d) => d.modified_value || d.location),
          removed: diffs.filter((d) => d.category === 'job_removal').map((d) => d.baseline_value || d.location),
          modified: diffs
            .filter((d) => d.category === 'job_configuration')
            .map((d) => ({ name: d.location, change: d.description, severity: d.severity })),
        },
        steps: {
          added: diffs.filter((d) => d.category === 'step_addition').map((d) => d.description || d.modified_value),
          removed: diffs.filter((d) => d.category === 'step_removal').map((d) => d.description || d.baseline_value),
          modified: diffs
            .filter((d) => d.category === 'step_modification')
            .map((d) => ({ step: d.location, change: d.description, severity: d.severity })),
        },
        permissions: diffs
          .filter((d) => d.category === 'permission_change')
          .map((d) => ({
            scope: d.location,
            before: String(d.baseline_value ?? 'None'),
            after: String(d.modified_value ?? 'None'),
            severity: d.severity,
            note: d.description,
          })),
        runners: diffs
          .filter((d) => d.category === 'runner_change')
          .map((d) => ({
            job: d.location,
            before: String(d.baseline_value ?? 'Standard'),
            after: String(d.modified_value ?? 'Modified'),
            severity: d.severity,
            note: d.description,
          })),
        triggers: diffs
          .filter((d) => d.category === 'trigger_change')
          .map((d) => ({
            trigger: d.location,
            change: d.description,
            severity: d.severity,
          })),
        dependencies: diffs
          .filter((d) => d.category === 'dependency_change')
          .map((d) => ({
            job: d.location,
            change: d.description,
          })),
        externalActions: diffs
          .filter((d) => d.category === 'action_change')
          .map((d) => ({
            action: d.location,
            status: d.baseline_value ? 'MODIFIED' : 'ADDED',
            change: d.description,
            severity: d.severity,
          })),
        environment: diffs
          .filter((d) => d.category === 'environment_change')
          .map((d) => ({
            name: d.location,
            job: 'Workflow Environment',
            change: d.description,
            severity: d.severity,
          })),
      },
      blocks: [
        {
          section: 'Structural AST Differences Log',
          baseline: `Baseline Workflow: ${selectedAnalysis.baseline_filename || 'baseline.yml'}\nReference AST topology verified.`,
          modified: diffs
            .map((d) => `[${d.severity?.toUpperCase()}] ${d.category} at ${d.location}:\n${d.description}`)
            .join('\n\n'),
          status: 'modified',
        },
      ],
    };
  })();

  const activeScenario =
    liveScenario ||
    MOCK_COMPARISON_SCENARIOS[selectedScenarioKey] ||
    MOCK_COMPARISON_SCENARIOS.drift;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dev Mode & Live Telemetry Notice */}
      {liveScenario ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>Live Comparison Active:</strong> Showing real-time AST structural differences for run{' '}
              <code>{selectedAnalysis.analysis_id}</code>.
            </span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('results')}
            className="text-xs underline hover:text-white"
          >
            View Full Analysis
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs gap-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Comparison Engine:</strong> Evaluating structural differences between baseline AST and modified workflow targets.
            </span>
          </div>
        </div>
      )}

      {/* Quantitative Summary Bar & Identity Header */}
      <DiffSummaryBar
        baselineFilename={activeScenario.baselineFilename}
        modifiedFilename={activeScenario.modifiedFilename}
        summary={activeScenario.summary}
        selectedScenario={selectedScenarioKey}
        onScenarioChange={!liveScenario ? setSelectedScenarioKey : null}
      />

      {/* Security Context & Integrity Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Objective Structural Differentiation</p>
          <p className="text-slate-400 leading-relaxed">
            Structural modifications represent differences relative to the designated baseline workflow. Changes may indicate legitimate architectural features, library refactoring, or unexpected structural drift. Visual differences must be reviewed in context.
          </p>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('categorized')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'categorized'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ListTree className="h-3.5 w-3.5" />
            <span>Categorized AST Diffs</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Side-by-Side Dual Pane</span>
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'combined'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All-in-One View</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate && onNavigate('upload')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Custom Baseline</span>
          </button>
        </div>
      </div>

      {/* Main Diff Content Display */}
      {(viewMode === 'categorized' || viewMode === 'combined') && (
        <StructuredDiffSection differences={activeScenario.structuralDifferences} />
      )}

      {(viewMode === 'side-by-side' || viewMode === 'combined') && (
        <SideBySideViewer
          baselineFilename={activeScenario.baselineFilename}
          modifiedFilename={activeScenario.modifiedFilename}
          blocks={activeScenario.blocks}
        />
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate && onNavigate('results')}
          className="flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <span>View Machine Learning Results</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
