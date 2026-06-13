// bSmart Works — pivot/widget-data client (CLAUDE.md §3: all HTTP goes through apiClient).
// One client for the merged multi-dimensional pivot engine, shared by Dashboards, the Report
// Builder and Reports so tenant scope + field security stay enforced once on the server
// (RB-40 §1, RB-10 §6). No inline fetch/axios here — every call funnels through `api`.

import { api } from '@/lib/apiClient';

// Backend cap on group-by dimensions — keep the UI in lock-step with the server (NFR, RB-40 §5).
export const MAX_DIMENSIONS = 4;

// The aggregations the server supports (PivotSpec.Agg). Surfaced in the agg picker.
export const AGGS = [
  { id: 'COUNT', label: 'Count' },
  { id: 'SUM', label: 'Sum' },
  { id: 'AVG', label: 'Average' },
  { id: 'MIN', label: 'Min' },
  { id: 'MAX', label: 'Max' },
  { id: 'COUNT_DISTINCT', label: 'Distinct count' },
  { id: 'MEDIAN', label: 'Median' },
  { id: 'P85', label: '85th percentile' },
  { id: 'PERCENT_OF_TOTAL', label: '% of total' },
];

// Process-lifetime cache for the chart-type registry — it is pure, tenant-free metadata
// (ChartType.describe), so one fetch per session is plenty. Cleared only by a reload.
let chartTypesPromise = null;

/**
 * The chart-type registry: every chart type with its supported shape
 * ({ id, label, minDimensions, maxDimensions, minMeasures, maxMeasures }). `max*` may be null
 * meaning "no upper limit". Cached for the session.
 */
export function fetchChartTypes() {
  if (!chartTypesPromise) {
    chartTypesPromise = api.send('/widget-data/chart-types').catch((err) => {
      // Don't poison the cache on a transient failure — let the next call retry.
      chartTypesPromise = null;
      throw err;
    });
  }
  return chartTypesPromise;
}

/** Test/teardown helper — drop the cached chart-type registry. */
export function _resetChartTypesCache() {
  chartTypesPromise = null;
}

/**
 * Resolve one pivot spec into a normalized { dimensions, measures, rows } result.
 * `spec` is a PivotSpec: { source, measures:[{field,agg}], dimensions:[alias…], filters }.
 */
export function resolvePivot(workspaceId, spec) {
  return api.send(`/widget-data/pivot?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: 'POST',
    body: spec,
  });
}

/**
 * Resolve many pivots in one round trip (one report grid, not one call per chart).
 * `items` maps an id → PivotSpec; the result is [{ id, data, error }] (error xor data per entry).
 */
export function resolvePivotBatch(workspaceId, items) {
  return api.send(`/widget-data/pivot-batch?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: 'POST',
    body: items,
  });
}

/**
 * The field allow-list for the dimension/measure pickers — already field-level-security filtered
 * server-side (RB-40 §1). Returns the raw BQL schema { fields:[{alias,column,type,custom}], … }.
 */
export function fetchFieldSchema(workspaceId) {
  const q = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return api.send(`/bql/schema${q}`);
}

/**
 * Assemble a PivotSpec from a widget config ({ sourceKind, query, metricKey, mode, measures,
 * dimensions, filters }). The source is one of the three WidgetSource kinds (bql | guided |
 * metric); dimensions/measures resolve server-side through the allow-list (RB-10 §6), so aliases
 * are sent verbatim. Lives here (not the component) so the dispatcher, builder and surfaces share
 * one definition without a React-Fast-Refresh export-mix.
 */
export function buildPivotSpec({ sourceKind, query, metricKey, mode, measures, dimensions, filters } = {}) {
  let source;
  if (sourceKind === 'metric') source = { kind: 'metric', key: metricKey || null };
  else if (sourceKind === 'guided') source = { kind: 'guided', guided: {}, mode: mode || 'group' };
  else source = { kind: 'bql', query: query || '', mode: mode || 'group' };
  return {
    source,
    measures: (measures || []).map((m) => ({ field: m.field, agg: m.agg })),
    dimensions: [...(dimensions || [])],
    filters: filters || null,
  };
}
