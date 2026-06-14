import { BarChart2, ClipboardList, CheckCircle2, Repeat, UserCheck } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { StatCard } from '@/components/works/stat-card';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

export function VarianceTab({ varianceSprintId, setVarianceSprintId, sprints, runVariance, varianceResult, cockpitLoading }) {
  return (
    <div>
      <div className="flex items-end gap-2 mb-4">
        <Field label="Sprint">
          <select className="input text-sm" value={varianceSprintId} onChange={e => setVarianceSprintId(e.target.value)}>
            <option value="">Select sprint…</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Button variant="action" onClick={runVariance}>Analyze</Button>
      </div>
      {cockpitLoading.variance && !varianceResult ? <CockpitSkeleton />
        : !varianceResult ? <EmptyState icon={BarChart2} title="Sprint variance" subtitle="Committed vs delivered, day-by-day burndown, scope change, ceremony attendance and action follow-through." />
        : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Committed" value={varianceResult.committedPoints} sub={`${varianceResult.itemCount} items`} color="text-brand-navy" icon={ClipboardList} />
              <StatCard label="Delivered" value={varianceResult.deliveredPoints} sub={`${varianceResult.doneItemCount} done · ${varianceResult.deliveryRate}%`} color="text-semantic-success" icon={CheckCircle2} />
              <StatCard label="Scope change" value={`+${varianceResult.scopeAddedAfterStart} / −${varianceResult.scopeRemoved}`} sub="added / removed" color="text-semantic-warning" icon={Repeat} />
              <StatCard label="Attendance" value={`${varianceResult.attendanceRate}%`} sub={`${varianceResult.ceremoniesHeld} ceremonies`} color="text-brand-navy" icon={UserCheck} />
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">Burndown — points remaining per day</h4>
              {(varianceResult.burndown || []).length === 0
                ? <p className="text-xs text-neutral-600 dark:text-neutral-400">No burndown yet — the sprint needs a start date and completed items with story points.</p>
                : <div className="space-y-1">
                    {(varianceResult.burndown || []).map(d => (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{new Date(d.date).toLocaleDateString()}</span>
                        <div className="flex-1 h-3 rounded-sm bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                          <div className="h-full bg-brand-navy rounded-sm" style={{ width: `${varianceResult.committedPoints > 0 ? Math.round(d.remaining * 100 / varianceResult.committedPoints) : 0}%` }} />
                        </div>
                        <span className="text-xs font-mono text-neutral-900 dark:text-neutral-100 w-10 text-right">{d.remaining}</span>
                      </div>
                    ))}
                  </div>}
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100">Retro & meeting actions</h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{varianceResult.actionDone} of {varianceResult.actionTotal} actions completed ({varianceResult.actionFollowThroughRate}%) since the sprint started.</p>
              {varianceResult.actionTotal === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">No actions captured in this window — convert retro notes into action items so improvements get tracked.</p>}
            </div>
          </div>
        )}
    </div>
  );
}
