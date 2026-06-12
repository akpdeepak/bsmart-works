import { Clock, AlertTriangle, OctagonAlert } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

// Color-coded time-in-status badge. Reads a lapse object from computeLapse():
//   on_track → green · at_risk → amber · breached → red · neutral → muted (no clock configured).
// Renders nothing for 'none' (no status-change timestamp yet).

const STYLES = {
  on_track: 'bg-semantic-success-surface text-semantic-success',
  at_risk:  'bg-semantic-warning-surface text-semantic-warning',
  breached: 'bg-semantic-danger-surface text-semantic-danger',
  neutral:  'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
};
const LABEL = { on_track: 'On track', at_risk: 'At risk', breached: 'Breached' };
const ICON  = { on_track: Clock, at_risk: AlertTriangle, breached: OctagonAlert, neutral: Clock };

export function LapseBadge({ lapse, compact = false, showLabel = true, className }) {
  if (!lapse || lapse.state === 'none') return null;
  const { state, elapsedSec } = lapse;
  const Icon = ICON[state] || Clock;
  const dur = formatDuration(elapsedSec);
  const label = LABEL[state];
  const title = `${dur} in this status${label ? ` · ${label}` : ''}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        STYLES[state] || STYLES.neutral,
        className
      )}
      title={title}
    >
      <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span>{dur}</span>
      {showLabel && !compact && label && <span className="opacity-80">· {label}</span>}
    </span>
  );
}

export default LapseBadge;
