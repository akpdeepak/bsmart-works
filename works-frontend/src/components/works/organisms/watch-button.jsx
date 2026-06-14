import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Watch/unwatch toggle for a work item. Self-contained: reads the current watch state + count on
 * mount and toggles via /work-items/{id}/watch. Watching an item means you're notified on any field
 * change or new comment (the server fans those out — see WatcherService).
 */
export function WatchButton({ itemId }) {
  const { t } = useI18n();
  const [watching, setWatching] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!itemId) return undefined;
    let active = true;
    api.send(`/work-items/${encodeURIComponent(itemId)}/watchers`)
      .then((res) => { if (active) { setWatching(!!res.watching); setCount((res.watchers || []).length); } })
      .catch(() => {});
    return () => { active = false; };
  }, [itemId]);

  const toggle = () => {
    if (busy || !itemId) return;
    setBusy(true);
    api.send(`/work-items/${encodeURIComponent(itemId)}/watch`, { method: watching ? 'DELETE' : 'POST' })
      .then((res) => { setWatching(!!res.watching); if (typeof res.watchers === 'number') setCount(res.watchers); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={watching}
      title={watching ? t('deliver.watch.unwatch') : t('deliver.watch.watch')}
      className={cn(
        'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50',
        watching
          ? 'border-brand-navy-tint/40 bg-brand-navy-tint/10 text-brand-navy dark:text-white'
          : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:text-brand-navy'
      )}
    >
      {watching ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
      <span className="hidden sm:inline">{watching ? t('deliver.watch.watching') : t('deliver.watch.watch')}</span>
      {count > 0 && <span className="text-neutral-500">{count}</span>}
    </button>
  );
}

export default WatchButton;
