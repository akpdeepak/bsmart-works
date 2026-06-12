import { describe, it, expect } from 'vitest';
import { TYPES, TYPE_ICON_SET, LEGACY_TYPE_ICON, resolveTypeIcon } from './work-item-types.js';

// Pins the spec-mandated concept→icon map (WRK-BR08) so icon drift is caught by CI.
describe('work-item-types', () => {
  describe('TYPES — spec-mandated icon mapping (WRK-BR08)', () => {
    const allTypeLabels = [
      // Delivery (9)
      'Capability', 'Product', 'Initiative', 'Theme', 'Epic',
      'Story', 'Bug', 'Task', 'Activity',
      // RAID (4)
      'Risk', 'Issue', 'Assumption', 'Dependency',
      // Service (3)
      'Incident', 'HR Service Request', 'IT Service Request',
    ];

    it('ships exactly the 16 built-in types', () => {
      expect(Object.keys(TYPES)).toEqual(expect.arrayContaining(allTypeLabels));
      expect(Object.keys(TYPES)).toHaveLength(16);
    });

    it('uses the locked concept→icon map from the spec', () => {
      // Delivery
      expect(TYPES.Capability.icon).toBe('target');
      expect(TYPES.Product.icon).toBe('package');
      expect(TYPES.Initiative.icon).toBe('rocket');
      expect(TYPES.Theme.icon).toBe('layers');
      expect(TYPES.Epic.icon).toBe('zap');
      expect(TYPES.Story.icon).toBe('book-open');
      expect(TYPES.Bug.icon).toBe('bug');
      expect(TYPES.Task.icon).toBe('check-square');
      expect(TYPES.Activity.icon).toBe('corner-down-right');
      // RAID
      expect(TYPES.Risk.icon).toBe('alert-triangle');
      expect(TYPES.Issue.icon).toBe('flame');
      expect(TYPES.Assumption.icon).toBe('lightbulb');
      expect(TYPES.Dependency.icon).toBe('git-branch');
      // Service
      expect(TYPES.Incident.icon).toBe('shield');
      expect(TYPES['HR Service Request'].icon).toBe('users');
      expect(TYPES['IT Service Request'].icon).toBe('wrench');
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
