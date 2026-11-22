import React from 'react';
import {
  Layers,
  ListOrdered,
  Cpu,
  Key,
  Radio,
  GitFork,
  Package,
  HardDrive,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Badge from '../common/Badge';

/**
 * StructuredDiffSection renders categorized differences across all AST facets:
 * Jobs, Steps, Permissions, Triggers, Runners, Dependencies, Actions, and Environment.
 */
export default function StructuredDiffSection({ differences = {} }) {
  const {
    jobs = { added: [], removed: [], modified: [] },
    steps = { added: [], removed: [], modified: [] },
    permissions = [],
    triggers = [],
    runners = [],
    dependencies = [],
    externalActions = [],
    environment = [],
  } = differences;

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <Badge variant="danger" size="sm" dot>
            Critical Shift
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="danger" size="sm" dot>
            High Severity
          </Badge>
        );
      case 'WARNING':
      case 'MEDIUM':
        return (
          <Badge variant="warning" size="sm" dot>
            Medium Shift
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="neutral" size="sm">
            Low
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge variant="info" size="sm">
            Info
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Job Structural Changes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
          <Layers className="h-4 w-4 text-blue-400" />
          <h4 className="text-sm font-bold text-white">Job Hierarchy Modifications</h4>
        </div>

        <div className="space-y-2 text-xs">
          {/* Added Jobs */}
          {jobs.added?.map((job) => (
            <div
              key={job}
              className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Job Added: <strong>{job}</strong></span>
              </div>
              <Badge variant="success" size="sm">+ Added Job</Badge>
            </div>
          ))}

          {/* Removed Jobs */}
          {jobs.removed?.map((job) => (
            <div
              key={job}
              className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono line-through opacity-80"
            >
              <div className="flex items-center space-x-2">
                <Minus className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>Job Removed: <strong>{job}</strong></span>
              </div>
              <Badge variant="danger" size="sm">- Removed Job</Badge>
            </div>
          ))}

          {/* Modified Jobs */}
          {jobs.modified?.map((item) => (
            <div
              key={item.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 gap-2 text-xs"
            >
              <div className="flex items-start sm:items-center space-x-2 font-mono">
                <RefreshCw className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Job Modified: <strong>{item.name}</strong> &bull; {item.change}
                </span>
              </div>
              {getSeverityBadge(item.severity)}
            </div>
          ))}

          {jobs.added?.length === 0 &&
            jobs.removed?.length === 0 &&
            jobs.modified?.length === 0 && (
              <p className="text-xs text-slate-500 italic">No job additions or removals.</p>
            )}
        </div>
      </div>

      {/* 2. Step Execution Diffs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
          <ListOrdered className="h-4 w-4 text-indigo-400" />
          <h4 className="text-sm font-bold text-white">Step Sequence Changes</h4>
        </div>

        <div className="space-y-2 text-xs">
          {steps.added?.map((step) => (
            <div
              key={step}
              className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Added Step: <strong className="font-mono">{step}</strong></span>
              </div>
              <Badge variant="success" size="sm">+ Added Step</Badge>
            </div>
          ))}

          {steps.removed?.map((step) => (
            <div
              key={step}
              className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 line-through opacity-80"
            >
              <div className="flex items-center space-x-2">
                <Minus className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>Removed Step: <strong className="font-mono">{step}</strong></span>
              </div>
              <Badge variant="danger" size="sm">- Removed Step</Badge>
            </div>
          ))}

          {steps.modified?.map((item) => (
            <div
              key={item.step}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span>
                  Modified Step: <strong>{item.step}</strong> &bull; {item.change}
                </span>
              </div>
              {getSeverityBadge(item.severity)}
            </div>
          ))}

          {steps.added?.length === 0 &&
            steps.removed?.length === 0 &&
            steps.modified?.length === 0 && (
              <p className="text-xs text-slate-500 italic">No step alterations detected.</p>
            )}
        </div>
      </div>

      {/* 3. Runners & Permissions Diffs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Runner Environment Changes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Cpu className="h-4 w-4 text-rose-400" />
            <h4 className="text-sm font-bold text-white">Runner Modifications</h4>
          </div>

          <div className="space-y-3 text-xs">
            {runners.length > 0 ? (
              runners.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white font-mono">
                      Job: {item.job}
                    </span>
                    {getSeverityBadge(item.severity)}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-400">
                      Before:{' '}
                      <span className="text-emerald-400 line-through">{item.before}</span>
                    </div>
                    <div className="text-white">
                      After:{' '}
                      <span className="text-rose-400 font-bold">{item.after}</span>
                    </div>
                  </div>
                  {item.note && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                      {item.note}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No runner environment changes.</p>
            )}
          </div>
        </div>

        {/* Permission Changes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Key className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Permission Scope Alterations</h4>
          </div>

          <div className="space-y-3 text-xs">
            {permissions.length > 0 ? (
              permissions.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{item.scope}</span>
                    {getSeverityBadge(item.severity)}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-400">
                      Before:{' '}
                      <span className="text-emerald-400 line-through">{item.before}</span>
                    </div>
                    <div className="text-white">
                      After:{' '}
                      <span className="text-rose-400 font-bold">{item.after}</span>
                    </div>
                  </div>
                  {item.note && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                      {item.note}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No permission scope changes.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. External Actions & Triggers Diffs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* External Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Package className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-bold text-white">External Action Dependencies</h4>
          </div>

          <div className="space-y-2 text-xs">
            {externalActions.length > 0 ? (
              externalActions.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono"
                >
                  <div>
                    <span className="text-slate-200 block">{item.action}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{item.change}</span>
                  </div>
                  {item.status === 'ADDED' ? (
                    <Badge variant="warning" size="sm">+ Added Action</Badge>
                  ) : (
                    <Badge variant="info" size="sm">~ Version Bump</Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No external action changes.</p>
            )}
          </div>
        </div>

        {/* Triggers & Environment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Radio className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Triggers & Environment Variables</h4>
          </div>

          <div className="space-y-2 text-xs">
            {triggers.map((item, index) => (
              <div
                key={`trigger-${index}`}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-amber-300">Trigger: {item.trigger}</span>
                  {getSeverityBadge(item.severity)}
                </div>
                <p className="text-[11px] text-slate-400">{item.change}</p>
              </div>
            ))}

            {environment.map((item, index) => (
              <div
                key={`env-${index}`}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-blue-300">Env: {item.name} ({item.job})</span>
                  {getSeverityBadge(item.severity)}
                </div>
                <p className="text-[11px] text-slate-400">{item.change}</p>
              </div>
            ))}

            {triggers.length === 0 && environment.length === 0 && (
              <p className="text-xs text-slate-500 italic">No trigger or env variable changes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
