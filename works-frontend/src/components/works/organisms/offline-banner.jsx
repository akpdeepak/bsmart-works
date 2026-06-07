import * as React from 'react';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isOnline, onConnectivityChange, pendingCount, syncDrafts } from '@/lib/offline';

// Organism (iteration 18, Cap S — offline mode). A slim status bar that appears only when the user
// is offline or has unsynced drafts, explaining *why* and *what to do next* (RB-20 §4 honest
// software). When connectivity returns it auto-syncs, and offers a manual "Sync now". Tokens only,
// five interactive states on the button, WCAG-AA (role="status", labelled control).
export function OfflineBanner({ onSynced }) {
  const [online, setOnline] = React.useState(isOnline());
  const [pending, setPending] = React.useState(pendingCount());
  const [syncing, setSyncing] = React.useState(false);

  const refreshPending = React.useCallback(() => setPending(pendingCount()), []);

  const doSync = React.useCallback(async () => {
    if (syncing || pendingCount() === 0) return;
    setSyncing(true);
    try {
      const res = await syncDrafts();
      refreshPending();
      onSynced?.(res);
    } catch {
      /* stay queued; the next reconnect or manual press retries */
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPending, onSynced]);

  React.useEffect(() => {
    const off = onConnectivityChange((isUp) => {
      setOnline(isUp);
      if (isUp) doSync();
    });
    return off;
  }, [doSync]);

  // Keep the pending count fresh while mounted (drafts may be queued elsewhere in the app).
  React.useEffect(() => {
    const t = setInterval(refreshPending, 2000);
    return () => clearInterval(t);
  }, [refreshPending]);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium',
        online ? 'bg-brand-navy-tint text-white' : 'bg-semantic-warning text-white',
      )}
    >
      {online ? <CloudUpload aria-hidden="true" className="h-3.5 w-3.5" /> : <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />}
      <span>
        {online
          ? `${pending} change${pending === 1 ? '' : 's'} saved offline, waiting to sync.`
          : 'You are offline. Changes are saved on this device and will sync when you reconnect.'}
      </span>
      {online && pending > 0 && (
        <button
          type="button"
          onClick={doSync}
          disabled={syncing}
          className={cn(
            'ml-1 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 transition-colors duration-fast',
            'bg-white/15 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1',
            'active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <RefreshCw aria-hidden="true" className={cn('h-3 w-3', syncing && 'animate-spin')} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      )}
    </div>
  );
}
