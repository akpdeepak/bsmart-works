/**
 * Centralised date, time, number, and duration formatters — CLAUDE.md §4.22.
 * Import from here; never hand-format inline in components.
 *
 * Conventions:
 *   - Relative  ≤7 days ago   → "2h ago", "3d ago", "just now"
 *   - Absolute  > 7 days      → "31 May 2026"
 *   - Date+time when precise  → "31 May 2026, 14:30"
 *   - Empty / unknown         → em-dash "—" in text-neutral-400
 *   - Numbers                 → thousands separator via Intl (1,240)
 *   - Durations               → compact "3d 4h", "2h 15m"
 *   - Percentages             → whole numbers "87%"
 *   - Timestamps stored/sent  → UTC ISO-8601; displayed in local tz
 */

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LONG_MONTHS = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns a Date from a string, number, or Date. Null/undefined returns null. */
function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Smart date: relative if ≤7 days ago, absolute otherwise.
 * absoluteDate("2026-05-31")         → "31 May 2026"
 * absoluteDate("2026-06-01T12:00Z")  → "2h ago"  (if now is ~2h later)
 */
export function smartDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  if (Math.abs(diffMs) < SEVEN_DAYS_MS) return relativeTime(d);
  return absoluteDate(d);
}

/**
 * Relative time string: "just now", "5m ago", "2h ago", "3d ago".
 * Uses positive diff (past) only; future values return the absolute date.
 */
export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return absoluteDate(d);           // future → show date
  if (diffMs < 60_000) return 'just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

/**
 * Absolute date: "31 May 2026".
 * Never locale-ambiguous numeric (no 05/31/26).
 */
export function absoluteDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${LONG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Absolute date + 24h time: "31 May 2026, 14:30".
 * Use for audit logs, comment timestamps, formal records.
 */
export function absoluteDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${absoluteDate(d)}, ${hh}:${mm}`;
}

/**
 * Short month label for charts / compact displays: "31 May".
 */
export function shortDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/**
 * ISO-8601 UTC string for API payloads: "2026-05-31T12:00:00.000Z".
 */
export function toIso(value) {
  const d = toDate(value);
  return d ? d.toISOString() : null;
}

/**
 * Compact duration from total seconds or milliseconds (auto-detected by magnitude).
 * formatDuration(7440)   → "2h 4m"
 * formatDuration(90000)  → "1d 1h"
 */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds)) return '—';
  // auto-detect ms vs s: anything >1e9 is almost certainly milliseconds
  const s = totalSeconds > 1e9 ? Math.floor(totalSeconds / 1000) : Math.floor(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60) % 60;
  const h = Math.floor(s / 3600) % 24;
  const d = Math.floor(s / 86400);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/**
 * Thousands-separated integer: 1240 → "1,240".
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

/**
 * Whole-number percentage: 0.873 → "87%", 87 → "87%".
 * Pass a decimal fraction (0–1) or a whole number (0–100).
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

/**
 * Story points / effort: renders whole numbers, dash for null.
 */
export function formatPoints(value) {
  if (value == null || isNaN(value)) return '—';
  return String(Math.round(value));
}
