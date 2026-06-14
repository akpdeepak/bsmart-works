import { describe, it, expect } from 'vitest';
import {
  fits, incompatibilityReason, annotateChartTypes, suggestAlternative, resolveSelection,
} from './pivot-charts';

// A trimmed registry mirroring the server's ChartType bounds (null max = unbounded).
const REGISTRY = [
  { id: 'scorecard', label: 'Scorecard', minDimensions: 0, maxDimensions: 0, minMeasures: 1, maxMeasures: 1 },
  { id: 'donut', label: 'Donut', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: 1 },
  { id: 'bar', label: 'Bar', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: null },
  { id: 'stacked_bar', label: 'Stacked bar', minDimensions: 2, maxDimensions: 2, minMeasures: 1, maxMeasures: 1 },
  { id: 'scatter', label: 'Scatter', minDimensions: 0, maxDimensions: 1, minMeasures: 2, maxMeasures: 2 },
  { id: 'pivot_table', label: 'Pivot table', minDimensions: 0, maxDimensions: null, minMeasures: 1, maxMeasures: null },
];

describe('fits', () => {
  it('accepts a shape inside the bounds', () => {
    expect(fits(REGISTRY[2], 1, 1)).toBe(true); // bar, 1 dim 1 measure
  });
  it('treats null max as unbounded', () => {
    expect(fits(REGISTRY[2], 1, 5)).toBe(true); // bar accepts many measures
    expect(fits(REGISTRY[5], 4, 9)).toBe(true); // pivot_table accepts any shape
  });
  it('rejects too few dimensions', () => {
    expect(fits(REGISTRY[3], 1, 1)).toBe(false); // stacked_bar needs 2 dims
  });
  it('rejects too many dimensions / measures', () => {
    expect(fits(REGISTRY[1], 2, 1)).toBe(false); // donut takes only 1 dim
    expect(fits(REGISTRY[0], 0, 2)).toBe(false); // scorecard takes only 1 measure
  });
  it('is false for a missing chart type', () => {
    expect(fits(undefined, 1, 1)).toBe(false);
  });
});

describe('incompatibilityReason', () => {
  it('is null when the chart fits', () => {
    expect(incompatibilityReason(REGISTRY[2], 1, 1)).toBeNull();
  });
  it('explains a missing dimension', () => {
    expect(incompatibilityReason(REGISTRY[3], 1, 1)).toMatch(/dimension/);
  });
  it('explains too many measures', () => {
    expect(incompatibilityReason(REGISTRY[0], 0, 2)).toMatch(/measure/);
  });
});

describe('annotateChartTypes', () => {
  it('offers EVERY type, flagging the incompatible ones with a reason', () => {
    const out = annotateChartTypes(REGISTRY, 1, 1); // 1 dim, 1 measure
    expect(out).toHaveLength(REGISTRY.length); // all offered, none hidden
    const byId = Object.fromEntries(out.map((c) => [c.id, c]));
    expect(byId.bar.compatible).toBe(true);
    expect(byId.donut.compatible).toBe(true);
    expect(byId.scorecard.compatible).toBe(false);
    expect(byId.scorecard.reason).toBeTruthy();
    expect(byId.stacked_bar.compatible).toBe(false); // needs 2 dims
    expect(byId.scatter.compatible).toBe(false); // needs 2 measures
  });
});

describe('suggestAlternative', () => {
  it('suggests the first compatible type, never the chosen one', () => {
    // chosen scorecard doesn't fit 1 dim/1 measure; first fitting in order is donut
    const alt = suggestAlternative(REGISTRY, 'scorecard', 1, 1);
    expect(alt.id).toBe('donut');
  });
  it('never returns the chosen type even if it would fit', () => {
    const alt = suggestAlternative(REGISTRY, 'bar', 1, 1);
    expect(alt.id).not.toBe('bar');
  });
});

describe('resolveSelection', () => {
  it('passes through a compatible choice with no suggestion', () => {
    const sel = resolveSelection(REGISTRY, 'bar', 1, 1);
    expect(sel.compatible).toBe(true);
    expect(sel.suggestion).toBeNull();
    expect(sel.reason).toBeNull();
  });
  it('flags an incompatible choice and offers a compatible alternative', () => {
    const sel = resolveSelection(REGISTRY, 'scatter', 1, 1); // needs 2 measures
    expect(sel.compatible).toBe(false);
    expect(sel.reason).toMatch(/measure/);
    expect(sel.suggestion).not.toBeNull();
    expect(sel.suggestion.id).not.toBe('scatter');
  });
});
