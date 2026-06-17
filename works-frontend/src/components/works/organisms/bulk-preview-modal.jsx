import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';
import { buildBulkPreview } from '@/lib/bulk-preview';
import { useI18n } from '@/lib/i18n';

export function BulkPreviewModal({ items = [], action, value, userName, onCancel, onConfirm, busy = false }) {
  const { t } = useI18n();
  const preview = buildBulkPreview(items, action, value, {
    userName,
    unassignedLabel: t('deliver.bulk.unassign'),
    noneLabel: t('common.none'),
  });

  return (
    <Modal title={t('deliver.bulk.previewTitle')} onClose={onCancel} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-semantic-success/10 px-2 py-1 font-semibold text-semantic-success">
            {preview.changing} {t('deliver.bulk.willChange')}
          </span>
          <span className="rounded-md bg-neutral-100 px-2 py-1 font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            {preview.unchanged} {t('deliver.bulk.unchanged')}
          </span>
        </div>

        <div className="max-h-80 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left">{t('workItem.type')}</th>
                <th className="px-3 py-2 text-left">{t('common.before')}</th>
                <th className="px-3 py-2 text-left">{t('common.after')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {preview.rows.map((row) => (
                <tr key={row.id} className={row.willChange ? '' : 'opacity-60'}>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs text-neutral-500">{row.autoId}</div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{row.title}</div>
                  </td>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{row.before}</td>
                  <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="button" variant="action" onClick={onConfirm} loading={busy} disabled={busy || preview.changing === 0}>
            {t('deliver.bulk.confirmApply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BulkPreviewModal;
