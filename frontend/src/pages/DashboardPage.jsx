import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Percent,
  Upload,
  ArrowRight,
  TrendingUp,
  FileCode,
  ShieldAlert,
  Clock,
  Sparkles,
  RefreshCw,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import SectionHeader from '../components/common/SectionHeader';
import { formatDate, formatScore } from '../utils/formatters';
import { getHistory, getResultById } from '../services/analysisService';

import {
  MOCK_SYSTEM_METRICS,
  MOCK_ANALYSIS_TRENDS,
  MOCK_ANOMALY_CATEGORIES,
  MOCK_RECENT_ANALYSES,
} from '../data/mockData';

export default function DashboardPage({ onNavigate, onSelectAnalysis }) {
  const [metrics, setMetrics] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [isLiveTelemetry, setIsLiveTelemetry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch telemetry from backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await getHistory(10, 0);
      if (data.items && data.items.length > 0) {
        const total = data.total || data.items.length;
        const anomalousCount = data.items.filter(
          (i) => i.classification?.toLowerCase() === 'anomalous'
        ).length;
        const normalCount = total - anomalousCount;
        const anomalyPct = total > 0 ? ((anomalousCount / total) * 100).toFixed(1) : 0;

        setMetrics({
          totalAnalyzed: total,
          normalWorkflows: normalCount,
          potentialAnomalies: anomalousCount,
          anomalyPercentage: anomalyPct,
        });
        setRecentRuns(data.items);
        setIsLiveTelemetry(true);
      } else {
        // Fallback to clearly labeled baseline metrics
        setMetrics(MOCK_SYSTEM_METRICS);
        setRecentRuns(MOCK_RECENT_ANALYSES);
        setIsLiveTelemetry(false);
      }
    } catch {
      // Backend offline: show demo baseline
      setMetrics(MOCK_SYSTEM_METRICS);
      setRecentRuns(MOCK_RECENT_ANALYSES);
      setIsLiveTelemetry(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleInspect = async (row) => {
    if (row.isMockData) {
      if (onSelectAnalysis) onSelectAnalysis(row);
      if (onNavigate) onNavigate('results');
      return;
    }

    try {
      const full = await getResultById(row.analysis_id || row.id);
      if (onSelectAnalysis) onSelectAnalysis(full);
      if (onNavigate) onNavigate('results');
    } catch {
      if (onSelectAnalysis) onSelectAnalysis(row);
      if (onNavigate) onNavigate('results');
    }
  };

  // Custom dark tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-white">{label}</p>
          <p className="text-blue-400">
            Total Analyzed: <span className="font-mono">{payload[0]?.value}</span>
          </p>
          {payload[1] && (
            <p className="text-rose-400">
              Anomalies: <span className="font-mono">{payload[1]?.value}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Activity table columns definition
  const columns = [
    {
      key: 'filename',
      header: 'Workflow File',
      render: (filename, row) => {
        const isAnom =
          row.classification?.toLowerCase() === 'anomalous' ||
          row.status === 'ANOMALY';
        return (
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-1.5 rounded-md ${
                isAnom
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <span className="font-medium text-slate-200 block">{filename}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {row.analysis_id || row.id}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'timestamp',
      header: 'Analyzed At',
      render: (_, row) => (
        <span className="text-slate-400 text-xs font-mono">
          {formatDate(row.created_at || row.timestamp)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Classification',
      render: (_, row) => {
        const isAnom =
          row.classification?.toLowerCase() === 'anomalous' ||
          row.status === 'ANOMALY';
        return isAnom ? (
          <Badge variant="danger" dot size="sm">
            Anomaly Detected
          </Badge>
        ) : (
          <Badge variant="success" dot size="sm">
            Normal Workflow
          </Badge>
        );
      },
    },
    {
      key: 'anomaly_score',
      header: 'Anomaly Score',
      align: 'right',
      render: (_, row) => {
        const score = row.anomaly_score !== undefined ? row.anomaly_score : row.anomalyScore;
        const isAnom =
          row.classification?.toLowerCase() === 'anomalous' ||
          row.status === 'ANOMALY';
        return (
          <div className="flex flex-col items-end">
            <span
              className={`font-mono font-semibold text-xs ${
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
      key: 'findingsSummary',
      header: 'Structural Telemetry',
      className: 'hidden md:table-cell max-w-xs truncate',
      render: (_, row) => (
        <span className="text-slate-400 text-xs truncate block">
          {row.score_interpretation || row.primaryFinding || `${row.total_jobs || 1} job(s), ${row.total_steps || 1} step(s)`}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleInspect(row);
          }}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700"
        >
          <span>Inspect</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      ),
    },
  ];

  const currentMetrics = metrics || MOCK_SYSTEM_METRICS;

  return (
    <div className="space-y-6">
      {/* Live vs Demo Notice Banner */}
      {isLiveTelemetry ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>Live Telemetry Connected:</strong> Streaming real-time analysis runs and statistics from FastAPI backend.
            </span>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-1 text-emerald-400 hover:text-white underline font-medium"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Baseline Demo Telemetry:</strong> No historical analysis runs recorded yet in SQLite database. Upload a workflow YAML to record live telemetry.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Source: Baseline Calibrated Fixtures
          </span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workflows"
          value={currentMetrics.totalAnalyzed}
          change={isLiveTelemetry ? 'Recorded in SQLite' : '+18 baseline'}
          trend="neutral"
          icon={FileCheck2}
          color="blue"
          description="CI/CD workflows parsed"
        />
        <StatCard
          title="Normal Workflows"
          value={currentMetrics.normalWorkflows}
          change={isLiveTelemetry ? 'Conforms to baseline' : '83.8% of total'}
          trend="down"
          icon={ShieldCheck}
          color="emerald"
          description="Conform to standard AST"
        />
        <StatCard
          title="Potential Anomalies"
          value={currentMetrics.potentialAnomalies}
          change={isLiveTelemetry ? 'Outlier threshold exceeded' : '9 critical flags'}
          trend="up"
          icon={AlertTriangle}
          color="rose"
          description="Structural deviations"
        />
        <StatCard
          title="Anomaly Rate"
          value={`${currentMetrics.anomalyPercentage}%`}
          change="Threshold: 0.537"
          trend="up"
          icon={Percent}
          color="amber"
          description="Calculated ratio"
        />
      </div>

      {/* Visual Analytics Row: Trends & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Activity Chart */}
        <Card
          title="Workflow Analysis Telemetry"
          subtitle="Analysis volume vs structural anomaly flags over time"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ANALYSIS_TRENDS}>
                <defs>
                  <linearGradient id="colorAnalyzed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="analyzed"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnalyzed)"
                  name="Analyzed"
                />
                <Area
                  type="monotone"
                  dataKey="anomalies"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnomalies)"
                  name="Anomalies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center space-x-6 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>Total Analyzed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Anomalies Flagged</span>
            </div>
          </div>
        </Card>

        {/* Anomaly Category Distribution */}
        <Card
          title="Structural Anomaly Categories"
          subtitle="Distribution by structural vulnerability type"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_ANOMALY_CATEGORIES}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {MOCK_ANOMALY_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} instances`, name]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
            {MOCK_ANOMALY_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className="font-mono text-slate-400 font-semibold">{cat.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Workflow Analyses Table */}
      <div className="space-y-3">
        <SectionHeader
          title="Recent Workflow Inspections"
          description={
            isLiveTelemetry
              ? 'Real-time telemetry stream from SQLite database'
              : 'Calibrated historical activity records'
          }
          action={
            <button
              onClick={() => onNavigate && onNavigate('history')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-medium transition-colors"
            >
              <span>View Full History</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          }
        />
        <Table
          columns={columns}
          data={recentRuns}
          keyField="analysis_id"
          onRowClick={(row) => handleInspect(row)}
        />
      </div>

      {/* Quick Action Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-white font-semibold text-sm">
            Have a new GitHub Actions workflow to analyze?
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Upload your `.github/workflows/*.yml` to inspect jobs, steps, permissions, and runner security via FastAPI.
          </p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('upload')}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex-shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Upload Workflow File</span>
        </button>
      </div>
    </div>
  );
}
