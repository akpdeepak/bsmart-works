import { Repeat } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

export function PatternsTab({ runPatterns, patternsResult, cockpitLoading }) {
  return (
    <div>
      <Button variant="action" onClick={runPatterns}>Detect patterns</Button>
      {cockpitLoading.patterns && !patternsResult ? <div className="mt-4"><CockpitSkeleton /></div>
        : !patternsResult ? <div className="mt-4"><EmptyState icon={Repeat} title="Cross-sprint patterns" subtitle="Recurring impediments, repeated estimation misses, and common scope-creep sources." /></div>
        : (
          <div className="mt-4 space-y-4">
            <AiMetaBadge meta={patternsResult.meta} narrative={patternsResult.narrative} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Recurring impediments</h4>
                {(patternsResult.recurringImpediments || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.category} · {r.count}×</p>)}
                {(patternsResult.recurringImpediments || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
              </div>
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Estimation misses</h4>
                {(patternsResult.estimationMisses || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.sprintName}: −{r.missedBy} pts</p>)}
                {(patternsResult.estimationMisses || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
              </div>
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Scope-creep sources</h4>
                {(patternsResult.scopeCreepSources || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.actor || 'Unknown'} · {r.additions}×</p>)}
                {(patternsResult.scopeCreepSources || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
