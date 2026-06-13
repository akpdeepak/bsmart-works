import { DonutChart, BarChart } from '@/components/works/molecules';
import { LineChart } from '@/components/works/molecules/line-chart';
import { StackedBarChart, GroupedBarChart, HeatmapChart, MatrixTable } from '@/components/works/molecules/matrix-chart';
import { ScatterChart } from '@/components/works/molecules/scatter-chart';
import { TreemapChart, FunnelChart } from '@/components/works/molecules/treemap-chart';
import { Scorecard, Gauge, Sparkline } from '@/components/works/molecules/scalar-chart';
import { ComboChart } from '@/components/works/molecules/combo-chart';
import { PivotTable } from '@/components/works/molecules/pivot-table';
import { toSeries, toMatrix, toScalar, toPoints, toPaired } from '@/lib/pivot-series';

/**
 * PivotChart — the single dispatcher that turns a normalized pivot result
 * ({ dimensions, measures, rows }) into the renderer for `type`. Every surface (Dashboards,
 * Report Builder, Reports) renders pivot widgets through this one component, so the 19 chart
 * types live in exactly one place. Loading / empty / error are handled here so each surface
 * gets the five states for free (RB-30 §6); the pivot_table fallback renders any shape, so an
 * unknown/incompatible type degrades gracefully rather than blanking.
 *
 * Props:
 *   type        — chart-type id (bar, line, donut, heatmap, scorecard, …)
 *   result      — { dimensions, measures, rows } from the pivot client (preferred)
 *   rows/dimensions/measures — or pass the parts directly (convenience for tests)
 *   loading, error — state flags rendered before/over the chart
 */
export function PivotChart({ type = 'pivot_table', result, rows, dimensions, measures, loading = false, error = null, className }) {
  const data = result || { dimensions: dimensions || [], measures: measures || [], rows: rows || [] };

  if (loading) {
    return <div className={className} aria-busy="true" aria-live="polite">
      <div className="h-24 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700 motion-reduce:animate-none" />
      <span className="sr-only">Loading chart…</span>
    </div>;
  }

  if (error) {
    return <p className={`text-xs text-semantic-danger ${className || ''}`} role="alert">
      {typeof error === 'string' ? error : 'This chart could not load — adjust the fields and try again.'}
    </p>;
  }

  const empty = !data.rows || data.rows.length === 0;
  if (empty && type !== 'scorecard' && type !== 'gauge') {
    return <p className={`text-xs text-neutral-600 dark:text-neutral-400 ${className || ''}`}>No matching data — widen the filters or add a measure.</p>;
  }

  const wrap = (node) => <div className={className}>{node}</div>;

  switch (type) {
    case 'scorecard':
      return wrap(<Scorecard value={toScalar(data)} label={data.measures?.[0]} />);
    case 'gauge':
      return wrap(<Gauge value={toScalar(data)} label={data.measures?.[0]} />);
    case 'sparkline':
      return wrap(<Sparkline data={toSeries(data)} />);
    case 'pie':
    case 'donut':
      return wrap(<DonutChart data={toSeries(data)} />);
    case 'funnel':
      return wrap(<FunnelChart data={toSeries(data)} />);
    case 'treemap':
      return wrap(<TreemapChart data={toSeries(data)} />);
    case 'bar':
      return wrap(<BarChart data={toSeries(data)} />);
    case 'column':
      return wrap(<BarChart data={toSeries(data)} />);
    case 'line':
      return wrap(<LineChart data={toSeries(data)} />);
    case 'area':
      return wrap(<LineChart data={toSeries(data)} area />);
    case 'combo':
      return wrap(<ComboChart data={toPaired(data)} aLabel={data.measures?.[0]} bLabel={data.measures?.[1]} />);
    case 'stacked_bar':
      return wrap(<StackedBarChart matrix={toMatrix(data)} />);
    case 'grouped_bar':
      return wrap(<GroupedBarChart matrix={toMatrix(data)} />);
    case 'heatmap':
      return wrap(<HeatmapChart matrix={toMatrix(data)} />);
    case 'matrix':
      return wrap(<MatrixTable matrix={toMatrix(data)} />);
    case 'scatter':
      return wrap(<ScatterChart points={toPoints(data)} />);
    case 'bubble':
      return wrap(<ScatterChart points={toPoints(data)} bubble />);
    case 'pivot_table':
    default:
      return wrap(<PivotTable result={data} />);
  }
}
