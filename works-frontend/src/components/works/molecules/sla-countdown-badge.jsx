import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/works/atoms/badge';
import { formatMinutes } from '@/lib/format';

// Molecule — the visible SLA countdown badge on a work item (iteration 8, Cap M).
// Shows "Resolve in 2h 14m" and shifts colour as the clock approaches breach:
//   OK    (>50% remaining) → success/teal
//   WARN  (<50% remaining) → warning/amber
//   BREACH                 → danger/red, pulsing
//   MET                    → success with a check
// Colour is never the sole signal — the state/label is always spelled out (WCAG 2.2 AA,
// CLAUDE.md §4.17 / RB-30 §6) and an aria-label states the full status. Token classes only.

const METRIC_VERB = {
  FIRST_RESPONSE: 'Respond',
  RESOLUTION: 'Resolve',
};

function verb(metric) {
  if (!metric) return 'Resolve';
  return METRIC_VERB[metric] || metric.charAt(0) + metric.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function SlaCountdownBadge({ metric, state, band, remainingMinutes }) {
  if (state === 'MET') {
    return (
      <Badge tone="success" aria-label={`${verb(metric)} SLA met`}>
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
        {verb(metric)} SLA met
      </Badge>
    );
  }

  if (state === 'BREACHED' || band === 'BREACH') {
    return (
      <Badge tone="danger" className="animate-pulse" aria-label={`${verb(metric)} SLA breached`}>
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
        {verb(metric)} SLA breached
      </Badge>
    );
  }

  const tone = band === 'WARN' ? 'warning' : 'success';
  const remaining = formatMinutes(remainingMinutes);
  const label = `${verb(metric)} in ${remaining}${state === 'PAUSED' ? ' (paused)' : ''}`;
  return (
    <Badge tone={tone} aria-label={`SLA: ${label}`}>
      <Clock aria-hidden="true" className="h-3 w-3" />
      {label}
    </Badge>
  );
}
