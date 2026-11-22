import React from 'react';

/**
 * Reusable Section Header for grouping page modules.
 */
export default function SectionHeader({
  title,
  description,
  badge,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 ${className}`}>
      <div>
        <div className="flex items-center space-x-2.5">
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          {badge}
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex items-center space-x-2 self-start sm:self-auto">{action}</div>}
    </div>
  );
}
