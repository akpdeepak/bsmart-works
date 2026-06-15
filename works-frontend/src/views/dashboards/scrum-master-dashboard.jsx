import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { BarChart, PairedBars } from '@/components/works/molecules';
import { velocityPairs, timeboxProgress, utilizationSeries } from '@/lib/today-metrics';
import { Zap, TrendingUp, Users, AlertTriangle, Activity } from 'lucide-react';
import { TodayCard, HealthRing, MiniBar, Empty, TodaySurface } from './_shared';
import { getTimeOfDay as getGreeting } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// SCRUM MASTER
// Focus: "Is the sprint healthy?" — risk items, velocity, team capacity
// ═══════════════════════════════════════════════════════════════════════════════

const SCRUM_MASTER_REGISTRY = {
  stat: (ctx, w) => {
    switch (w.config?.k) {
      case 'health':
        return <StatCard label="Sprint health" value={`${ctx.sprintPct}%`} sub={ctx.activeSprint?.name || 'No sprint'} color={ctx.sprintColor} icon={TrendingUp} onClick={() => ctx.setView('sprint')} />;
      case 'risk':
        return <StatCard label="High-risk items" value={ctx.highRisk.length} sub="CRITICAL/HIGH, not done" color={ctx.highRisk.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={AlertTriangle} />;
      case 'scope':
        return <StatCard label="Scope changes" value={ctx.scopeChanges.length} sub="This sprint" color={ctx.scopeChanges.length > 2 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'} icon={Activity} />;
      default:
        return <StatCard label="Velocity" value={`${ctx.velocityDone}pt`} sub="Last sprint" color="text-brand-navy" icon={Zap} />;
    }
  },
  'high-risk': (ctx) => (
    <TodayCard title="High-risk items" icon={AlertTriangle} iconColor="text-semantic-danger"
      action={() => ctx.setView('board')} className="overflow-hidden">
      {ctx.highRisk.length === 0
        ? <Empty msg="No high-risk items — sprint looks healthy." />
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                <th scope="col" className="px-5 py-2">Item</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {ctx.highRisk.slice(0, 8).map(item => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td className="px-5 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <TypeBadge type={item.type} compact />
                      <span className="truncate text-neutral-900 dark:text-neutral-100">{item.title}</span>
                      <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-bold uppercase ${
                        item.priority === 'CRITICAL'
                          ? 'bg-semantic-danger/10 text-semantic-danger'
                          : 'bg-semantic-warning/10 text-semantic-warning'
                      }`}>{item.priority}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs text-neutral-600 sm:table-cell dark:text-neutral-400">
                    {item.assignee_name || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </TodayCard>
  ),
  'at-a-glance': (ctx) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
        <Activity className="h-4 w-4 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" />At a glance
      </h3>
      {ctx.activeSprint ? (
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Completion', pct: ctx.sprintPct, stroke: ctx.sprintStroke, label: 'done' },
            { title: 'Points', pct: ctx.pointsPct, stroke: ctx.pointsStroke, label: 'pts' },
            { title: 'Time', pct: ctx.timebox?.timePct ?? 0, stroke: 'stroke-brand-navy-tint', label: 'elapsed' },
          ].map((r) => (
            <div key={r.title} className="flex flex-col items-center gap-2 text-center">
              <HealthRing pct={r.pct} size={72} stroke={r.stroke} label={r.label} />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{r.title}</p>
            </div>
          ))}
        </div>
      ) : <Empty msg="No active sprint." />}
    </div>
  ),
  'sprint-health': (ctx) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
        <Zap className="h-4 w-4 text-semantic-success" aria-hidden="true" />Sprint health
      </h3>
      {ctx.activeSprint ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <HealthRing pct={ctx.sprintPct} size={84} stroke={ctx.sprintStroke} label="done" />
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ctx.activeSprint.name}</p>
            {ctx.activeSprint.goal && (
              <p className="mt-1 line-clamp-2 text-xs italic text-neutral-500">&ldquo;{ctx.activeSprint.goal}&rdquo;</p>
            )}
            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              {ctx.activeSprint.done_items}/{ctx.activeSprint.total_items} items · {ctx.activeSprint.done_points}/{ctx.activeSprint.total_points}pt
            </p>
          </div>
        </div>
      ) : <Empty msg="No active sprint." />}
      {ctx.timebox && (
        <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">Time elapsed</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{ctx.timebox.timePct}%</span>
          </div>
          <MiniBar value={ctx.timebox.timePct} max={100} color="bg-brand-navy-tint" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">Scope done</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{ctx.timebox.scopePct}%</span>
          </div>
          <MiniBar value={ctx.timebox.scopePct} max={100}
            color={ctx.timebox.drift >= 0 ? 'bg-semantic-success' : 'bg-semantic-warning'} />
          <p className="pt-1 text-xs text-neutral-500">
            {ctx.timebox.daysLeft}d left · {ctx.timebox.drift >= 0
              ? `${ctx.timebox.drift}% ahead of the clock`
              : `${-ctx.timebox.drift}% behind the clock`}
          </p>
        </div>
      )}
    </div>
  ),
  velocity: (ctx) => (
    <TodayCard title="Velocity trend" icon={TrendingUp} iconColor="text-brand-navy">
      {ctx.velocity.length === 0
        ? <Empty msg="No sprint history yet." />
        : (
          <>
            <PairedBars data={velocityPairs(ctx.velocity)} aLabel="Committed" bLabel="Delivered" />
            <p className="mt-3 text-xs text-neutral-500">
              Story points · last {Math.min(ctx.velocity.length, 6)} sprint{ctx.velocity.length === 1 ? '' : 's'}
            </p>
          </>
        )}
    </TodayCard>
  ),
  capacity: (ctx) => (
    <TodayCard title="Team capacity" icon={Users} iconColor="text-brand-navy">
      {ctx.capacity.length === 0
        ? <Empty msg="No capacity data this sprint." />
        : (
          <>
            <BarChart data={utilizationSeries(ctx.capacity, 7)} />
            <p className="mt-3 text-xs text-neutral-500">Hours logged · last 14 days</p>
          </>
        )}
    </TodayCard>
  ),
};

export function ScrumMasterToday({ data, currentUser, setView, layout, builtinLayout, edit }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const sprints = data?.activeSprints || [];
  const activeSprint = sprints[0];
  const sprintPct = data?.sprintHealth
    ?? (activeSprint?.total_items > 0 ? Math.round(activeSprint.done_items * 100 / activeSprint.total_items) : 0);
  const highRisk = data?.highRiskItems || [];
  const velocity = data?.velocityTrend || [];
  const capacity = data?.teamCapacity || [];
  const scopeChanges = data?.scopeChanges || [];

  const lastSprint = velocity[velocity.length - 1];
  const velocityDone = lastSprint?.done_points ?? 0;
  const timebox = timeboxProgress(activeSprint);

  const sprintStroke = sprintPct >= 70 ? 'stroke-semantic-success' : sprintPct >= 40 ? 'stroke-semantic-warning' : 'stroke-semantic-danger';
  const sprintColor  = sprintPct >= 70 ? 'text-semantic-success'  : sprintPct >= 40 ? 'text-semantic-warning'  : 'text-semantic-danger';

  const subtitle = [
    activeSprint ? `${activeSprint.name} at ${sprintPct}%` : 'No active sprint',
    highRisk.length ? `${highRisk.length} high-risk item${highRisk.length !== 1 ? 's' : ''}` : null,
    scopeChanges.length ? `${scopeChanges.length} scope change${scopeChanges.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const pointsPct = activeSprint?.total_points > 0
    ? Math.round((activeSprint.done_points || 0) * 100 / activeSprint.total_points) : 0;
  const pointsStroke = pointsPct >= 70 ? 'stroke-semantic-success' : pointsPct >= 40 ? 'stroke-semantic-warning' : 'stroke-semantic-danger';

  const ctx = {
    sprintPct, sprintColor, sprintStroke, pointsPct, pointsStroke, activeSprint, highRisk, velocity, capacity,
    scopeChanges, velocityDone, timebox, setView,
  };

  return (
    <TodaySurface
      header={{ greeting: getGreeting(), firstName, rolePill: 'Scrum Master', subtitle, cta: 'View sprint', onCta: () => setView('sprint') }}
      registry={SCRUM_MASTER_REGISTRY} ctx={ctx} layout={layout} builtinLayout={builtinLayout} edit={edit} />
  );
}
