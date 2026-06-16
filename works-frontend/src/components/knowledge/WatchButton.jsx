import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

/**
 * Watch/unwatch toggle for a knowledge article (KR-067).
 * Shows Eye/EyeOff icon and watcher count.
 * POST /articles/{id}/watch toggles; state update is optimistic.
 *
 * Props:
 *   articleId        {string} — the article id
 *   workspaceId      {string} — (unused by fetch; kept for symmetry and future use)
 *   initialWatching  {boolean} — starting state from the parent's article data
 *   initialCount     {number}  — starting watcher count
 */
export function WatchButton({ articleId, initialWatching = false, initialCount = 0 }) {
  const [watching, setWatching] = useState(!!initialWatching);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    if (busy || !articleId) return;
    // Optimistic update
    const nextWatching = !watching;
    setWatching(nextWatching);
    setCount((c) => nextWatching ? c + 1 : Math.max(0, c - 1));
    setBusy(true);
    api.send(`/articles/${encodeURIComponent(articleId)}/watch`, { method: 'POST' })
      .then((res) => {
        setWatching(!!res.watching);
        if (typeof res.watcherCount === 'number') setCount(res.watcherCount);
      })
      .catch(() => {
        // Revert optimistic update on error
        setWatching(!nextWatching);
        setCount((c) => nextWatching ? Math.max(0, c - 1) : c + 1);
      })
      .finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={watching}
      aria-label={watching ? 'Unwatch article' : 'Watch article'}
      title={watching ? 'Stop watching this article' : 'Watch this article for updates'}
      className={cn(
        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        watching
          ? 'border-brand-navy-tint/40 bg-brand-navy-tint/10 text-brand-navy dark:text-white'
          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'
      )}
    >
      {watching
        ? <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="hidden sm:inline">{watching ? 'Watching' : 'Watch'}</span>
      {count > 0 && (
        <span className="text-neutral-500 tabular-nums" aria-label={`${count} watcher${count !== 1 ? 's' : ''}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default WatchButton;
