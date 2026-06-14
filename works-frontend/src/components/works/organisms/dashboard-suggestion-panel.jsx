import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { aiClient } from '@/lib/ai';

// Cap J — AI-suggested starter dashboards (INSIGHTS-AI-ALIGNMENT-REVIEW §2.2). Proposes a starter
// set of widgets for the user's role that they can preview, then ACCEPT (creates the dashboard) or
// DISMISS. Gated by the parent on the `dashboard_suggestion` capability — HIDDEN entirely when off
// (RB-40 §2 most-restrictive-wins). The widget set is always the deterministic role-based starter
// set, so the preview renders even when AI is on-but-over-budget/unavailable (the fallback); AI only
// refines the rationale shown above the widgets, surfaced honestly via AiMetaBadge (RB-20 §4).

// One proposed widget rendered as a plain chip — reads honestly without re-implementing the chart
// renderers; the real widgets are created on accept through the existing dashboard widget endpoints.
function WidgetChip({ widget }) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5">
      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        {String(widget.widgetType).replace(/_/g, ' ')}
      </span>
      <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{widget.title}</span>
    </li>
  );
}

export function DashboardSuggestionPanel({ workspaceId, roleKey = 'developer', onAccept, showToast }) {
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null); // { role, name, rationale, widgets, usedAi, fallback, ... }

  const suggest = () => {
    if (!workspaceId || busy) return;
    setBusy(true);
    setError(null);
    setSuggestion(null);
    aiClient
      .suggestDashboard(workspaceId, roleKey)
      .then((res) => setSuggestion(res))
      .catch((e) => setError(e?.message || "Couldn't suggest a dashboard right now — try again."))
      .finally(() => setBusy(false));
  };

  const accept = () => {
    if (!suggestion || accepting) return;
    setAccepting(true);
    Promise.resolve(onAccept?.(suggestion))
      .then(() => {
        showToast?.(`Created "${suggestion.name}"`);
        setSuggestion(null);
      })
      .catch(() => setError("Couldn't create the dashboard — try again."))
      .finally(() => setAccepting(false));
  };

  const meta = suggestion
    ? { usedAi: suggestion.usedAi, fallback: suggestion.fallback, policyState: suggestion.policyState, tier: suggestion.tier }
    : null;

  return (
    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-4 mb-5">
      <div className="flex gap-3 items-start">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy mt-2 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Suggest a dashboard</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Get a starter set of widgets tuned for your role — accept it or keep building your own.
              </p>
            </div>
            <Button variant="secondary" onClick={suggest} loading={busy} disabled={busy}>
              {suggestion ? 'Suggest again' : 'Suggest a dashboard'}
            </Button>
          </div>

          {busy && !suggestion && (
            <div className="mt-3 h-20 rounded-md animate-pulse bg-neutral-100 dark:bg-neutral-700" aria-hidden="true" />
          )}

          {error && (
            <p className="text-sm text-semantic-danger mt-3" role="alert">{error}</p>
          )}

          {suggestion && (
            <div className="mt-3 rounded-md border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{suggestion.name}</p>
                <AiMetaBadge meta={meta} />
              </div>
              {suggestion.fallback && (
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  AI off — showing the deterministic role-based starter set.
                </p>
              )}
              {suggestion.rationale && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{suggestion.rationale}</p>
              )}
              <ul className="space-y-1.5">
                {(suggestion.widgets || []).map((w, i) => (
                  <WidgetChip key={`${w.widgetType}-${w.title}-${i}`} widget={w} />
                ))}
              </ul>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="action" size="sm" onClick={accept} loading={accepting}
                  disabled={(suggestion.widgets || []).length === 0}>
                  Accept &amp; create
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSuggestion(null)} disabled={accepting}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
