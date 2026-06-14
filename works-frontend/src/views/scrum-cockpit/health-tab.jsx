import { CheckCircle2, Construction, AlertTriangle, UserCheck, TrendingUp, Activity } from 'lucide-react';
import { StatCard } from '@/components/works/stat-card';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { RAG_TONE } from './_shared';

export function HealthTab({ digest }) {
  return (
    <div>
      {!digest ? <EmptyState icon={Activity} title="Sprint health" subtitle="An at-a-glance RAG verdict with delivery, impediment and ceremony-attendance roll-ups for the active sprint." />
        : (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${digest.rag?.status === 'RED' ? 'border-semantic-danger/40 bg-semantic-danger/5' : digest.rag?.status === 'AMBER' ? 'border-semantic-warning/40 bg-semantic-warning/5' : 'border-semantic-success/40 bg-semantic-success/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className={`h-5 w-5 ${RAG_TONE[digest.rag?.status] || RAG_TONE.GREEN}`} aria-hidden="true" />
                <span className={`text-sm font-bold uppercase tracking-wide ${RAG_TONE[digest.rag?.status] || RAG_TONE.GREEN}`}>{digest.rag?.status || 'GREEN'}</span>
                {digest.sprint && <span className="text-sm text-neutral-700 dark:text-neutral-200">{digest.sprint.name}{digest.sprintDayOf ? ` · day ${digest.sprintDayOf}/${digest.sprintDayTotal}` : ''}</span>}
                {!digest.sprint && <span className="text-sm text-neutral-600 dark:text-neutral-400">No active sprint</span>}
              </div>
              <ul className="mt-1 space-y-0.5">
                {(digest.rag?.reasons || []).map((r, idx) => <li key={idx} className="text-sm text-neutral-700 dark:text-neutral-200">• {r}</li>)}
              </ul>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Delivery" value={`${digest.deliveryRate}%`} sub={`${digest.deliveredPoints}/${digest.committedPoints} pts`} color="text-brand-navy" icon={CheckCircle2} />
              <StatCard label="Open impediments" value={digest.openImpediments} sub={`${digest.criticalOpenImpediments} critical`} color="text-semantic-warning" icon={Construction} />
              <StatCard label="SLA breaches" value={digest.slaBreachedImpediments} sub="critical > 1 day" color={digest.slaBreachedImpediments > 0 ? 'text-semantic-danger' : 'text-neutral-600'} icon={AlertTriangle} />
              <StatCard label="Attendance" value={digest.attendanceRate == null ? '—' : `${digest.attendanceRate}%`} sub={`${digest.ceremoniesHeld} ceremonies`} color="text-brand-navy" icon={UserCheck} />
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-brand-navy dark:text-neutral-200" aria-hidden="true" />
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Velocity — last {(digest.velocityTrend || []).length} sprint(s)</h4>
              </div>
              {(digest.velocityTrend || []).length === 0
                ? <p className="text-xs text-neutral-600 dark:text-neutral-400">No completed sprints yet.</p>
                : <div className="flex items-end gap-2 h-20">
                    {[...(digest.velocityTrend || [])].reverse().map((pts, idx) => {
                      const max = Math.max(1, ...(digest.velocityTrend || []));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1">
                          <div className="w-full bg-brand-navy rounded-sm" style={{ height: `${Math.round(pts * 100 / max)}%` }} />
                          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{pts}</span>
                        </div>
                      );
                    })}
                  </div>}
            </div>
          </div>
        )}
    </div>
  );
}
