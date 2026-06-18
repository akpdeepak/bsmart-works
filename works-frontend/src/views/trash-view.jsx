import { Trash2 } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { TypeBadge } from '@/components/works/work-item-type';

// Trash view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving: the
// parent owns the soft-deleted items and the restore/purge handlers; this renders them.
export default function TrashView({ loading = false, trashItems, restoreFromTrash, permanentDelete }) {
  if (loading && trashItems.length === 0) {
    return (
      <PageLayout>
        <Skeleton className="h-7 w-24 mb-6" />
        <ListSkeleton rows={4} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Trash" description="Deleted items are kept for 30 days">
      {trashItems.length === 0
        ? <EmptyState icon={Trash2} title="Trash is empty" subtitle="Deleted work items will appear here for 30 days before permanent removal." />
        : (
          <div className="space-y-2">
            {trashItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-4">
                <TypeBadge type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{item.id} · Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => restoreFromTrash(item.id)}>Restore</Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => permanentDelete(item.id)}
                    className="text-xs text-semantic-danger hover:text-semantic-danger/80 px-2 py-1 rounded border border-semantic-danger/30 hover:bg-semantic-danger-surface transition-colors">
                    Delete permanently
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </PageLayout>
  );
}
