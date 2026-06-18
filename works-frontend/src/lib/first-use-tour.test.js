import { beforeEach, describe, expect, it } from 'vitest';
import { completeTour, isTourCompleted, resetTour } from './first-use-tour';

describe('first-use tour persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('tracks a completed tour', () => {
    expect(isTourCompleted('board')).toBe(false);
    completeTour('board');
    expect(isTourCompleted('board')).toBe(true);
  });

  it('can reset a completed tour', () => {
    completeTour('board');
    resetTour('board');
    expect(isTourCompleted('board')).toBe(false);
  });
});
