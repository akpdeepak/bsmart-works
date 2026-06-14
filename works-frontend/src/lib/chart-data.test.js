import { describe, it, expect } from 'vitest';
import { parseChartData, chartDataFromSheet, CHART_TYPES } from '@/lib/chart-data';

describe('parseChartData', () => {
  it('keeps valid label/value pairs and coerces numeric strings', () => {
    expect(parseChartData([['Q1', '10'], ['Q2', '25']])).toEqual([
      { label: 'Q1', value: 10 },
      { label: 'Q2', value: 25 },
    ]);
  });

  it('drops a non-numeric header row automatically', () => {
    expect(parseChartData([['Region', 'Sales'], ['North', '5']])).toEqual([
      { label: 'North', value: 5 },
    ]);
  });

  it('skips blank labels, blank values and non-finite numbers', () => {
    expect(parseChartData([['', '4'], ['A', ''], ['B', 'NaN'], ['C', '3']])).toEqual([
      { label: 'C', value: 3 },
    ]);
  });

  it('tolerates non-array input', () => {
    expect(parseChartData(null)).toEqual([]);
    expect(parseChartData([null, 'x'])).toEqual([]);
  });

  it('exposes the supported chart types', () => {
    expect(CHART_TYPES).toEqual(['bar', 'line', 'pie']);
  });
});

describe('chartDataFromSheet', () => {
  it('reads labels from column A and evaluated values from column B', () => {
    const grid = [['Apples', '3'], ['Pears', '=1+1'], ['Total', '=SUM(B1:B2)']];
    expect(chartDataFromSheet(grid)).toEqual([
      { label: 'Apples', value: 3 },
      { label: 'Pears', value: 2 },
      { label: 'Total', value: 5 },
    ]);
  });

  it('can skip a header row and pick a different value column', () => {
    const grid = [['Name', 'Jan', 'Feb'], ['North', '10', '12'], ['South', '8', '9']];
    expect(chartDataFromSheet(grid, 2, true)).toEqual([
      { label: 'North', value: 12 },
      { label: 'South', value: 9 },
    ]);
  });
});
