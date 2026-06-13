// bSmart Works — Know Studio chart-data helpers (the "PowerBI" capability of the Know section).
// Pure and dependency-free (RB-10 §7): turn a chart block's raw rows into the
// `[{ label, value }]` shape the design-system chart molecules consume, and pull rows from a
// sibling sheet block so a chart can visualise live spreadsheet data without copy-paste.

import { evaluateSheet } from '@/lib/sheet-engine';

export const CHART_TYPES = ['bar', 'line', 'pie'];

/**
 * Normalise raw `[label, value]` rows into chart points. Non-numeric or blank values are dropped,
 * so a header row like `['Region', 'Sales']` is ignored automatically. Pure — never mutates input.
 *
 * @param {Array<Array<string>>} rows
 * @returns {Array<{label: string, value: number}>}
 */
export function parseChartData(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const label = row[0] == null ? '' : String(row[0]).trim();
    const rawValue = row[1];
    const value = Number(rawValue);
    if (label === '' || rawValue == null || String(rawValue).trim() === '' || !Number.isFinite(value)) {
      continue;
    }
    out.push({ label, value });
  }
  return out;
}

/**
 * Derive chart points from a sheet grid: the first column is the label, a chosen value column
 * (default the second column) is the numeric series. Formulas are evaluated first, so a chart can
 * plot computed totals. Returns `[]` for an empty/blank sheet.
 *
 * @param {string[][]} grid       raw sheet cells
 * @param {number} valueColIndex  zero-based column to read values from (default 1)
 * @param {boolean} skipHeader    drop the first row (treat as a header)
 */
export function chartDataFromSheet(grid, valueColIndex = 1, skipHeader = false) {
  const computed = evaluateSheet(grid);
  const body = skipHeader ? computed.slice(1) : computed;
  return parseChartData(body.map((row) => [row[0], row[valueColIndex]]));
}
