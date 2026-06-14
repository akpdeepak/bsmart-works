import { useEffect, useState } from 'react';
import { TrendingDown, PauseCircle } from 'lucide-react';
import { aiClient } from '@/lib/ai';

// Cap J / RB-40 §2.5 — a small, non-blocking notice of the workspace AI budget state on AI-bearing
// surfaces. The control plane degrades to the cheap tier at 80% of the monthly cap and auto-disables
// AI (serving deterministic fallbacks) at 100% (RB-40 §2). This just surfaces that state honestly so
// a degraded/disabled result never looks like a silent regression.
//
// HIDDEN ENTIRELY when the budget is healthy (< 80%) — purely additive, never blocks the surface.
// Tokens only, aria-live="polite" so a screen reader hears the state without stealing focus.
//
// Accepts the budget status shape returned by aiClient.budget(workspaceId):
//   { period, capCents, spentCents, percent, degraded, disabled }
// Pass `status` to render a known value (e.g. in tests or when the parent already has it); otherwise
// it fetches once for the workspace. It never throws into the surface — a failed/absent fetch is
// treated as healthy (renders nothing).
export function AiBudgetNotice({ workspaceId, status: statusProp = null, className = '' }) {
  const [status, setStatus] = useState(statusProp);

  useEffect(() => {
    if (statusProp || !workspaceId || typeof aiClient.budget !== 'function') return undefined;
    let active = true;
    Promise.resolve()
      .then(() => aiClient.budget(workspaceId))
      .then((s) => { if (active) setStatus(s); })
      .catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [workspaceId, statusProp]);

  if (!status || (!status.disabled && !status.degraded)) return null;

  const disabled = !!status.disabled;
  const Icon = disabled ? PauseCircle : TrendingDown;
  const message = disabled
    ? 'AI paused for this month — showing deterministic results.'
    : 'AI is on the cheaper tier to stay within budget.';
  const tone = disabled
    ? 'bg-semantic-danger-surface text-semantic-danger'
    : 'bg-semantic-warning-surface text-semantic-warning';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${tone} ${className}`.trim()}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
      {typeof status.percent === 'number' && (
        <span className="ml-auto font-semibold tabular-nums">{status.percent}%</span>
      )}
    </div>
  );
}
