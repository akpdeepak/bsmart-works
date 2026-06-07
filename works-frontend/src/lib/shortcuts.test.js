import { describe, it, expect } from 'vitest';
import { DEFAULT_SHORTCUTS, mergeShortcuts, formatBinding, matchesSimple } from './shortcuts';

describe('shortcuts', () => {
  it('ships a default catalogue with stable ids', () => {
    expect(DEFAULT_SHORTCUTS.find((s) => s.id === 'command-palette').keys).toBe('mod+k');
  });

  it('merges user overrides onto defaults and flags them customized', () => {
    const merged = mergeShortcuts({ 'create-item': 'n' });
    const create = merged.find((s) => s.id === 'create-item');
    expect(create.keys).toBe('n');
    expect(create.customized).toBe(true);
    // untouched actions keep their default and no customized flag
    expect(merged.find((s) => s.id === 'search').customized).toBeUndefined();
  });

  it('formats modifier bindings for mac and non-mac', () => {
    expect(formatBinding('mod+k', true)).toBe('⌘K');
    expect(formatBinding('mod+k', false)).toBe('Ctrl+K');
  });

  it('formats sequence bindings as "X then Y"', () => {
    expect(formatBinding('g b', false)).toBe('G then B');
  });

  it('matchesSimple only matches plain single-key bindings', () => {
    expect(matchesSimple('/', { key: '/' })).toBe(true);
    expect(matchesSimple('c', { key: 'x' })).toBe(false);
    expect(matchesSimple('mod+k', { key: 'k' })).toBe(false);
    expect(matchesSimple('g b', { key: 'g' })).toBe(false);
  });
});
