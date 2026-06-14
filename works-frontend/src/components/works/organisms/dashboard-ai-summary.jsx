import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { AiBudgetNotice } from '@/components/works/organisms/ai-budget-notice';
import { aiClient, capabilityEnabled } from '@/lib/ai';

// Cap J — opt-in AI summary + anomaly band for the Dashboards surface (RB-40 §2). The mapping
// already lives behind the AI Control Plane: it routes through the one apiClient, the server applies
// scope/budget/cache/audit, and always returns a usable result (meta.fallback says whether AI ran).
//
// HIDDEN ENTIRELY when the capability is off (RB-40 §2 most-restrictive-wins) — gated on ITS own
// capability (dashboard_summary), not "any AI". The charts stay standalone; this is purely additive.
export function DashboardAiSummary({ workspaceId, aiCapabilities = [], series = [], title }) {
  const [summary, setSummary] = useState(null); // { text, usedAi, fallback, policyState, tier }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Gate on the dashboard_summary capability — disappears (not dimmed) when off.
  if (!capabilityEnabled(aiCapabilities, 'dashboard_summary')) return null;

  const run = () => {
    if (!workspaceId || busy) return;
    setBusy(true);
    setError(false);
    aiClient
      .dashboardSummary(workspaceId, { title, series })
      .then((d) => setSummary(d))
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };

  const meta = summary
    ? { usedAi: summary.usedAi, fallback: summary.fallback, policyState: summary.policyState, tier: summary.tier }
    : null;

  return (
    <div className="mb-4 p-4 rounded-xl border border-brand-navy/20 bg-white dark:bg-neutral-800">
      <AiBudgetNotice workspaceId={workspaceId} className="mb-3" />
      <div className="flex items-start gap-3">
        <Sparkles aria-hidden="true" className="h-5 w-5 text-brand-navy mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI summary &amp; anomalies</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Summarise this view and flag outliers from the data already on screen.
              </p>
            </div>
            <Button variant="secondary" onClick={run} disabled={busy || series.length === 0}>
              {busy ? 'Summarising…' : summary ? 'Refresh' : 'Summarise'}
            </Button>
          </div>

          {series.length === 0 && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Add widgets with chartable data to get a summary.
            </p>
          )}

          {error && (
            <p className="text-xs text-semantic-danger mt-3">
              Couldn&apos;t generate a summary right now — try again.
            </p>
          )}

          {summary && !error && (
            <div className="mt-3 space-y-2">
              {summary.fallback && (
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  AI off — showing deterministic result.
                </p>
              )}
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{summary.text}</p>
              <AiMetaBadge meta={meta} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
