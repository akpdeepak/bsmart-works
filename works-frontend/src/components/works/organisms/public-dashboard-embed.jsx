import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { Logo } from '@/components/works/logo';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { DashboardWidgetCard } from '@/components/works/organisms/dashboard-widget-card';

/**
 * Iteration 6 (Cap J) — public, read-only embed of a shared dashboard. Rendered before the auth
 * gate from `?share=<token>` (shareable link, with a header) or `/embed/dashboard/<token>` (the
 * chrome-less iframe surface — `embedded`). Fetches the token-scoped public endpoint and renders
 * the widgets from the server aggregate (no app shell, no auth, no drill). The response carries no
 * PII / owner identity — the workspace is resolved from the token, never the caller (RB-40 §1).
 *
 * Five states (RB-30 §6): loading skeletons, error (invalid/revoked link), empty (no widgets),
 * and the populated grid.
 */
export function PublicDashboardEmbed({ token, embedded = false }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  useEffect(() => {
    let alive = true;
    api.raw(`/public/dashboards/${encodeURIComponent(token)}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { if (alive) { setData(d); setStatus('ok'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans" aria-busy="true" aria-label="Loading dashboard">
        <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </header>
        <main className="p-6">
          <div className="grid grid-cols-12 gap-4 max-w-workspace mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Dashboard unavailable</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">This share link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }
  const widgets = data.widgets || [];
  // PIVOT widgets are pre-resolved server-side (workspace from the token — RB-40 §1) and keyed by
  // widget id; pass each one through so the embed renders pivots without an authenticated workspace.
  const pivots = data.pivots || {};
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans">
      {/* Chrome-less in an iframe (`embedded`): the host page owns the title bar, so we drop the
          app header and keep only a visually-hidden heading for screen readers (RB-30 §6 a11y). */}
      {embedded ? (
        <h1 className="sr-only">{data.name} — read-only dashboard</h1>
      ) : (
        <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Logo />
            <h1 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{data.name}</h1>
          </div>
          <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-full px-2 py-0.5 flex-shrink-0">Read-only</span>
        </header>
      )}
      <main className={embedded ? 'p-4' : 'p-6'}>
        {widgets.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">This dashboard has no widgets.</p>
        ) : (
          <div className="grid grid-cols-12 gap-4 max-w-workspace mx-auto">
            {widgets.map(w => (
              <DashboardWidgetCard key={w.id} widget={w} workItems={[]} aggregate={data.aggregate} editMode={false}
                resolvedPivot={pivots[w.id]} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
