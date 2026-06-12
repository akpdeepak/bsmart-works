// Time-in-status ("lapse") computation: how long an item has sat in its current status,
// and whether that breaches the status's warn / breach thresholds.
//
// Effective threshold resolution (slice S4): an SLA policy target (when one applies) takes
// precedence over the per-status warn/breach hours; computed on read so policy changes reflect
// immediately. SLA wiring lands in a later step — until then `meta` carries the per-status hours.

const HOUR_SEC = 3600;

/**
 * @param statusChangedAt ISO timestamp the item entered its current status
 * @param meta status metadata { warnHours, breachHours } (from the resolver), or null
 * @param nowMs current time in ms (injectable for tests)
 * @returns { state, elapsedSec, warnSec, breachSec }
 *          state ∈ 'none' (no timestamp) | 'neutral' (no thresholds) |
 *                  'on_track' | 'at_risk' | 'breached'
 */
export function computeLapse(statusChangedAt, meta, nowMs = Date.now()) {
  if (!statusChangedAt) return { state: 'none', elapsedSec: 0, warnSec: null, breachSec: null };
  const enteredMs = new Date(statusChangedAt).getTime();
  if (Number.isNaN(enteredMs)) return { state: 'none', elapsedSec: 0, warnSec: null, breachSec: null };

  const elapsedSec = Math.max(0, Math.floor((nowMs - enteredMs) / 1000));
  const warnSec = meta?.warnHours != null ? Number(meta.warnHours) * HOUR_SEC : null;
  const breachSec = meta?.breachHours != null ? Number(meta.breachHours) * HOUR_SEC : null;

  let state;
  if (warnSec == null && breachSec == null) state = 'neutral';
  else if (breachSec != null && elapsedSec >= breachSec) state = 'breached';
  else if (warnSec != null && elapsedSec >= warnSec) state = 'at_risk';
  else state = 'on_track';

  return { state, elapsedSec, warnSec, breachSec };
}

/** Fraction (0–1) of the breach budget elapsed, or null when no breach threshold is set. */
export function lapseProgress(lapse) {
  if (!lapse || lapse.breachSec == null || lapse.breachSec <= 0) return null;
  return Math.min(1, lapse.elapsedSec / lapse.breachSec);
}
