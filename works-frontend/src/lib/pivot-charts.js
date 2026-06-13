// bSmart Works — chart-type compatibility logic (pure, no HTTP, no React).
// The "smart compatibility" brain behind <WidgetBuilder/>: given the chart-type registry
// (from /widget-data/chart-types) and the current pivot shape (how many dimensions + measures
// the user has chosen), decide which charts FIT, which are merely OFFERED-but-flagged, and what
// compatible alternative to SUGGEST. Kept side-effect-free so it is trivially testable.

/**
 * Does a chart type accept the given dimension/measure counts?
 * `max*` of null/undefined means "no upper limit" (the server emits null for unbounded — ChartType).
 */
export function fits(chartType, dimCount, measureCount) {
  if (!chartType) return false;
  const dMin = chartType.minDimensions ?? 0;
  const dMax = chartType.maxDimensions == null ? Infinity : chartType.maxDimensions;
  const mMin = chartType.minMeasures ?? 0;
  const mMax = chartType.maxMeasures == null ? Infinity : chartType.maxMeasures;
  return dimCount >= dMin && dimCount <= dMax && measureCount >= mMin && measureCount <= mMax;
}

/** A short, human reason a chart doesn't fit — what to do about it (RB-30 §6: actionable). */
export function incompatibilityReason(chartType, dimCount, measureCount) {
  if (!chartType || fits(chartType, dimCount, measureCount)) return null;
  const parts = [];
  const dMin = chartType.minDimensions ?? 0;
  const dMax = chartType.maxDimensions == null ? Infinity : chartType.maxDimensions;
  const mMin = chartType.minMeasures ?? 0;
  const mMax = chartType.maxMeasures == null ? Infinity : chartType.maxMeasures;
  const need = (count, min, max, noun) => {
    if (count < min) parts.push(`needs ${min === max ? min : `at least ${min}`} ${noun}${min === 1 ? '' : 's'}`);
    else if (count > max) parts.push(`takes ${max === 0 ? 'no' : `at most ${max}`} ${noun}${max === 1 ? '' : 's'}`);
  };
  need(dimCount, dMin, dMax, 'dimension');
  need(measureCount, mMin, mMax, 'measure');
  return parts.join(' · ');
}

/**
 * Annotate the whole registry against the current shape: every type is OFFERED (`compatible`
 * flag + `reason` when not), in registry order, so the picker can show all 19 and guide the
 * user (graceful degradation, never a hidden option).
 */
export function annotateChartTypes(chartTypes, dimCount, measureCount) {
  return (chartTypes || []).map((c) => {
    const compatible = fits(c, dimCount, measureCount);
    return { ...c, compatible, reason: compatible ? null : incompatibilityReason(c, dimCount, measureCount) };
  });
}

/**
 * Suggest a compatible alternative when the chosen type doesn't fit the current shape.
 * Returns the first registry type that fits (registry order is curated most-useful-first), or
 * null if nothing fits (shouldn't happen — pivot_table accepts any shape). Never returns the
 * chosen type itself.
 */
export function suggestAlternative(chartTypes, chosenId, dimCount, measureCount) {
  return (chartTypes || []).find((c) => c.id !== chosenId && fits(c, dimCount, measureCount)) || null;
}

/**
 * Resolve what the picker should actually do for the current selection: is the chosen type ok,
 * and if not, what's the suggested fallback. One call so the builder + preview stay consistent.
 */
export function resolveSelection(chartTypes, chosenId, dimCount, measureCount) {
  const chosen = (chartTypes || []).find((c) => c.id === chosenId) || null;
  const ok = fits(chosen, dimCount, measureCount);
  return {
    chosen,
    compatible: ok,
    reason: ok ? null : incompatibilityReason(chosen, dimCount, measureCount),
    suggestion: ok ? null : suggestAlternative(chartTypes, chosenId, dimCount, measureCount),
  };
}
