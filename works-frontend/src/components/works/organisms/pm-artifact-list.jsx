import { useState } from 'react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { isIconComponent } from '@/lib/utils';

export function PmArtifactList({ title, icon: Icon, items, columns, renderRow, onDelete, onAdd, statusColors = {} }) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const pendingItem = items.find(i => i.id === pendingDeleteId);
  const pendingName = pendingItem?.title || pendingItem?.name || 'this item';

  return (
    <>
      {pendingDeleteId && (
        <div role="dialog" aria-modal="true" aria-labelledby="pm-list-confirm-title"
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-700">
            <h2 id="pm-list-confirm-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Delete item?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">"{pendingName}"</span> will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { onDelete(pendingDeleteId); setPendingDeleteId(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            {isIconComponent(Icon) ? <Icon aria-hidden="true" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" /> : <span>{Icon}</span>} {title}
          </h2>
          <Button variant="action" onClick={onAdd}>+ New</Button>
        </div>
        {items.length === 0
          ? <EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} subtitle="Click + New to add your first entry." action={<Button variant="action" onClick={onAdd}>+ New</Button>} />
          : <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    {columns.map(c => <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{c}</th>)}
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
                          <button onClick={() => setPendingDeleteId(item.id)} className="text-neutral-300 hover:text-semantic-danger text-xs transition-colors">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  );
}
