import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';
import { buildBulkPreview } from '@/lib/bulk-preview';
import { useI18n } from '@/lib/i18n';

/**
 * Bulk-change preview wizard (WI-31). Shows the per-item before→after diff for a pending bulk edit
 * so the user confirms an explicit, reviewed change rather than a blind one. No-op rows are shown
 * muted (the server skips them too — WorkItemBulkService). Confirm runs the existing apply path;
 * per-item RBAC/tenant checks still happen server-side (RB-40 §1) — this is preview only.
 */
export function BulkPreviewModal({ action, value, items = [], userName, onConfirm, onCancel, busy = false }) {
  const { t } = useI18n();
  const { rows, changing, unchanged } = buildBulkPreview(items, action, value, {
    userName,
    unassignedLabel: t('deliver.bulk.unassign'),
    noneLabel: '—',
  });

  return (
    <Modal title={t('deliver.bulk.previewTitle')} onClose={onCancel} size="xl">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('deliver.bulk.action.' + action)}
        {' · '}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {changing} {t('deliver.bulk.willChange')}
        </span>
        {unchanged > 0 && (
          <span className="text-neutral-500"> · {unchanged} {t('deliver.bulk.unchanged')}</span>
        )}
      </p>

      <ul className="mt-4 max-h-80 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-700">
        {rows.map((row) => (
          <li key={row.id} className={row.willChange ? '' : 'opacity-50'}>
            <div className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{row.autoId}</span>
                <p className="truncate text-sm text-neutral-900 dark:text-neutral-100">{row.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">{row.before}</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                <span className={row.willChange ? 'font-semibold text-brand-navy dark:text-white' : 'text-neutral-500'}>
                  {row.after}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          {t('deliver.bulk.cancel')}
        </Button>
        <Button variant="action" size="sm" onClick={onConfirm} loading={busy} disabled={busy || changing === 0}>
          {t('deliver.bulk.confirmApply')} ({changing})
        </Button>
      </div>
    </Modal>
  );
}

export default BulkPreviewModal;
