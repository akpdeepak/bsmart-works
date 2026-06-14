import { Megaphone, CheckCircle2, Reply, BarChart2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { StatCard } from '@/components/works/stat-card';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

export function ReviewTab({ reviewSprintId, setReviewSprintId, sprints, runReviewPrep, reviewResult, cockpitLoading }) {
  return (
    <div>
      <div className="flex items-end gap-2 mb-4">
        <Field label="Sprint">
          <select className="input text-sm" value={reviewSprintId} onChange={e => setReviewSprintId(e.target.value)}>
            <option value="">Select sprint…</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Button variant="action" onClick={runReviewPrep}>Draft review</Button>
      </div>
      {cockpitLoading.review && !reviewResult ? <CockpitSkeleton />
        : !reviewResult ? <EmptyState icon={Megaphone} title="Sprint review prep" subtitle="Auto-drafts the summary, demo list and metrics for stakeholders." />
        : (
          <div className="space-y-4">
            <AiMetaBadge meta={reviewResult.meta} narrative={reviewResult.narrative} />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Shipped" value={(reviewResult.shipped || []).length} sub={`${reviewResult.donePoints}/${reviewResult.totalPoints} pts`} color="text-semantic-success" icon={CheckCircle2} />
              <StatCard label="Slipped" value={(reviewResult.slipped || []).length} sub="not done" color="text-semantic-warning" icon={Reply} />
              <StatCard label="Completion" value={`${reviewResult.completionRate}%`} sub="of items" color="text-brand-navy" icon={BarChart2} />
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Demo list</h4>
              {(reviewResult.demoList || []).map(i => <p key={i.id} className="text-sm text-neutral-700 dark:text-neutral-200 py-0.5">• {i.title}</p>)}
              {(reviewResult.demoList || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">Nothing shipped yet.</p>}
            </div>
          </div>
        )}
    </div>
  );
}
