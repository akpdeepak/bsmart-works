import { RotateCcw } from 'lucide-react';
import { configClient } from '@/lib/customization';
import { absoluteDateTime } from '@/lib/format';
import { BTN_GHOST, DiffTable, Empty } from './shared';

// ── Versions tab ────────────────────────────────────────────────────────────────
export function VersionsTab({ workspaceId, versions, diffRows, setDiffRows, canManage, toast, onChanged }) {
  async function showDiff(version) {
    try {
      const rows = await configClient.diff(workspaceId, version, 0);
      setDiffRows({ version, rows });
    } catch (e) {
      toast(e.message || 'Diff failed.', 'error');
    }
  }
  async function rollback(version) {
    try {
      const saved = await configClient.rollback(workspaceId, version);
      toast(`Rolled back to version ${version} (now version ${saved.currentVersion}).`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Rollback failed.', 'error');
    }
  }
  if (!versions.length) {
    return <Empty title="No versions yet" hint="Save a change in Settings to create the first version." />;
  }
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Version {v.versionNumber}
                <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800">{v.source}</span>
              </p>
              <p className="text-xs text-neutral-600">
                {v.summary || 'No summary'} · {absoluteDateTime(v.createdAt)}{v.createdBy ? ` · ${v.createdBy}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => showDiff(v.versionNumber)}>Diff vs live</button>
              {canManage && (
                <button type="button" className={BTN_GHOST} onClick={() => rollback(v.versionNumber)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Roll back
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {diffRows && <DiffTable title={`Version ${diffRows.version} → live`} rows={diffRows.rows} />}
    </div>
  );
}
