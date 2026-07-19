import { beforeEach, describe, expect, it } from 'vitest';
import {
  attentionFingerprint,
  dismissTodayAttention,
  readTodayAttention,
  snapshotTodayAttention,
  snoozeTodayAttention,
  todayAttentionKey,
  visibleTodayAttention,
  writeTodayAttention,
} from './today-attention-state';

const item = { id: 'WRK-1', title: 'Fix login', reason: 'Overdue.', view: 'myworks' };
const now = new Date('2026-07-19T09:00:00Z');

describe('Today attention state', () => {
  beforeEach(() => localStorage.clear());

  it('isolates persisted state by workspace, user, and role', () => {
    const key = todayAttentionKey('WS-A', 'USR-1', 'developer');
    writeTodayAttention(key, { dismissed: ['x'], snoozed: {}, seen: [], lastVisitAt: null });

    expect(readTodayAttention(key).dismissed).toEqual(['x']);
    expect(readTodayAttention(todayAttentionKey('WS-B', 'USR-1', 'developer')).dismissed).toEqual([]);
  });

  it('dismisses the exact signal fingerprint and reveals a changed signal later', () => {
    const dismissed = dismissTodayAttention(readTodayAttention('missing'), item);

    expect(visibleTodayAttention([item], dismissed, now)).toEqual([]);
    expect(visibleTodayAttention([{ ...item, reason: 'Priority changed.' }], dismissed, now)).toHaveLength(1);
  });

  it('snoozes until the deadline and restores the item afterward', () => {
    const state = snoozeTodayAttention(readTodayAttention('missing'), item, '2026-07-20T09:00:00Z');

    expect(visibleTodayAttention([item], state, now)).toEqual([]);
    expect(visibleTodayAttention([item], state, new Date('2026-07-21T09:00:00Z'))).toHaveLength(1);
  });

  it('marks signals added after the previous snapshot as new and still caps the surface at five', () => {
    const previous = snapshotTodayAttention(readTodayAttention('missing'), [item], now);
    const changed = { id: 'WRK-2', title: 'New blocker', reason: 'Blocked.', view: 'myworks' };
    const visible = visibleTodayAttention([item, changed, ...Array.from({ length: 8 }, (_, i) => ({
      id: `WRK-${i + 3}`, title: `Item ${i}`, reason: 'High priority.', view: 'myworks',
    }))], previous, new Date('2026-07-20T09:00:00Z'));

    expect(visible).toHaveLength(5);
    expect(visible[0].isNew).toBe(false);
    expect(visible[1]).toMatchObject({ attentionKey: attentionFingerprint(changed), isNew: true });
  });
});
