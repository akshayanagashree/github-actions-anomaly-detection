import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  ShieldAlert,
  GitCompare,
  History,
  ShieldCheck,
  GitBranch,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Badge from '../common/Badge';

export default function Sidebar({
  activePage,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'upload',
      label: 'Upload Workflow',
      icon: UploadCloud,
      badge: 'New',
    },
    {
      id: 'results',
      label: 'Analysis Results',
      icon: ShieldAlert,
      badge: null,
    },
    {
      id: 'comparison',
      label: 'Workflow Comparison',
      icon: GitCompare,
      badge: null,
    },
    {
      id: 'history',
      label: 'Analysis History',
      icon: History,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand & App Title */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">
                SecWorkflow ML
              </h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Anomaly Detection
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {!isCollapsed ? 'Navigation' : '•••'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center rounded-lg px-3 py-2.5 text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Status Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1.5 font-mono">
                <GitBranch className="h-3 w-3 text-blue-400" />
                <span>feature/frontend</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Partner B</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-medium">Data Source</span>
                <Badge variant="success" size="sm" dot>
                  FastAPI
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                http://localhost:8000
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 py-1">
            <div
              className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
              title="FastAPI Backend Connected (:8000)"
              aria-label="FastAPI Backend Connected"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
