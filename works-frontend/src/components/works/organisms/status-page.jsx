import * as React from 'react';
import { CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/works/atoms/skeleton';

// Organism (iteration 18, Cap S — observability "in-product status page"). Reads /status and shows
// each component's health with the overall state up top. Honest states (RB-30 §6): a skeleton while
// loading, a clear error with what-to-do-next, never a raw stack trace. Tokens only, semantic colour
// tokens for status, WCAG-AA.
export function StatusPage() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Fetch only — setState happens in the promise continuations, never synchronously, so it satisfies
  // react-hooks/set-state-in-effect when called from the effect below.
  const fetchStatus = React.useCallback(
    () =>
      api
        .send('/status')
        .then((d) => setData(d), () => setError(true))
        .finally(() => setLoading(false)),
    [],
  );

  // Retry handler (an event handler — synchronous setState is fine here).
  const load = React.useCallback(() => {
    setLoading(true);
    setError(false);
    fetchStatus();
  }, [fetchStatus]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading status">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-sm">
        <p className="font-medium text-semantic-danger">Couldn’t load system status.</p>
        <p className="mt-1 text-neutral-600">Check your connection and try again.</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-fast hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 active:translate-y-px dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const operational = data?.status === 'operational';

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg p-4',
          operational ? 'bg-semantic-success/10' : 'bg-semantic-warning/10',
        )}
      >
        {operational ? (
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-semantic-success" />
        ) : (
          <AlertTriangle aria-hidden="true" className="h-6 w-6 text-semantic-warning" />
        )}
        <div>
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {operational ? 'All systems operational' : 'Some systems degraded'}
          </p>
          <p className="text-xs text-neutral-600">
            Version {data?.version} · checked {formatTime(data?.checkedAt)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {(data?.components || []).map((c) => (
          <li key={c.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity aria-hidden="true" className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">{c.detail}</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  c.up
                    ? 'bg-semantic-success/15 text-semantic-success'
                    : 'bg-semantic-danger/15 text-semantic-danger',
                )}
              >
                {c.up ? 'Operational' : 'Down'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}
