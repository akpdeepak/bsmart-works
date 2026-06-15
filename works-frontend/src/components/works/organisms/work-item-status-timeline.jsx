// Work-item status timeline — the honest flow-metrics surface for a work item.
//
// Reads what the server computes from the event log (GET /work-items/{id}/status-durations,
// RBAC-enforced there): per-status durations PLUS lead time and cycle time.
//   • Lead time  = created → first Done-category status  (or → now while not done)
//   • Cycle time = first In-Progress-category status → first Done  (or → now while running;
//                  "Not started" when the item has never entered an in-progress status)
// Renders the two headline metrics, a proportional per-status bar, a legend, and reopen notes.
// Tokens only, WCAG-AA; all HTTP via apiClient (§3).

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { statusToCategory } from '@/components/works/status';
import { formatDuration, absoluteDateTime } from '@/lib/format';

const CAT_BG = {
  todo: 'bg-status-todo',
  in_progress: 'bg-status-in-progress',
  done: 'bg-status-done',
  blocked: 'bg-semantic-danger',
};

const tone = (status) => CAT_BG[statusToCategory(status)] || 'bg-neutral-300';

// Normalize the controlled prop / fetched payload to a metrics-shaped object.
// Accepts: the metrics object {durations, leadSeconds, cycleSeconds, completed, started},
// or a bare durations array (legacy / controlled tests).
function normalize(raw) {
  if (Array.isArray(raw)) return { durations: raw, leadSeconds: null, cycleSeconds: null, leadRunning: false, cycleRunning: false, completedAt: null, hasMetrics: false };
  if (raw && typeof raw === 'object') {
    return {
      durations: Array.isArray(raw.durations) ? raw.durations : [],
      leadSeconds: raw.leadSeconds ?? 0,
      cycleSeconds: raw.cycleSeconds ?? 0,
      leadRunning: raw.leadRunning ?? false,
      cycleRunning: raw.cycleRunning ?? false,
      completedAt: raw.completedAt ?? null,
      hasMetrics: true,
    };
  }
  return { durations: [], leadSeconds: null, cycleSeconds: null, leadRunning: false, cycleRunning: false, completedAt: null, hasMetrics: false };
}

function Metric({ label, value, hint }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 leading-tight">{value}</p>
      <p className="text-xs text-neutral-400">{hint}</p>
    </div>
  );
}

export function WorkItemStatusTimeline({ workItemId, durations: durationsProp, metrics: metricsProp }) {
  // Controlled mode: parent already holds the data (avoid a 2nd fetch).
  const controlled = durationsProp !== undefined || metricsProp !== undefined;
  const [fetched, setFetched] = useState(null); // null = loading (fetch mode only)
  const [error, setError] = useState(null);

  useEffect(() => {
    if (controlled || !workItemId) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => api.send(`/work-items/${encodeURIComponent(workItemId)}/status-durations`))
      .then((res) => { if (active) { setFetched(res ?? {}); setError(null); } })
      .catch((e) => { if (active) { setError(e.message || 'Could not load the status timeline.'); setFetched({}); } });
    return () => { active = false; };
  }, [workItemId, controlled]);

  const raw = controlled ? (metricsProp ?? durationsProp) : fetched;

  if (!controlled && raw === null) {
    return (
      <section aria-busy="true" aria-label="Loading status timeline">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Status timeline</p>
        <div className="h-2.5 w-full animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Status timeline</p>
        <p className="text-sm text-semantic-danger">{error}</p>
      </section>
    );
  }

  const { durations, leadSeconds, cycleSeconds, leadRunning, cycleRunning, completedAt, hasMetrics } = normalize(raw);
  const total = durations.reduce((sum, d) => sum + (d.totalSeconds || 0), 0);
  const reopened = durations.filter((d) => (d.timesEntered || 0) > 1);

  // Lead = time in To Do + In Progress; Cycle = time in In Progress. "so far" while the clock runs.
  const leadLabel = leadSeconds == null ? '—' : `${formatDuration(leadSeconds)}${leadRunning ? ' so far' : ''}`;
  const cycleLabel = cycleSeconds == null || (cycleSeconds === 0 && !cycleRunning)
    ? '—'
    : `${formatDuration(cycleSeconds)}${cycleRunning ? ' so far' : ''}`;

  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Status timeline</p>

      {hasMetrics && (
        <div className="mb-3 flex gap-4 rounded-md bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
          <Metric label="Lead time" value={leadLabel} hint="in To Do + In Progress" />
          <div className="w-px self-stretch bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
          <Metric label="Cycle time" value={cycleLabel} hint="in In Progress" />
          {completedAt && (
            <>
              <div className="w-px self-stretch bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
              <Metric label="Completed" value={absoluteDateTime(completedAt)} hint="marked as done" />
            </>
          )}
        </div>
      )}

      {durations.length === 0 || total === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">No status history yet — transitions appear here as the item moves.</p>
      ) : (
        <>
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
            role="img"
            aria-label={`Time in workflow ${formatDuration(total)} across ${durations.length} status${durations.length === 1 ? '' : 'es'}`}
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
            {durations.filter((d) => d.totalSeconds > 0).map((d) => (
              <li key={d.status} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                <span className={`h-2 w-2 rounded-full ${tone(d.status)}`} aria-hidden="true" />
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{d.status}</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{formatDuration(d.totalSeconds)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Total time in workflow{' '}
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
