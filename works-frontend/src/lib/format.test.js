import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  smartDate, relativeTime, absoluteDate, absoluteDateTime, shortDate, toIso,
  formatDuration, formatNumber, formatPercent, formatPoints,
} from './format';

// Pin "now" so relative-time math is deterministic.
const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('empty / invalid input', () => {
  it.each([
    ['smartDate', smartDate],
    ['relativeTime', relativeTime],
    ['absoluteDate', absoluteDate],
    ['absoluteDateTime', absoluteDateTime],
    ['shortDate', shortDate],
  ])('%s returns an em-dash for null', (_name, fn) => {
    expect(fn(null)).toBe('—');
    expect(fn(undefined)).toBe('—');
    expect(fn('not-a-date')).toBe('—');
  });

  it('toIso returns null for empty input', () => {
    expect(toIso(null)).toBeNull();
    expect(toIso('nonsense')).toBeNull();
  });
});

describe('relativeTime', () => {
  it('returns "just now" under a minute', () => {
    expect(relativeTime(new Date(NOW - 30_000))).toBe('just now');
  });
  it('returns minutes/hours/days ago', () => {
    expect(relativeTime(new Date(NOW - 5 * 60_000))).toBe('5m ago');
    expect(relativeTime(new Date(NOW - 2 * 3_600_000))).toBe('2h ago');
    expect(relativeTime(new Date(NOW - 3 * 86_400_000))).toBe('3d ago');
  });
  it('falls back to an absolute date for future timestamps', () => {
    expect(relativeTime(new Date(NOW + 60_000))).toBe(absoluteDate(new Date(NOW + 60_000)));
  });
});

describe('smartDate', () => {
  it('uses relative time within 7 days', () => {
    expect(smartDate(new Date(NOW - 3_600_000))).toBe('1h ago');
  });
  it('uses an absolute date beyond 7 days', () => {
    const old = new Date(NOW - 30 * 86_400_000);
    expect(smartDate(old)).toBe(absoluteDate(old));
  });
});

describe('absolute formatters', () => {
  it('absoluteDate is unambiguous "D Month YYYY"', () => {
    expect(absoluteDate('2026-05-31T09:00:00.000Z')).toBe('31 May 2026');
  });
  it('absoluteDateTime appends 24h time', () => {
    const d = new Date('2026-05-31T14:30:00');
    expect(absoluteDateTime(d)).toBe('31 May 2026, 14:30');
  });
  it('shortDate is "D Mon"', () => {
    expect(shortDate('2026-05-31T09:00:00.000Z')).toBe('31 May');
  });
});

describe('formatDuration', () => {
  it('renders seconds, minutes, hours, days compactly', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(150)).toBe('2m');
    expect(formatDuration(7440)).toBe('2h 4m');
    expect(formatDuration(90000)).toBe('1d 1h');
  });
  it('auto-detects milliseconds for very large magnitudes (>1e9)', () => {
    // 1.728e9 ms = 1,728,000 s = exactly 20 days; only the ms-detect branch yields this.
    expect(formatDuration(1_728_000_000)).toBe('20d');
  });
  it('returns em-dash for null/NaN', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
});

describe('number / percent / points', () => {
  it('formatNumber adds a thousands separator', () => {
    expect(formatNumber(1240)).toBe('1,240');
  });
  it('formatPercent accepts a fraction or a whole number', () => {
    expect(formatPercent(0.873)).toBe('87%');
    expect(formatPercent(87)).toBe('87%');
  });
  it('formatPoints rounds to a whole number', () => {
    expect(formatPoints(3.4)).toBe('3');
  });
  it('all return em-dash for null/NaN', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPoints(undefined)).toBe('—');
  });
});
