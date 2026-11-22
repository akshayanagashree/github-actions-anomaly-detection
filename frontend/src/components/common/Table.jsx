import React from 'react';
import { Database } from 'lucide-react';

/**
 * Reusable cybersecurity data table with dark-mode styling,
 * border dividers, and configurable empty state.
 */
export default function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No analysis records found.',
  emptySubtext = 'Upload a workflow YAML to generate initial structural telemetry.',
  onRowClick,
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                className={`py-3 px-4 font-semibold ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 text-slate-300">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={row[keyField] || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/30'
                }`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key || colIndex}
                    className={`py-3.5 px-4 text-xs ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <div className="p-3 rounded-full bg-slate-800/80 border border-slate-700">
                    <Database className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">{emptyMessage}</p>
                  <p className="text-xs text-slate-500 max-w-sm">{emptySubtext}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
