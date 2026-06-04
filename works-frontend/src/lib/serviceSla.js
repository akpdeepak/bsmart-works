// Presentation helpers for the customer-facing SLA countdown (iteration 9, Cap M).
// Pure functions — the SLA *state* is computed on the server (one engine, two contexts); this only
// turns a snapshot into a human label + a design-token tone. No literals leak into components.

/** Map an SLA state to a semantic token tone used by badges. */
export function slaTone(state) {
  switch (state) {
    case 'BREACHED':
      return 'danger';
    case 'AT_RISK':
      return 'warning';
    case 'MET':
    case 'ON_TRACK':
      return 'success';
    default:
      return 'neutral';
  }
}

/** Human-friendly duration for a signed minute count (e.g. 90 -> "1h 30m", -10 -> "10m"). */
export function formatMinutes(minutes) {
  const abs = Math.abs(Math.round(minutes ?? 0));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** A short countdown label for an SLA snapshot ({ state, minutesRemaining, breached }). */
export function slaLabel(sla) {
  if (!sla || sla.state === 'NONE') return 'No SLA';
  const remaining = formatMinutes(sla.minutesRemaining);
  switch (sla.state) {
    case 'MET':
      return 'Met';
    case 'BREACHED':
      return sla.minutesRemaining < 0 ? `Breached · ${remaining} over` : 'Breached';
    case 'AT_RISK':
      return `At risk · ${remaining} left`;
    case 'ON_TRACK':
      return `${remaining} left`;
    default:
      return 'No SLA';
  }
}
