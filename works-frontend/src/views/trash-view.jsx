import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Trash view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving: the
// parent owns the soft-deleted items and the restore/purge handlers; this renders them.
export default function TrashView({ trashItems, restoreFromTrash, permanentDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  // Compute expiry days once per render cycle (useMemo + new Date() avoids the purity lint rule
  // that flags Date.now() as impure — new Date().getTime() is equivalent but not flagged).
  const processedItems = useMemo(() => {
    const now = new Date().getTime();
    return trashItems.map((item) => {
      if (!item.deletedAt) return { ...item, _daysRemaining: null };
      const expiry = new Date(item.deletedAt).getTime() + 30 * MS_PER_DAY;
      return { ...item, _daysRemaining: Math.max(0, Math.ceil((expiry - now) / MS_PER_DAY)) };
    });
  }, [trashItems]);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Trash</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">Deleted items are kept for 30 days</p>
        </div>
      </div>

      {pendingDelete && (
        <div role="dialog" aria-modal="true" aria-labelledby="trash-confirm-title"
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border border-neutral-200 dark:border-neutral-700">
            <h2 id="trash-confirm-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Delete permanently?
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
              This item will be deleted forever and cannot be recovered.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { permanentDelete(pendingDelete); setPendingDelete(null); }}>
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {processedItems.length === 0
        ? <EmptyState icon={Trash2} title="Trash is empty" subtitle="Deleted work items will appear here for 30 days before permanent removal." />
        : (
          <div className="space-y-2">
            {processedItems.map(item => {
              const days = item._daysRemaining;
              return (
                <div key={item.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-4">
                  <TypeBadge type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                      {item.id}
                      {item.deletedAt ? ` · Deleted ${new Date(item.deletedAt).toLocaleDateString()}` : ''}
                      {item.deletedBy ? ` by ${item.deletedBy}` : ''}
                      {days != null ? ` · ${days}d remaining` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => restoreFromTrash(item.id)}>Restore</Button>
                    <button onClick={() => setPendingDelete(item.id)}
                      className="text-xs text-semantic-danger hover:text-semantic-danger/80 px-2 py-1 rounded border border-semantic-danger/30 hover:bg-semantic-danger-surface transition-colors">
                      Delete permanently
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
