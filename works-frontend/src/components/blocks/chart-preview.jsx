// Know Studio chart preview (the "PowerBI" surface) — renders a chart block's rows with the
// design-system chart molecules (token colours only, accessible labels). Shared by the editor and
// the read-only renderer so both look identical. Exports only this component (fast-refresh safe).

import { parseChartData } from '@/lib/chart-data';
import { BarChart } from '@/components/works/molecules/bar-chart';
import { LineChart } from '@/components/works/molecules/line-chart';
import { DonutChart } from '@/components/works/molecules/donut-chart';

export function ChartPreview({ chartType = 'bar', rows = [] }) {
  const data = parseChartData(rows);
  if (data.length === 0) {
    return <p className="text-xs text-neutral-500">Add rows of label, value to see the chart.</p>;
  }
  if (chartType === 'line') return <LineChart data={data} area />;
  if (chartType === 'pie') return <DonutChart data={data} />;
  return <BarChart data={data} />;
}
