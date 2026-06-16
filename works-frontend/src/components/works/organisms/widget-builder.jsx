import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, AlertTriangle, Lightbulb, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/works/button';
import { PivotChart } from '@/components/works/organisms/pivot-chart';
import {
  fetchChartTypes, fetchFieldSchema, resolvePivot, buildPivotSpec, AGGS, MAX_DIMENSIONS,
} from '@/lib/pivot';
import { annotateChartTypes, resolveSelection } from '@/lib/pivot-charts';
import { moveIndex } from '@/lib/reorder';
import { useI18n } from '@/lib/i18n';

const SOURCES = [
  { id: 'guided', label: 'Guided' },
  { id: 'bql', label: 'BQL' },
  { id: 'metric', label: 'Metric' },
];

/**
 * WidgetBuilder — the single, shared widget editor used by Dashboards, the Report Builder and
 * Reports. Source picker → measures (field + agg) → up to N dimensions (from /bql/schema) →
 * chart-type picker that OFFERS every type and flags the ones incompatible with the current
 * dimension/measure counts, suggesting a compatible alternative (smart compatibility / graceful
 * degradation). Live preview runs through /pivot. All data flows via the pivot client (one
 * apiClient — CLAUDE.md §3); tenant scope + field security are enforced server-side (RB-40 §1).
 *
 * Props:
 *   workspaceId — required to load the field schema + run previews
 *   value       — initial widget config { chartType, sourceKind, query, metricKey, mode,
 *                 measures:[{field,agg}], dimensions:[alias], filters }
 *   onSave(config) — called with the assembled config on "Save"
 *   onCancel()     — optional
 */
export function WidgetBuilder({ workspaceId, value, onSave, onCancel }) {
  const { t } = useI18n();
  const v = value || {};
  const [chartType, setChartType] = useState(v.chartType || 'bar');
  const [sourceKind, setSourceKind] = useState(v.sourceKind || 'guided');
  const [query, setQuery] = useState(v.query || '');
  const [metricKey, setMetricKey] = useState(v.metricKey || '');
  const [mode] = useState(v.mode || 'group');
  const [measures, setMeasures] = useState(v.measures && v.measures.length ? v.measures : [{ field: '*', agg: 'COUNT' }]);
  const [dimensions, setDimensions] = useState(v.dimensions || []);
  const [filters, setFilters] = useState(v.filters || '');

  const [chartTypes, setChartTypes] = useState([]);
  const [fields, setFields] = useState([]);
  const [schemaError, setSchemaError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const debounceRef = useRef(null);

  // Load the chart-type registry (cached) and the field allow-list (field-security filtered).
  useEffect(() => {
    let alive = true;
    fetchChartTypes().then((ct) => alive && setChartTypes(ct)).catch(() => alive && setChartTypes([]));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let alive = true;
    fetchFieldSchema(workspaceId)
      .then((s) => { if (alive) { setFields(s?.fields || []); setSchemaError(null); } })
      .catch((e) => { if (alive) setSchemaError(e.message || t('insights.widgetBuilder.couldNotLoadFields')); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const dimCount = dimensions.length;
  const measureCount = measures.length;
  const annotated = useMemo(
    () => annotateChartTypes(chartTypes, dimCount, measureCount),
    [chartTypes, dimCount, measureCount],
  );
  const selection = useMemo(
    () => resolveSelection(chartTypes, chartType, dimCount, measureCount),
    [chartTypes, chartType, dimCount, measureCount],
  );

  // Live preview — debounced so each keystroke/field change doesn't spam /pivot.
  useEffect(() => {
    if (!workspaceId) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const spec = buildPivotSpec({ sourceKind, query, metricKey, mode, measures, dimensions, filters });
      setPreviewLoading(true);
      setPreviewError(null);
      resolvePivot(workspaceId, spec)
        .then((res) => { setPreview(res); setPreviewLoading(false); })
        .catch((e) => { setPreviewError(e.message || t('insights.widgetBuilder.previewFailed')); setPreviewLoading(false); });
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, sourceKind, query, metricKey, mode, measures, dimensions, filters]);

  const fieldOptions = fields.map((f) => f.alias);
  const usedDims = new Set(dimensions);
  const availableDims = fieldOptions.filter((a) => !usedDims.has(a));

  const setMeasure = (i, patch) => setMeasures((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const addMeasure = () => setMeasures((ms) => [...ms, { field: fieldOptions[0] || '*', agg: 'SUM' }]);
  const removeMeasure = (i) => setMeasures((ms) => (ms.length > 1 ? ms.filter((_, j) => j !== i) : ms));
  const addDimension = () => { if (dimensions.length < MAX_DIMENSIONS && availableDims[0]) setDimensions((d) => [...d, availableDims[0]]); };
  const setDimension = (i, alias) => setDimensions((d) => d.map((x, j) => (j === i ? alias : x)));
  const removeDimension = (i) => setDimensions((d) => d.filter((_, j) => j !== i));
  // Dimension order is the pivot grouping order (primary → secondary), so reordering is meaningful.
  const moveDimension = (i, delta) => setDimensions((d) => moveIndex(d, i, delta));

  const handleSave = () => {
    // If the chosen chart doesn't fit, save the suggested compatible type instead (graceful).
    const effectiveType = selection.compatible ? chartType : (selection.suggestion?.id || 'pivot_table');
    onSave?.({ chartType: effectiveType, sourceKind, query, metricKey, mode, measures, dimensions, filters: filters || null });
  };

  const selectClass = 'text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40';

  return (
    <div className="space-y-4">
      {/* Source */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">{t('insights.widgetBuilder.dataSource')}</legend>
        <div className="flex flex-wrap items-center gap-1.5">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" onClick={() => setSourceKind(s.id)}
              aria-pressed={sourceKind === s.id}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${sourceKind === s.id ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {sourceKind === 'bql' && (
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="BQL query"
            placeholder="status = 'Open' AND priority IN ('HIGH','CRITICAL')"
            className="mt-2 w-full font-mono text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
        )}
        {sourceKind === 'metric' && (
          <input value={metricKey} onChange={(e) => setMetricKey(e.target.value)} aria-label="Metric key"
            placeholder="metric key (e.g. open_items)"
            className="mt-2 w-full text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
        )}
      </fieldset>

      {schemaError && (
        <p className="text-xs text-semantic-warning" role="alert">
          <AlertTriangle className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />
          {schemaError} You can still use COUNT(*) and BQL.
        </p>
      )}

      {/* Measures */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">{t('insights.widgetBuilder.measures')}</legend>
        <div className="space-y-1.5">
          {measures.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select aria-label={`Measure ${i + 1} aggregation`} value={m.agg} onChange={(e) => setMeasure(i, { agg: e.target.value })} className={selectClass}>
                {AGGS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <select aria-label={`Measure ${i + 1} field`} value={m.field} onChange={(e) => setMeasure(i, { field: e.target.value })} className={`${selectClass} flex-1`}>
                <option value="*">{t('insights.widgetBuilder.allItemsCount')}</option>
                {fieldOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <button type="button" onClick={() => removeMeasure(i)} disabled={measures.length <= 1}
                aria-label={`Remove measure ${i + 1}`}
                className="p-1 rounded text-neutral-500 hover:text-semantic-danger disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addMeasure}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-navy dark:text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('insights.widgetBuilder.addMeasure')}
        </button>
      </fieldset>

      {/* Dimensions */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">
          {t('insights.widgetBuilder.dimensions')} <span className="font-normal normal-case text-neutral-500">({dimCount} of {MAX_DIMENSIONS})</span>
        </legend>
        <div className="space-y-1.5">
          {dimensions.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select aria-label={`Dimension ${i + 1}`} value={d} onChange={(e) => setDimension(i, e.target.value)} className={`${selectClass} flex-1`}>
                <option value={d}>{d}</option>
                {availableDims.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {dimensions.length > 1 && (
                <>
                  <button type="button" onClick={() => moveDimension(i, -1)} disabled={i === 0} aria-label={`Move dimension ${i + 1} up`}
                    className="p-1 rounded text-neutral-500 hover:text-brand-navy disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveDimension(i, 1)} disabled={i === dimensions.length - 1} aria-label={`Move dimension ${i + 1} down`}
                    className="p-1 rounded text-neutral-500 hover:text-brand-navy disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => removeDimension(i)} aria-label={`Remove dimension ${i + 1}`}
                className="p-1 rounded text-neutral-500 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addDimension} disabled={dimensions.length >= MAX_DIMENSIONS || availableDims.length === 0}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-navy dark:text-brand-amber hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('insights.widgetBuilder.addDimension')}
        </button>
        {dimensions.length >= MAX_DIMENSIONS && (
          <p className="mt-1 text-2xs text-neutral-500">Maximum {MAX_DIMENSIONS} dimensions — the engine's cap (NFR).</p>
        )}
      </fieldset>

      {/* Optional extra filter */}
      <div>
        <label htmlFor="wb-filters" className="block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">Filter (BQL, optional)</label>
        <input id="wb-filters" value={filters} onChange={(e) => setFilters(e.target.value)}
          placeholder="created > daysAgo(30)"
          className="w-full font-mono text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
      </div>

      {/* Chart-type picker — offers every type, flags incompatible ones, suggests an alternative */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">{t('insights.widgetBuilder.chartType')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {annotated.map((c) => (
            <button key={c.id} type="button" onClick={() => setChartType(c.id)}
              aria-pressed={chartType === c.id}
              title={c.compatible ? c.label : `${c.label} — ${c.reason}`}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${
                chartType === c.id
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : c.compatible
                    ? 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy'
                    : 'border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
              }`}>
              {!c.compatible && <AlertTriangle className="inline-block h-3 w-3 mr-1 align-text-bottom" aria-hidden="true" />}
              {c.label}
            </button>
          ))}
        </div>
        {!selection.compatible && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-semantic-warning-surface dark:bg-neutral-800 p-2 text-xs text-neutral-700 dark:text-neutral-300" role="status">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-semantic-warning mt-0.5" aria-hidden="true" />
            <span>
              <span className="font-semibold">{selection.chosen?.label || chartType}</span> {selection.reason} for {dimCount} dimension{dimCount === 1 ? '' : 's'} and {measureCount} measure{measureCount === 1 ? '' : 's'}.
              {selection.suggestion && (
                <>
                  {' '}
                  <button type="button" onClick={() => setChartType(selection.suggestion.id)}
                    className="inline-flex items-center gap-1 font-semibold text-brand-navy dark:text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />Use {selection.suggestion.label} instead
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </fieldset>

      {/* Live preview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1.5">{t('insights.widgetBuilder.preview')}</p>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 min-h-24">
          <PivotChart
            type={selection.compatible ? chartType : (selection.suggestion?.id || 'pivot_table')}
            result={preview} loading={previewLoading} error={previewError} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>{t('insights.common.cancel')}</Button>}
        <Button variant="action" onClick={handleSave}>{t('insights.widgetBuilder.saveWidget')}</Button>
      </div>
    </div>
  );
}
