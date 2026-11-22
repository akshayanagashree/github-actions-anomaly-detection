import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  ArrowLeft,
  GitCompare,
  Upload,
  Clock,
  Cpu,
  Hash,
  Sparkles,
  GitBranch,
  Layers,
  AlertTriangle,
} from 'lucide-react';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import ScoreMeter from '../components/results/ScoreMeter';
import StructuralFeaturesCard from '../components/results/StructuralFeaturesCard';
import FindingsTable from '../components/results/FindingsTable';
import RecommendationsCard from '../components/results/RecommendationsCard';
import { formatDate } from '../utils/formatters';

import { MOCK_ANOMALY_RESULT, MOCK_NORMAL_RESULT } from '../data/mockResults';

export default function ResultsPage({ selectedAnalysis, onNavigate }) {
  const [activeFixture, setActiveFixture] = useState('anomaly');

  const currentResult =
    selectedAnalysis ||
    (activeFixture === 'anomaly' ? MOCK_ANOMALY_RESULT : MOCK_NORMAL_RESULT);

  const isAnomaly =
    currentResult.classification?.toLowerCase() === 'anomalous' ||
    currentResult.classification === 'ANOMALY' ||
    currentResult.is_anomaly;

  // Normalized structural features adapter
  const normalizedFeatures = (() => {
    if (currentResult.structural_features) {
      return currentResult.structural_features;
    }
    const ws = currentResult.workflow_summary || {};
    const ef = currentResult.extracted_features || {};
    return {
      job_count: ws.total_jobs ?? ef.job_count ?? 1,
      step_count: ws.total_steps ?? ef.step_count ?? 1,
      runner_types: ws.runners?.length ? ws.runners : (ws.has_self_hosted_runner ? ['self-hosted'] : ['ubuntu-latest']),
      external_actions: (ef.total_actions_count ? [`${ef.total_actions_count} external action(s) referenced`] : ['actions/checkout@v4']),
      triggers: ws.triggers?.length ? ws.triggers : ['push'],
      has_dangerous_permissions: ws.has_broad_write_permissions ?? (ef.has_broad_write_permissions > 0),
      permissions_summary: ws.has_broad_write_permissions ? 'write-all (Broad write privileges)' : 'Scoped token permissions (Least privilege)',
      has_self_hosted_runner: ws.has_self_hosted_runner ?? (ef.has_self_hosted_runner > 0),
      has_pull_request_target: (ef.has_pull_request_target || 0) > 0,
      environment_variables_count: ef.environment_count || 0,
    };
  })();

  // Normalized findings adapter
  const normalizedFindings = (() => {
    const list = [];

    // 1. Top statistical deviations from Isolation Forest
    if (currentResult.top_contributing_deviations && Array.isArray(currentResult.top_contributing_deviations)) {
      currentResult.top_contributing_deviations.forEach((dev, idx) => {
        list.push({
          id: `dev-${idx}`,
          severity: Math.abs(dev.z_score) > 1.8 ? 'CRITICAL' : 'WARNING',
          category: 'Statistical Outlier',
          source_type: 'ML_DETECTION',
          title: `Deviating Feature: ${dev.feature}`,
          message: `${dev.description} (Observed: ${dev.value}, z-score: ${dev.z_score})`,
          priority: Math.abs(dev.z_score) > 1.8 ? 'Immediate' : 'High',
        });
      });
    }

    // 2. High-level findings
    if (currentResult.findings && Array.isArray(currentResult.findings)) {
      currentResult.findings.forEach((finding, idx) => {
        if (typeof finding === 'string') {
          list.push({
            id: `find-${idx}`,
            severity: finding.toLowerCase().includes('critical')
              ? 'CRITICAL'
              : finding.toLowerCase().includes('high')
              ? 'WARNING'
              : 'INFO',
            category: 'Workflow Characteristic',
            source_type: 'RULE_FINDING',
            title: 'Structural Observation',
            message: finding,
            priority: 'Medium',
          });
        } else if (typeof finding === 'object') {
          list.push(finding);
        }
      });
    }

    return list;
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dev Mode & Fixture Switcher Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Analysis Results Telemetry:</strong> Displaying structural AST and Isolation Forest ML inference metrics.
          </span>
        </div>

        {/* Fixture switcher when no custom file was uploaded */}
        {!selectedAnalysis && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-slate-400 text-[11px]">Inspect Fixture:</span>
            <button
              onClick={() => setActiveFixture('anomaly')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeFixture === 'anomaly'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Anomaly Case
            </button>
            <button
              onClick={() => setActiveFixture('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeFixture === 'normal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Normal Case
            </button>
          </div>
        )}
      </div>

      {/* Main Metadata Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-xl border flex-shrink-0 ${
                isAnomaly
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              }`}
            >
              {isAnomaly ? <ShieldAlert className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {currentResult.filename}
                </h2>
                {isAnomaly ? (
                  <Badge variant="danger" dot size="md">
                    Anomaly Detected
                  </Badge>
                ) : (
                  <Badge variant="success" dot size="md">
                    Normal Workflow
                  </Badge>
                )}
                {currentResult.has_baseline && (
                  <Badge variant="info" size="sm">
                    Baseline Paired: {currentResult.baseline_filename}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mt-2">
                <span className="flex items-center space-x-1">
                  <Hash className="h-3.5 w-3.5 text-blue-400" />
                  <span>ID: {currentResult.analysis_id}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{formatDate(currentResult.created_at || currentResult.timestamp)}</span>
                </span>
                <span className="flex items-center space-x-1 text-slate-300">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Model: {currentResult.model_type || 'IsolationForest'} (v{currentResult.model_version || '1.0.0'})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            {currentResult.has_baseline && (
              <button
                onClick={() => onNavigate && onNavigate('comparison')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium transition-colors border border-indigo-500/40"
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>View AST Diff</span>
              </button>
            )}
            <button
              onClick={() => onNavigate && onNavigate('upload')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* Anomaly Score Gauge & Calibration Section */}
        <ScoreMeter
          score={currentResult.anomaly_score}
          threshold={currentResult.threshold || 0.5373}
          interpretation={currentResult.score_interpretation}
          isAnomaly={isAnomaly}
        />
      </div>

      {/* Two Column Layout: Structural Features & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: AST Features */}
        <div className="space-y-6">
          <StructuralFeaturesCard features={normalizedFeatures} />
        </div>

        {/* Right Column: Findings & Rule Policy Detections */}
        <div className="space-y-6">
          <FindingsTable findings={normalizedFindings} />
          <RecommendationsCard
            recommendations={currentResult.recommendations || []}
            warnings={currentResult.warnings || []}
          />
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <button
          onClick={() => onNavigate && onNavigate('history')}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View Telemetry History &rarr;
        </button>
      </div>
    </div>
  );
}
