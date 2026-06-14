import { LayoutDashboard, TrendingUp, Zap, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { StatCard } from '@/components/works/stat-card';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

// Note: the "AI Sprint Plan" button that previously called aiClient.generate with the unknown
// kind 'sprint_plan' has been removed. The real AI-backed capacity suggestion is delivered by
// the "Suggest commit" button via /cockpit/sprint-planning (runSprintPlanning), which returns
// planningResult.narrative already powered by AiControlPlane. Calling generate() with an
// unrecognised kind silently returned the user-story scaffold — audit finding #17.
export function PlanningTab({
  planningTimeOff, setPlanningTimeOff, runSprintPlanning, planningResult, cockpitLoading,
}) {
  return (
    <div>
      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <Field label="Time off (points)"><input type="number" className="input text-sm w-28" value={planningTimeOff} onChange={e => setPlanningTimeOff(e.target.value)} /></Field>
        <Button variant="action" onClick={runSprintPlanning}>Suggest commit</Button>
      </div>
      {cockpitLoading.planning && !planningResult ? <CockpitSkeleton />
        : !planningResult ? <EmptyState icon={LayoutDashboard} title="Sprint planning helper" subtitle="Capacity from rolling velocity, an AI-suggested commit, and the refined-item list." />
        : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Avg velocity" value={planningResult.averageVelocity} sub="last 3 sprints" color="text-brand-navy" icon={TrendingUp} />
              <StatCard label="Capacity" value={planningResult.capacity} sub="velocity − time off" color="text-semantic-success" icon={Zap} />
              <StatCard label="Suggested" value={planningResult.suggestedPoints} sub="points committed" color="text-brand-navy" icon={CheckCircle2} />
              <StatCard label="Ready" value={planningResult.readyCount} sub="refined items" color="text-neutral-600" icon={ClipboardList} />
            </div>
            <AiMetaBadge meta={planningResult.meta} narrative={planningResult.narrative} />
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Suggested commit</h4>
              {(planningResult.suggestedItems || []).map(i => (
                <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority}</span>
                  <span className="text-xs font-mono text-brand-navy">{i.story_points} pts</span>
                </div>
              ))}
              {(planningResult.suggestedItems || []).length === 0 && <p className="text-xs text-neutral-600">No ready items fit the capacity.</p>}
            </div>
          </div>
        )}
    </div>
  );
}
