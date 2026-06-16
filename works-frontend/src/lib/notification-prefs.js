// Notification preferences — localStorage-backed user settings for the notification center.
// Keys: muted (bool), quietHoursEnabled (bool), quietStart / quietEnd (HH:MM strings),
// snoozeUntil (ISO datetime string or null).
//
// isQuietHours() returns true when any of: muted, snoozed, or inside the configured quiet window.
// Quiet-hours logic handles overnight spans (e.g. 22:00–08:00 that crosses midnight).

const KEY = 'bsmart_notif_prefs';
const DEFAULTS = {
  muted: false,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  snoozeUntil: null,
};

export function getNotifPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotifPrefs(partial) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getNotifPrefs(), ...partial }));
  } catch { /* noop — storage may be unavailable (private browsing, quota) */ }
}

// Returns true when notifications should be suppressed.
export function isQuietHours() {
  const { quietHoursEnabled, quietStart, quietEnd, snoozeUntil, muted } = getNotifPrefs();
  if (muted) return true;
  if (snoozeUntil && new Date() < new Date(snoozeUntil)) return true;
  if (!quietHoursEnabled) return false;
  const now = new Date();
  const [sh, sm] = quietStart.split(':').map(Number);
  const [eh, em] = quietEnd.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  // Spans midnight when start > end (e.g. 22:00 → 08:00).
  return startMins > endMins
    ? mins >= startMins || mins < endMins   // spans midnight
    : mins >= startMins && mins < endMins;
}
