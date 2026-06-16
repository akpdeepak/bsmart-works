import { describe, it, expect } from 'vitest';
import { DURATION, EASING, MOTION_ROLE, motionTransition } from './motion.js';

describe('DURATION', () => {
  it('base is 220ms', () => {
    expect(DURATION.base).toBe(220);
  });

  it('fast is 150ms', () => {
    expect(DURATION.fast).toBe(150);
  });

  it('instant is 0ms', () => {
    expect(DURATION.instant).toBe(0);
  });

  it('slow is 320ms', () => {
    expect(DURATION.slow).toBe(320);
  });

  it('slower is 480ms', () => {
    expect(DURATION.slower).toBe(480);
  });
});

describe('EASING', () => {
  it('outQuint is the correct cubic-bezier string', () => {
    expect(EASING.outQuint).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('spring is the correct cubic-bezier string', () => {
    expect(EASING.spring).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });

  it('linear is "linear"', () => {
    expect(EASING.linear).toBe('linear');
  });
});

describe('MOTION_ROLE', () => {
  it('modal maps to base duration + outQuint easing', () => {
    expect(MOTION_ROLE.modal).toEqual({ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  });

  it('drawer maps to base duration + outQuint easing', () => {
    expect(MOTION_ROLE.drawer).toEqual({ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  });

  it('hover maps to fast duration + outQuint easing', () => {
    expect(MOTION_ROLE.hover).toEqual({ duration: 150, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  });

  it('press maps to fast duration + spring easing', () => {
    expect(MOTION_ROLE.press).toEqual({ duration: 150, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  });

  it('page maps to slow duration + outQuint easing', () => {
    expect(MOTION_ROLE.page).toEqual({ duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  });
});

describe('motionTransition', () => {
  it('returns the correct string for modal with default property', () => {
    expect(motionTransition('modal')).toBe('all 220ms cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('returns the correct string for hover with explicit opacity property', () => {
    expect(motionTransition('hover', 'opacity')).toBe('opacity 150ms cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('falls back to panel defaults for an unknown role', () => {
    // panel = base (220ms) + outQuint
    expect(motionTransition('unknown-role')).toBe('all 220ms cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('handles all defined roles without throwing', () => {
    const roles = ['hover', 'press', 'panel', 'modal', 'drawer', 'accordion', 'toast', 'page'];
    for (const role of roles) {
      expect(() => motionTransition(role)).not.toThrow();
      expect(typeof motionTransition(role)).toBe('string');
    }
  });
});
