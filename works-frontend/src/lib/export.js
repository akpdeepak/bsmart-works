// Static exports for dashboards/reports — PNG, PDF and CSV (for spreadsheets).
// The heavy image/pdf libraries are dynamically imported so they never bloat the
// main bundle (CLAUDE.md §4.18 — route/feature-level code splitting).
//
// Note: "Excel" export is emitted as CSV (opens natively in Excel) rather than .xlsx.
// The npm `xlsx`/SheetJS package carries an unfixable HIGH advisory (prototype pollution
// + ReDoS) that fails the CI `npm audit --audit-level=high` gate, so CSV is the
// dependency-free, audit-clean substitute.

/** Serialise an array of flat row objects to a CSV string (RFC-4180 quoting). Pure. */
export function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download row objects as a .csv file (opens in Excel/Sheets). */
export function exportRowsToCsv(rows, filename) {
  const csv = rowsToCsv(rows);
  if (!csv) return;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

/** Rasterise a DOM element to a PNG download via html2canvas (lazy-loaded). */
export async function exportElementToPng(el, filename) {
  if (!el) return;
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, { backgroundColor: 'white', scale: 2 });
  downloadBlob(await new Promise((res) => canvas.toBlob(res, 'image/png')), `${filename}.png`);
}

/** Rasterise a DOM element and place it on an A4 PDF page (jsPDF + html2canvas, lazy-loaded). */
export async function exportElementToPdf(el, filename) {
  if (!el) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { backgroundColor: 'white', scale: 2 });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 24;
  const imgW = pdf.internal.pageSize.getWidth() - margin * 2;
  const imgH = (canvas.height / canvas.width) * imgW;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
  pdf.save(`${filename}.pdf`);
}
