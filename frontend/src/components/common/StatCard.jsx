import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard component for key security metrics.
 * Provides high-contrast typography, icon container, and trend indicator.
 */
export default function StatCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  color = 'blue',
  description,
  badgeText,
}) {
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      borderGlow: 'hover:border-blue-500/40',
      valueColor: 'text-white',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      borderGlow: 'hover:border-emerald-500/40',
      valueColor: 'text-emerald-400',
    },
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      borderGlow: 'hover:border-rose-500/40',
      valueColor: 'text-rose-400',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      borderGlow: 'hover:border-amber-500/40',
      valueColor: 'text-amber-400',
    },
  };

  const selectedColor = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/40 transition-all duration-200 ${selectedColor.borderGlow}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${selectedColor.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${selectedColor.valueColor}`}>
          {value}
        </div>
        {badgeText && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {badgeText}
          </span>
        )}
      </div>

      {(change || description) && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {change && (
            <div className="flex items-center space-x-1">
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-rose-400" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />}
              {trend === 'neutral' && <Minus className="h-3.5 w-3.5 text-slate-400" />}
              <span
                className={
                  trend === 'up'
                    ? 'text-rose-400 font-medium'
                    : trend === 'down'
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-400'
                }
              >
                {change}
              </span>
            </div>
          )}
          {description && <span className="text-slate-500 truncate">{description}</span>}
        </div>
      )}
    </div>
  );
}
