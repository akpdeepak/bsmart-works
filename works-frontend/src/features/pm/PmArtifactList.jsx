import React from 'react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/ui';

export function PmArtifactList({ title, icon, items, columns, renderRow, onDelete, onAdd, statusColors = {} }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><span>{icon}</span> {title}</h2>
        <Button variant="action" onClick={onAdd}>+ New</Button>
      </div>
      {items.length === 0
        ? <EmptyState icon={icon} title={`No ${title.toLowerCase()} yet`} subtitle="Click + New to add your first entry." action={<Button variant="action" onClick={onAdd}>+ New</Button>} />
        : <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  {columns.map(c => <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{c}</th>)}
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {items.map(item => {
                  const cells = renderRow(item);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                      {cells.map((cell, i) => (
                        <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate' : 'text-neutral-600 dark:text-neutral-300 text-xs'}`}>
                          {i === 0 ? cell : (statusColors[cell]
                            ? <span className={`font-semibold ${statusColors[cell]}`}>{cell}</span>
                            : cell)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button onClick={() => onDelete(item.id)} className="text-neutral-300 hover:text-semantic-danger text-xs transition-colors">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}
