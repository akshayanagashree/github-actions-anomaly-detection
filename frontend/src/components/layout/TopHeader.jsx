import React, { useState, useEffect } from 'react';
import {
  Menu,
  Upload,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Badge from '../common/Badge';
import { checkBackendHealth } from '../../services/analysisService';

export default function TopHeader({
  activePage,
  onNavigate,
  onToggleMobileMenu,
  onRefresh,
}) {
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    connected: false,
    modelType: 'IsolationForest',
    version: '1.0.0',
  });

  const verifyHealth = async () => {
    const health = await checkBackendHealth();
    if (health.connected && health.data) {
      setBackendStatus({
        checked: true,
        connected: true,
        modelType: health.data.model_type || 'IsolationForest',
        version: health.data.version || '1.0.0',
      });
    } else {
      setBackendStatus({
        checked: true,
        connected: false,
        modelType: 'IsolationForest',
        version: '1.0.0',
      });
    }
  };

  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const pageTitles = {
    dashboard: {
      title: 'Security Overview Dashboard',
      subtitle: 'Real-time structural anomaly monitoring for GitHub Actions CI/CD workflows',
    },
    upload: {
      title: 'Upload & Analyze Workflow',
      subtitle: 'Upload workflow YAML via multipart FormData for live ML anomaly detection',
    },
    results: {
      title: 'Structural Analysis Results',
      subtitle: 'Detailed AST features, anomaly scores, and security findings breakdown',
    },
    comparison: {
      title: 'Workflow AST Comparison',
      subtitle: 'Visual structural diff between baseline and modified workflow definitions',
    },
    history: {
      title: 'Analysis Telemetry History',
      subtitle: 'Audit log of past workflow inspections, classifications, and structural scores',
    },
  };

  const current = pageTitles[activePage] || {
    title: 'GitHub Actions Anomaly Detection',
    subtitle: 'Security Telemetry Platform',
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile menu toggle + Page title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {current.title}
            </h1>
          </div>
          <p className="hidden sm:block text-xs text-slate-400 truncate">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Environment status, refresh, and primary CTA */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Backend Connectivity Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
          {backendStatus.connected ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">API:</span>
              <span className="text-xs font-mono text-emerald-400">FastAPI Live (:8000)</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-300 font-medium">API:</span>
              <span className="text-xs font-mono text-amber-400">Offline / Demo Mode</span>
            </>
          )}
        </div>

        {/* Model Spec Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
          <Activity className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-mono text-[11px] text-slate-400">Model:</span>
          <span className="font-mono text-[11px] text-blue-300 font-semibold">
            {backendStatus.modelType}-v{backendStatus.version}
          </span>
        </div>

        {/* Refresh action */}
        {onRefresh && (
          <button
            onClick={() => {
              verifyHealth();
              onRefresh();
            }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Telemetry"
            aria-label="Refresh Telemetry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        {/* Quick Upload CTA (if not currently on upload page) */}
        {activePage !== 'upload' && (
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all hover:shadow-blue-500/40"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload YAML</span>
            <span className="sm:hidden">Upload</span>
          </button>
        )}
      </div>
    </header>
  );
}
