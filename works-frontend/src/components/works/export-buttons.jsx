import { useState } from 'react';
import { exportElementToPng, exportRowsToCsv, downloadExport } from '@/lib/export';

/**
 * ExportButtons — static export controls for a dashboard or report (Cap J).
 *
 * PDF and Excel are SERVER-rendered via `endpoint` (e.g. `/reports/RPT-1/export`) — real files for
 * stakeholders without Works access, workspace-scoped + RBAC-enforced server-side. PNG captures the
 * rendered charts client-side (html2canvas over `targetId`); CSV serialises the supplied flat rows.
 *
 * Each button manages its own loading state and reports failures through `onError`.
 *
 * Extracted from App.jsx (TD-003); server export wired for issue 247 (Cap J static exports).
 */
export function ExportButtons({ endpoint, targetId, rows, filename, onError }) {
  const [busy, setBusy] = useState(null); // which format is currently exporting
  const run = async (format, fn) => {
    setBusy(format);
    try {
      await fn();
    } catch {
      if (onError) onError();
    } finally {
      setBusy(null);
    }
  };
  const cls = 'text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const label = (text, format) => (busy === format ? `${text}…` : text);
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mr-0.5">Export</span>
      <button type="button" className={cls} disabled={busy != null}
        onClick={() => run('pdf', () => (endpoint
          ? downloadExport(endpoint, 'pdf', filename)
          : Promise.reject(new Error('No export endpoint'))))}>{label('PDF', 'pdf')}</button>
      <button type="button" className={cls} disabled={busy != null}
        onClick={() => run('xlsx', () => (endpoint
          ? downloadExport(endpoint, 'xlsx', filename)
          : exportRowsToCsv(rows, filename)))}>{label('Excel', 'xlsx')}</button>
      <button type="button" className={cls} disabled={busy != null}
        onClick={() => run('csv', () => exportRowsToCsv(rows, filename))}>{label('CSV', 'csv')}</button>
      <button type="button" className={cls} disabled={busy != null}
        onClick={() => run('png', () => exportElementToPng(document.getElementById(targetId), filename))}>{label('PNG', 'png')}</button>
    </div>
  );
}
