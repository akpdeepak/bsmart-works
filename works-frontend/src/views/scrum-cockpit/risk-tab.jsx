import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

export function RiskTab({ riskSprintId, setRiskSprintId, sprints, runRiskPanel, riskPanel, cockpitLoading }) {
  return (
    <div>
      <div className="flex items-end gap-2 mb-4">
        <Field label="Sprint">
          <select className="input text-sm" value={riskSprintId} onChange={e => setRiskSprintId(e.target.value)}>
            <option value="">Select sprint…</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Button variant="action" onClick={runRiskPanel}>Analyze</Button>
      </div>
      {cockpitLoading.risk && !riskPanel ? <CockpitSkeleton />
        : !riskPanel ? <EmptyState icon={AlertTriangle} title="Mid-sprint risk panel" subtitle="Live view of scope creep, stale items, unassigned work and breach predictions." />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Scope creep', riskPanel.scopeCreep, 'work_item_id'], ['Stale items', riskPanel.staleItems, 'id'], ['Unassigned', riskPanel.unassignedItems, 'id'], ['Breach risk', riskPanel.breachPredictions, 'id']].map(([label, rows]) => (
              <div key={label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{label}</h4>
                  <span className="text-lg font-bold text-brand-navy dark:text-white">{(rows || []).length}</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(rows || []).map((r, idx) => <p key={idx} className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{r.title || r.work_item_id || r.id}</p>)}
                  {(rows || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None — clear.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
