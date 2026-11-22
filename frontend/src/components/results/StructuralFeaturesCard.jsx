import React from 'react';
import {
  Layers,
  ListOrdered,
  Cpu,
  Key,
  Radio,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Package,
} from 'lucide-react';
import Badge from '../common/Badge';

/**
 * StructuralFeaturesCard presents extracted AST metrics, runner targets,
 * triggers, external action dependencies, and permission scopes.
 */
export default function StructuralFeaturesCard({ features = {} }) {
  const {
    job_count = 0,
    step_count = 0,
    runner_types = [],
    external_actions = [],
    triggers = [],
    has_dangerous_permissions = false,
    permissions_summary = 'Default',
    has_self_hosted_runner = false,
    has_pull_request_target = false,
    environment_variables_count = 0,
  } = features;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Extracted Structural AST Features</h4>
            <p className="text-[11px] text-slate-400">
              Structural topology and telemetry parsed from workflow definition
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Key Quantitative Features */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Total Jobs</span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">{job_count}</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <ListOrdered className="h-3.5 w-3.5 text-indigo-400" />
            <span>Total Steps</span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">{step_count}</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Package className="h-3.5 w-3.5 text-purple-400" />
            <span>Ext. Actions</span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {external_actions.length}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <span>Env Variables</span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {environment_variables_count}
          </div>
        </div>
      </div>

      {/* Detailed Architectural Attributes */}
      <div className="space-y-4 text-xs">
        {/* Runners */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>Runner Environments</span>
            </span>
            {has_self_hosted_runner ? (
              <Badge variant="danger" size="sm" dot>
                Self-Hosted Detected
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Standard GitHub Runners
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {runner_types.length > 0 ? (
              runner_types.map((runner) => (
                <span
                  key={runner}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs border ${
                    runner.toLowerCase().includes('self-hosted')
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {runner}
                </span>
              ))
            ) : (
              <span className="text-slate-500">None explicitly declared</span>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>Token Permissions Scope</span>
            </span>
            {has_dangerous_permissions ? (
              <Badge variant="danger" size="sm" dot>
                Elevated Privileges
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Restricted / Least Privilege
              </Badge>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
            {permissions_summary}
          </div>
        </div>

        {/* Triggers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Radio className="h-3.5 w-3.5 text-indigo-400" />
              <span>Workflow Triggers</span>
            </span>
            {has_pull_request_target && (
              <Badge variant="danger" size="sm" dot>
                pull_request_target
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {triggers.length > 0 ? (
              triggers.map((trigger) => (
                <span
                  key={trigger}
                  className="px-2.5 py-0.5 rounded-md bg-slate-950 text-blue-300 border border-blue-500/20 font-mono text-xs"
                >
                  {trigger}
                </span>
              ))
            ) : (
              <span className="text-slate-500">None declared</span>
            )}
          </div>
        </div>

        {/* External Third-Party Actions */}
        <div className="space-y-1.5">
          <span className="flex items-center space-x-1.5 font-medium text-slate-300">
            <Package className="h-3.5 w-3.5 text-purple-400" />
            <span>Referenced Actions Dependencies ({external_actions.length})</span>
          </span>
          <div className="space-y-1">
            {external_actions.map((action) => {
              const isTrusted =
                action.startsWith('actions/') || action.startsWith('github/');
              return (
                <div
                  key={action}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs"
                >
                  <span className={isTrusted ? 'text-slate-300' : 'text-amber-300'}>
                    {action}
                  </span>
                  {isTrusted ? (
                    <Badge variant="success" size="sm">
                      Verified Publisher
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Third-Party / Unverified
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
