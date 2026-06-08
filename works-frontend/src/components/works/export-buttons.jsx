import { exportElementToPng, exportElementToPdf, exportRowsToCsv } from '@/lib/export';

/**
 * ExportButtons — PNG / PDF / CSV export controls for a dashboard or report.
 * PNG/PDF capture the element with id=targetId; CSV uses the supplied flat rows.
 * Heavy libs are lazy-loaded inside the export helpers.
 *
 * Extracted from App.jsx (TD-003).
 */
export function ExportButtons({ targetId, rows, filename, onError }) {
  const run = async (fn) => { try { await fn(); } catch { if (onError) onError(); } };
  const cls = 'text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors';
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mr-0.5">Export</span>
      <button type="button" className={cls} onClick={() => run(() => exportElementToPdf(document.getElementById(targetId), filename))}>PDF</button>
      <button type="button" className={cls} onClick={() => run(() => exportRowsToCsv(rows, filename))}>CSV</button>
      <button type="button" className={cls} onClick={() => run(() => exportElementToPng(document.getElementById(targetId), filename))}>PNG</button>
    </div>
  );
}
