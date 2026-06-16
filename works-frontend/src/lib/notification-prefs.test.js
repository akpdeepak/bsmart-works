import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNotifPrefs, setNotifPrefs, isQuietHours } from './notification-prefs';

// jsdom provides localStorage; reset between tests.
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('getNotifPrefs', () => {
  it('returns defaults when localStorage is empty', () => {
    const prefs = getNotifPrefs();
    expect(prefs.muted).toBe(false);
    expect(prefs.quietHoursEnabled).toBe(false);
    expect(prefs.quietStart).toBe('22:00');
    expect(prefs.quietEnd).toBe('08:00');
    expect(prefs.snoozeUntil).toBe(null);
  });

  it('merges stored values over defaults', () => {
    localStorage.setItem('bsmart_notif_prefs', JSON.stringify({ muted: true }));
    const prefs = getNotifPrefs();
    expect(prefs.muted).toBe(true);
    // Other defaults should still be present
    expect(prefs.quietHoursEnabled).toBe(false);
  });

  it('returns defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem('bsmart_notif_prefs', '{bad json');
    const prefs = getNotifPrefs();
    expect(prefs.muted).toBe(false);
  });
});

describe('setNotifPrefs', () => {
  it('persists a partial update merged with existing prefs', () => {
    setNotifPrefs({ muted: true });
    const prefs = getNotifPrefs();
    expect(prefs.muted).toBe(true);
    // defaults should still be there
    expect(prefs.quietStart).toBe('22:00');
  });

  it('overwrites a previously stored value', () => {
    setNotifPrefs({ quietStart: '21:00' });
    setNotifPrefs({ quietStart: '20:00' });
    expect(getNotifPrefs().quietStart).toBe('20:00');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setNotifPrefs({ muted: true })).not.toThrow();
  });
});

describe('isQuietHours', () => {
  it('returns false when all prefs are at defaults (not muted, not snoozed, quiet hours off)', () => {
    expect(isQuietHours()).toBe(false);
  });

  it('returns true when muted', () => {
    setNotifPrefs({ muted: true });
    expect(isQuietHours()).toBe(true);
  });

  it('returns true when snoozed and snoozeUntil is in the future', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    setNotifPrefs({ snoozeUntil: future });
    expect(isQuietHours()).toBe(true);
  });

  it('returns false when snoozeUntil is in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    setNotifPrefs({ snoozeUntil: past });
    expect(isQuietHours()).toBe(false);
  });

  it('returns false when quietHoursEnabled but current time is outside the window', () => {
    // 09:00–17:00 window; fake "now" to 18:00.
    vi.setSystemTime(new Date('2026-06-16T18:00:00'));
    setNotifPrefs({ quietHoursEnabled: true, quietStart: '09:00', quietEnd: '17:00' });
    expect(isQuietHours()).toBe(false);
    vi.useRealTimers();
  });

  it('returns true when inside a daytime quiet window', () => {
    vi.setSystemTime(new Date('2026-06-16T12:00:00'));
    setNotifPrefs({ quietHoursEnabled: true, quietStart: '09:00', quietEnd: '17:00' });
    expect(isQuietHours()).toBe(true);
    vi.useRealTimers();
  });

  it('handles midnight-spanning quiet hours — returns true before midnight end time', () => {
    // Window 22:00–08:00; fake "now" to 23:30 (inside window).
    vi.setSystemTime(new Date('2026-06-16T23:30:00'));
    setNotifPrefs({ quietHoursEnabled: true, quietStart: '22:00', quietEnd: '08:00' });
    expect(isQuietHours()).toBe(true);
    vi.useRealTimers();
  });

  it('handles midnight-spanning quiet hours — returns true early morning within end time', () => {
    // Window 22:00–08:00; fake "now" to 06:00 (inside window, after midnight).
    vi.setSystemTime(new Date('2026-06-16T06:00:00'));
    setNotifPrefs({ quietHoursEnabled: true, quietStart: '22:00', quietEnd: '08:00' });
    expect(isQuietHours()).toBe(true);
    vi.useRealTimers();
  });

  it('handles midnight-spanning quiet hours — returns false during the day', () => {
    // Window 22:00–08:00; fake "now" to 14:00 (outside window).
    vi.setSystemTime(new Date('2026-06-16T14:00:00'));
    setNotifPrefs({ quietHoursEnabled: true, quietStart: '22:00', quietEnd: '08:00' });
    expect(isQuietHours()).toBe(false);
    vi.useRealTimers();
  });
});
