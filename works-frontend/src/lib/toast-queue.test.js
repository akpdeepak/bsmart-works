import { describe, it, expect, beforeEach } from 'vitest';
import {
  pushToast,
  dismissToast,
  subscribeToasts,
  _resetToastQueue,
  MAX_VISIBLE,
} from './toast-queue';

beforeEach(() => {
  _resetToastQueue();
});

describe('pushToast', () => {
  it('adds to visible when under MAX_VISIBLE', () => {
    const id = pushToast({ message: 'Hello', tone: 'info' });
    expect(id).toBeGreaterThan(0);

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(1);
    expect(state.visible[0].message).toBe('Hello');
    expect(state.visible[0].tone).toBe('info');
    expect(state.queue).toHaveLength(0);
  });

  it('uses default tone "info" and default duration 4000 when not specified', () => {
    pushToast({ message: 'Default' });
    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible[0].tone).toBe('info');
    expect(state.visible[0].duration).toBe(4000);
  });

  it('fills visible up to MAX_VISIBLE before queuing', () => {
    for (let i = 0; i < MAX_VISIBLE; i++) {
      pushToast({ message: `toast-${i}` });
    }
    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(MAX_VISIBLE);
    expect(state.queue).toHaveLength(0);
  });

  it('adds to queue when visible is full (MAX_VISIBLE items)', () => {
    for (let i = 0; i < MAX_VISIBLE; i++) {
      pushToast({ message: `visible-${i}` });
    }
    pushToast({ message: 'queued' });

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(MAX_VISIBLE);
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].message).toBe('queued');
  });

  it('queues multiple toasts in order when visible is full', () => {
    for (let i = 0; i < MAX_VISIBLE; i++) {
      pushToast({ message: `v${i}` });
    }
    pushToast({ message: 'q1' });
    pushToast({ message: 'q2' });

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.queue).toHaveLength(2);
    expect(state.queue[0].message).toBe('q1');
    expect(state.queue[1].message).toBe('q2');
  });

  it('stores the action property when provided', () => {
    const action = { label: 'Undo', onClick: () => {} };
    pushToast({ message: 'With action', action });
    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible[0].action).toBe(action);
  });
});

describe('dismissToast', () => {
  it('removes a visible toast by id', () => {
    const id = pushToast({ message: 'Remove me' });
    dismissToast(id);

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(0);
  });

  it('promotes the first queued toast into visible on dismiss', () => {
    // Fill visible
    const ids = [];
    for (let i = 0; i < MAX_VISIBLE; i++) {
      ids.push(pushToast({ message: `v${i}` }));
    }
    // Add one to queue
    pushToast({ message: 'promoted' });

    // Dismiss first visible
    dismissToast(ids[0]);

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(MAX_VISIBLE);
    expect(state.queue).toHaveLength(0);
    // The promoted toast should now be visible
    expect(state.visible.some(t => t.message === 'promoted')).toBe(true);
  });

  it('does not error when dismissing an id that is not visible', () => {
    pushToast({ message: 'ok' });
    expect(() => dismissToast(9999)).not.toThrow();
  });

  it('leaves visible empty when the last toast is dismissed and queue is also empty', () => {
    const id = pushToast({ message: 'last' });
    dismissToast(id);

    let state;
    subscribeToasts(s => { state = s; });
    expect(state.visible).toHaveLength(0);
    expect(state.queue).toHaveLength(0);
  });
});

describe('subscribeToasts', () => {
  it('receives an immediate snapshot on subscribe', () => {
    pushToast({ message: 'already there' });

    let received;
    subscribeToasts(s => { received = s; });
    expect(received.visible).toHaveLength(1);
    expect(received.visible[0].message).toBe('already there');
  });

  it('receives updates when a toast is pushed', () => {
    const updates = [];
    subscribeToasts(s => updates.push(s));
    pushToast({ message: 'new' });
    // First call = initial snapshot (empty); second call = after push
    expect(updates.length).toBeGreaterThanOrEqual(2);
    const last = updates[updates.length - 1];
    expect(last.visible[0].message).toBe('new');
  });

  it('receives updates when a toast is dismissed', () => {
    const id = pushToast({ message: 'will go' });
    const updates = [];
    subscribeToasts(s => updates.push(s));
    dismissToast(id);
    const last = updates[updates.length - 1];
    expect(last.visible).toHaveLength(0);
  });

  it('unsubscribe stops callbacks from being called', () => {
    const calls = [];
    const unsub = subscribeToasts(s => calls.push(s));
    const countBefore = calls.length;
    unsub();
    pushToast({ message: 'after unsub' });
    expect(calls.length).toBe(countBefore); // no new calls after unsubscribe
  });

  it('multiple subscribers each receive the update', () => {
    const a = [];
    const b = [];
    subscribeToasts(s => a.push(s));
    subscribeToasts(s => b.push(s));
    pushToast({ message: 'broadcast' });
    expect(a[a.length - 1].visible[0].message).toBe('broadcast');
    expect(b[b.length - 1].visible[0].message).toBe('broadcast');
  });
});
