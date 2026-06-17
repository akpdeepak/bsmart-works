import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { BulkPreviewModal } from '@/components/works/organisms/bulk-preview-modal';
import { useI18n } from '@/lib/i18n';

const ACTIONS = ['assignee', 'priority', 'addLabel', 'removeLabel'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Bulk-edit toolbar for multi-selected work items. Pick one field change and apply it to all
 * selected ids; the server re-checks edit rights per item and skips any the caller can't touch
 * (RB-40 §1 — enforcement is server-side, this is just the control). Status is intentionally not a
 * bulk field (it must run the DoD + workflow engine per item), matching WorkItemBulkService.
 */
export function BulkEditBar({ count, users = [], onApply, onClear, busy = false, selectedItems = [], userName }) {
  const { t } = useI18n();
  const [action, setAction] = useState('priority');
  const [value, setValue] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const needsText = action === 'addLabel' || action === 'removeLabel';
  const canApply = !busy && count > 0 && (action === 'assignee' || (needsText ? value.trim() : value));

  const confirmApply = () => {
    if (!canApply) return;
    Promise.resolve(onApply(action, (action === 'assignee' ? value : value.trim())))
      .then(() => {
        setValue('');
        setPreviewOpen(false);
      });
  };

  const review = () => {
    if (!canApply) return;
    if (selectedItems.length > 0) setPreviewOpen(true);
    else confirmApply();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-navy-tint/30 bg-brand-navy-tint/5 px-3 py-2">
      <span className="text-xs font-semibold text-brand-navy dark:text-white">{count} {t('deliver.bulk.selected')}</span>

      <select
        value={action}
        onChange={(e) => { setAction(e.target.value); setValue(''); }}
        aria-label={t('deliver.bulk.field')}
        className="rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none"
      >
        {ACTIONS.map((a) => <option key={a} value={a}>{t(`deliver.bulk.action.${a}`)}</option>)}
      </select>

      {action === 'assignee' && (
        <select value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('deliver.bulk.action.assignee')}
          className="rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none">
          <option value="">{t('deliver.bulk.unassign')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
      )}
      {action === 'priority' && (
        <select value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('deliver.bulk.action.priority')}
          className="rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none">
          <option value="" disabled>{t('deliver.bulk.choose')}</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {needsText && (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('deliver.bulk.labelPlaceholder')}
          aria-label={t('deliver.bulk.labelPlaceholder')}
          className="rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
        />
      )}

      <Button variant="action" size="sm" onClick={review} disabled={!canApply}>{t('deliver.bulk.review')}</Button>
      <button type="button" onClick={onClear} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger">
        <X className="h-3.5 w-3.5" aria-hidden="true" />{t('deliver.bulk.clear')}
      </button>
      {previewOpen && (
        <BulkPreviewModal
          items={selectedItems}
          action={action}
          value={action === 'assignee' ? value : value.trim()}
          userName={userName}
          busy={busy}
          onCancel={() => setPreviewOpen(false)}
          onConfirm={confirmApply}
        />
      )}
    </div>
  );
}

export default BulkEditBar;
