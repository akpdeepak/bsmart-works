import { describe, it, expect } from 'vitest';
import { TYPES, TYPE_ICON_SET, LEGACY_TYPE_ICON, resolveTypeIcon } from './work-item-types.js';

// Pins the spec-mandated concept→icon map (WRK-BR08) so icon drift is caught by CI.
describe('work-item-types', () => {
  describe('TYPES — spec-mandated icon mapping (WRK-BR08)', () => {
    it('ships exactly the 7 MVP built-in types', () => {
      expect(Object.keys(TYPES)).toEqual(
        expect.arrayContaining(['Task', 'Story', 'Bug', 'Epic', 'Sub-task', 'Incident', 'Service Request'])
      );
      expect(Object.keys(TYPES)).toHaveLength(7);
    });

    it('uses the locked concept→icon map from the spec', () => {
      expect(TYPES.Epic.icon).toBe('layers');
      expect(TYPES.Story.icon).toBe('book-open');
      expect(TYPES.Task.icon).toBe('check-square');
      expect(TYPES.Bug.icon).toBe('bug');
      expect(TYPES['Sub-task'].icon).toBe('git-branch');
      expect(TYPES.Incident.icon).toBe('alert-triangle');
      expect(TYPES['Service Request'].icon).toBe('headphones');
    });

    it('uses brand-palette token classes, not raw hex', () => {
      for (const [, def] of Object.entries(TYPES)) {
        expect(def.color).toMatch(/^bg-/);
      }
    });
  });

  describe('TYPE_ICON_SET — all spec keys resolve to a component', () => {
    const specKeys = ['check-square', 'book-open', 'bug', 'layers', 'git-branch', 'alert-triangle', 'headphones'];

    it.each(specKeys)('key "%s" resolves to a Lucide component', (key) => {
      expect(TYPE_ICON_SET[key]).toBeTruthy();
    });

    it('legacy aliases still resolve (book → BookOpen)', () => {
      expect(TYPE_ICON_SET['book']).toBe(TYPE_ICON_SET['book-open']);
    });
  });

  describe('resolveTypeIcon', () => {
    it('returns Package as default for empty input', () => {
      const Icon = resolveTypeIcon('');
      expect(Icon).toBeTruthy();
    });

    it('resolves a known key', () => {
      expect(resolveTypeIcon('layers')).toBe(TYPE_ICON_SET['layers']);
    });

    it('resolves a legacy emoji via LEGACY_TYPE_ICON back-compat', () => {
      const resolved = resolveTypeIcon('⚡');
      expect(resolved).toBeTruthy();
    });

    it('returns null for an unknown key', () => {
      expect(resolveTypeIcon('not-a-real-icon-xyz')).toBeNull();
    });
  });

  describe('LEGACY_TYPE_ICON — backward compat for emoji-stored data', () => {
    const legacyEmojis = ['✓', '📖', '🐛', '⚡', '↳', '🔥', '🎫'];

    it.each(legacyEmojis)('emoji "%s" maps to a known TYPE_ICON_SET key', (emoji) => {
      const key = LEGACY_TYPE_ICON[emoji];
      expect(key).toBeTruthy();
      expect(TYPE_ICON_SET[key]).toBeTruthy();
    });
  });
});
