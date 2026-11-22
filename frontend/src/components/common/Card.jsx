import React from 'react';

/**
 * Reusable Card container for cybersecurity dashboard panels.
 * Provides dark slate styling, subtle borders, and optional header sections.
 */
export default function Card({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = '',
  noPadding = false,
}) {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-black/40 transition-all ${className}`}
    >
      {(title || subtitle || Icon || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-white text-base leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex items-center space-x-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}
