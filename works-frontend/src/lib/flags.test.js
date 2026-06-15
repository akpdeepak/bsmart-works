import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FLAGS, getFlag } from './flags';

// Stub localStorage with a simple in-memory map so tests run in isolation.
const store = {};
const localStorageMock = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FLAGS', () => {
  it('exports an object with at least the four WI-11 flags', () => {
    expect(FLAGS).toMatchObject({
      onboarding_wizard: false,
      inline_quick_add: false,
      keyboard_shortcuts: false,
      optimistic_ui: false,
    });
  });

  it('all default values are false', () => {
    Object.values(FLAGS).forEach((v) => expect(v).toBe(false));
  });
});

describe('getFlag', () => {
  it('returns the FLAGS default when localStorage has no entry', () => {
    // All flags default to false; localStorage is empty.
    expect(getFlag('onboarding_wizard')).toBe(false);
    expect(getFlag('inline_quick_add')).toBe(false);
    expect(getFlag('keyboard_shortcuts')).toBe(false);
    expect(getFlag('optimistic_ui')).toBe(false);
  });

  it('returns true when localStorage has "true" for that key', () => {
    localStorageMock.setItem('flag:onboarding_wizard', 'true');
    expect(getFlag('onboarding_wizard')).toBe(true);
  });

  it('returns false when localStorage has "false" for that key', () => {
    localStorageMock.setItem('flag:inline_quick_add', 'false');
    expect(getFlag('inline_quick_add')).toBe(false);
  });

  it('ignores an unrecognised localStorage value and falls back to the default', () => {
    localStorageMock.setItem('flag:keyboard_shortcuts', 'yes');
    // 'yes' is not 'true' — falls through to the FLAGS default (false).
    expect(getFlag('keyboard_shortcuts')).toBe(false);
  });

  it('returns false for an unknown flag key', () => {
    expect(getFlag('non_existent_flag')).toBe(false);
  });

  it('localStorage override wins over the default', () => {
    localStorageMock.setItem('flag:optimistic_ui', 'true');
    expect(getFlag('optimistic_ui')).toBe(true);
  });
});
