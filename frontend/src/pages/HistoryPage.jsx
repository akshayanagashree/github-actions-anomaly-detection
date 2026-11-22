import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  FileCode,
  ArrowRight,
  GitCompare,
  AlertCircle,
  Database,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import { getHistory, getResultById } from '../services/analysisService';
import { formatDate, formatScore } from '../utils/formatters';
import { MOCK_RECENT_ANALYSES } from '../data/mockData';

export default function HistoryPage({ onNavigate, onSelectAnalysis }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoData, setIsDemoData] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('ALL'); // 'ALL' | 'ANOMALOUS' | 'NORMAL' | 'PAIRED'

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHistory(50, 0);
      if (data.items && data.items.length > 0) {
        setHistoryItems(data.items);
        setTotalCount(data.total);
        setIsDemoData(false);
      } else {
        // Backend DB is operational but empty
        setHistoryItems([]);
        setTotalCount(0);
        setIsDemoData(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analysis history from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleInspect = async (item) => {
    try {
      if (item.isMockData) {
        if (onSelectAnalysis) onSelectAnalysis(item);
        if (onNavigate) onNavigate('results');
        return;
      }

      // Fetch full AnalysisResponse by ID from backend
      const fullResult = await getResultById(item.analysis_id);
      if (onSelectAnalysis) onSelectAnalysis(fullResult);
      if (onNavigate) onNavigate('results');
    } catch (err) {
      alert(`Failed to load details for ${item.analysis_id}: ${err.message}`);
    }
  };

  const handleLoadDemoData = () => {
    setHistoryItems(
      MOCK_RECENT_ANALYSES.map((item) => ({
        analysis_id: item.id,
        filename: item.filename,
        has_baseline: false,
        baseline_filename: null,
        status: 'success',
        anomaly_score: item.anomalyScore,
        classification: item.status.toLowerCase(),
        score_interpretation: item.primaryFinding,
        total_jobs: item.jobCount,
        total_steps: item.stepCount,
        total_differences: 0,
        high_severity_differences: item.severity === 'high' ? 1 : 0,
        created_at: item.timestamp,
        isMockData: true,
      }))
    );
    setTotalCount(MOCK_RECENT_ANALYSES.length);
    setIsDemoData(true);
    setError(null);
  };

  // Client-side filtering of retrieved history items
  const filteredItems = historyItems.filter((item) => {
    const matchesSearch =
      (item.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.analysis_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (classificationFilter === 'ANOMALOUS') {
      return (
        item.classification?.toLowerCase() === 'anomalous' ||
        item.classification?.toLowerCase() === 'anomaly'
      );
    }
    if (classificationFilter === 'NORMAL') {
      return item.classification?.toLowerCase() === 'normal';
    }
    if (classificationFilter === 'PAIRED') {
      return item.has_baseline === true;
    }

    return true;
  });

  const columns = [
    {
      key: 'filename',
      header: 'Workflow Target',
      render: (filename, row) => (
        <div className="flex items-center space-x-2.5">
          <div
            className={`p-1.5 rounded-md ${
              row.classification?.toLowerCase().includes('anom')
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <FileCode className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-200 block">{filename}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              ID: {row.analysis_id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (val) => (
        <span className="text-slate-400 text-xs font-mono">{formatDate(val)}</span>
      ),
    },
    {
      key: 'classification',
      header: 'Verdict',
      render: (val, row) => {
        const isAnom =
          val?.toLowerCase() === 'anomalous' || val?.toLowerCase() === 'anomaly';
        return isAnom ? (
          <Badge variant="danger" size="sm" dot>
            Anomalous
          </Badge>
        ) : (
          <Badge variant="success" size="sm" dot>
            Normal
          </Badge>
        );
      },
    },
    {
      key: 'anomaly_score',
      header: 'Anomaly Score',
      align: 'right',
      render: (score, row) => {
        const isAnom =
          row.classification?.toLowerCase() === 'anomalous' ||
          row.classification?.toLowerCase() === 'anomaly';
        return (
          <div className="flex flex-col items-end">
            <span
              className={`font-mono font-bold text-xs ${
                isAnom ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatScore(score)}
            </span>
            <span className="text-[10px] text-slate-500">Threshold: 0.537</span>
          </div>
        );
      },
    },
    {
      key: 'structural',
      header: 'Structure',
      render: (_, row) => (
        <span className="text-xs font-mono text-slate-400">
          {row.total_jobs} jobs &bull; {row.total_steps} steps
        </span>
      ),
    },
    {
      key: 'has_baseline',
      header: 'Comparison',
      render: (hasBaseline, row) =>
        hasBaseline ? (
          <span className="inline-flex items-center space-x-1 text-xs text-blue-400 font-mono">
            <GitCompare className="h-3 w-3" />
            <span>{row.total_differences} diffs</span>
          </span>
        ) : (
          <span className="text-slate-500 text-xs font-mono">Single file</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => (
        <button
          onClick={() => handleInspect(row)}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700"
        >
          <span>Inspect</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Notice & Demo Indicator */}
      {isDemoData && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
          <span>
            <strong>Demo Telemetry Mode:</strong> Displaying sample fixtures because database history was empty. Uploading workflow files will store real historical runs.
          </span>
          <button
            onClick={fetchHistory}
            className="underline font-semibold hover:text-white ml-2"
          >
            Switch to Live DB
          </button>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Analysis Audit History
              </h3>
              <p className="text-xs text-slate-400">
                Persistent telemetry log from FastAPI SQLite database ({totalCount} total runs)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Refresh History"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate && onNavigate('upload')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Analyze New Workflow</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by filename or analysis ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
            />
          </div>

          {/* Classification Filters */}
          <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setClassificationFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                classificationFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Runs
            </button>
            <button
              onClick={() => setClassificationFilter('ANOMALOUS')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                classificationFilter === 'ANOMALOUS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Anomalous Only
            </button>
            <button
              onClick={() => setClassificationFilter('NORMAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                classificationFilter === 'NORMAL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Normal Only
            </button>
            <button
              onClick={() => setClassificationFilter('PAIRED')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                classificationFilter === 'PAIRED'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              With Baseline
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Backend Connection Issue</p>
            <p className="text-rose-300/90">{error}</p>
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={fetchHistory}
                className="underline font-semibold hover:text-white"
              >
                Retry Connection
              </button>
              <button
                onClick={handleLoadDemoData}
                className="underline font-semibold text-amber-300 hover:text-white"
              >
                Load Offline Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      {isLoading ? (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading analysis records from FastAPI...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <Table
          columns={columns}
          data={filteredItems}
          keyField="analysis_id"
          onRowClick={(row) => handleInspect(row)}
        />
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">No Analysis Records Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery || classificationFilter !== 'ALL'
                ? 'No past analysis runs matched your current query or filter criteria.'
                : 'The backend database currently has no saved analysis runs. Upload a workflow YAML to generate initial structural telemetry.'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => onNavigate && onNavigate('upload')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
            >
              Upload Workflow
            </button>
            <button
              onClick={handleLoadDemoData}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              Load Demo Fixtures
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
