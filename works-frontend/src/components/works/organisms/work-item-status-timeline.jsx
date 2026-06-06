// Work-item status timeline (mockup 05) — the honest cycle-time bar for a work item. Reads the
// per-status durations the server already computes from the event log (GET
// /work-items/{id}/status-durations, RBAC-enforced there) and renders a proportional bar, a
// per-status legend, the total cycle time, and any "returned to <status>" reopen note. Drop-in:
// <WorkItemStatusTimeline workItemId={id} />. Tokens only, WCAG-AA; all HTTP via apiClient (§3).

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { statusToCategory } from '@/components/works/status';
import { formatDuration } from '@/lib/format';

const CAT_BG = {
  todo: 'bg-status-todo',
  in_progress: 'bg-status-in-progress',
  done: 'bg-status-done',
  blocked: 'bg-semantic-danger',
};

const tone = (status) => CAT_BG[statusToCategory(status)] || 'bg-neutral-300';

export function WorkItemStatusTimeline({ workItemId, durations: durationsProp }) {
  // Controlled mode: when the parent already holds the durations, pass them in to avoid a 2nd fetch.
  const controlled = durationsProp !== undefined;
  const [fetched, setFetched] = useState(null); // null = loading (fetch mode only)
  const [error, setError] = useState(null);

  useEffect(() => {
    if (controlled || !workItemId) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => api.send(`/work-items/${encodeURIComponent(workItemId)}/status-durations`))
      .then((rows) => { if (active) { setFetched(Array.isArray(rows) ? rows : []); setError(null); } })
      .catch((e) => { if (active) { setError(e.message || 'Could not load the status timeline.'); setFetched([]); } });
    return () => { active = false; };
  }, [workItemId, controlled]);

  const durations = controlled ? (Array.isArray(durationsProp) ? durationsProp : []) : fetched;

  if (durations === null) {
    return (
      <section aria-busy="true" aria-label="Loading status timeline">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">Status timeline</p>
        <div className="h-2.5 w-full animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">Status timeline</p>
        <p className="text-sm text-semantic-danger">{error}</p>
      </section>
    );
  }

  const total = durations.reduce((sum, d) => sum + (d.totalSeconds || 0), 0);
  const reopened = durations.filter((d) => (d.timesEntered || 0) > 1);

  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">Status timeline</p>
      {durations.length === 0 || total === 0 ? (
        <p className="text-sm text-neutral-600">No status history yet — transitions appear here as the item moves.</p>
      ) : (
        <>
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
            role="img"
            aria-label={`Total cycle time ${formatDuration(total)} across ${durations.length} status${durations.length === 1 ? '' : 'es'}`}
          >
            {durations.map((d) => {
              const pct = Math.round((d.totalSeconds / total) * 100);
              if (pct <= 0) return null;
              return (
                <div
                  key={d.status}
                  className={`h-full ${tone(d.status)}`}
                  style={{ width: `${pct}%` }}
                  title={`${d.status}: ${formatDuration(d.totalSeconds)}`}
                />
              );
            })}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {durations.map((d) => (
              <li key={d.status} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                <span className={`h-2 w-2 rounded-full ${tone(d.status)}`} aria-hidden="true" />
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{d.status}</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{formatDuration(d.totalSeconds)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Total cycle time{' '}
              <span className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">{formatDuration(total)}</span>
            </span>
            {reopened.map((d) => (
              <span key={d.status} className="text-xs text-neutral-600 dark:text-neutral-400">
                Returned to {d.status} {d.timesEntered - 1} {d.timesEntered - 1 === 1 ? 'time' : 'times'}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default WorkItemStatusTimeline;
