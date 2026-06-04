import { Clock, AlertTriangle, CheckCircle2, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';
import { formatDuration } from '@/lib/format';

// Molecule — the SLA countdown badge for a work item (iteration 8, Cap M).
// Colour follows the engine's signal: green >50% remaining, amber <50%, red on breach
// (CLAUDE.md §4.2 tokens only). A small pulse draws the eye on a live breach.
// `instance` is one element of GET /api/v1/sla/work-items/{id}.

const TONE_BY_COLOR = { success: 'success', warning: 'warning', danger: 'danger' };

function label(instance) {
  switch (instance.status) {
    case 'MET':      return 'SLA met';
    case 'BREACHED': return 'SLA breached';
    case 'PAUSED':   return 'SLA paused';
    case 'PENDING':  return 'SLA pending';
    default:         return formatDuration(instance.remainingSeconds);
  }
}

function Icon({ status, className }) {
  if (status === 'MET') return <CheckCircle2 className={className} aria-hidden="true" />;
  if (status === 'BREACHED') return <AlertTriangle className={className} aria-hidden="true" />;
  if (status === 'PAUSED' || status === 'PENDING') return <PauseCircle className={className} aria-hidden="true" />;
  return <Clock className={className} aria-hidden="true" />;
}

export function SlaBadge({ instance, className }) {
  if (!instance) return null;
  const tone = instance.status === 'MET'
    ? 'success'
    : instance.status === 'PAUSED' || instance.status === 'PENDING'
      ? 'neutral'
      : TONE_BY_COLOR[instance.color] || 'neutral';
  const breached = instance.status === 'BREACHED';
  const title = `${instance.metric === 'FIRST_RESPONSE' ? 'First response' : instance.metric === 'RESOLUTION' ? 'Resolution' : instance.metric}: ${label(instance)}`;

  return (
    <Badge tone={tone} title={title} className={cn(breached && 'animate-pulse', className)}>
      <Icon status={instance.status} className="h-3.5 w-3.5" />
      {label(instance)}
    </Badge>
  );
}
