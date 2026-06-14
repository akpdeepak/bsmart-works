import { StatCard } from '@/components/works/stat-card';
import { BarChart } from '@/components/works/molecules';
import { utilizationSeries } from '@/lib/today-metrics';
import { TrendingUp, Users, AlertTriangle, Package, Target, Clock } from 'lucide-react';
import { TodayCard, HealthRing, MiniBar, Empty, TodaySurface, getGreeting } from './_shared';

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE / LEADERSHIP
// Focus: "Is the portfolio on track?" — project health, RAID, release schedule
// ═══════════════════════════════════════════════════════════════════════════════

const EXECUTIVE_RAID_CFG = [
  { type: 'risks',        label: 'Risks',        textColor: 'text-semantic-danger',  bgColor: 'bg-semantic-danger/10' },
  { type: 'issues',       label: 'Issues',       textColor: 'text-semantic-warning', bgColor: 'bg-semantic-warning/10' },
  { type: 'actions',      label: 'Actions',      textColor: 'text-brand-navy',       bgColor: 'bg-brand-navy/10' },
  { type: 'dependencies', label: 'Dependencies', textColor: 'text-neutral-700 dark:text-neutral-300', bgColor: 'bg-neutral-100 dark:bg-neutral-700' },
];

const EXECUTIVE_REGISTRY = {
  stat: (ctx, w) => {
    switch (w.config?.k) {
      case 'health':
        return <StatCard label="Portfolio health" value={`${ctx.health}%`} sub="Items done across projects" color={ctx.healthColor} icon={TrendingUp} />;
      case 'overdue':
        return <StatCard label="Overdue actions" value={ctx.overdueActions.length} sub="From RAID tracker"
          color={ctx.overdueActions.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Clock} />;
      case 'risks':
        return <StatCard label="Open risks/issues" value={ctx.openRisks + ctx.openIssues} sub={`${ctx.openRisks} risks · ${ctx.openIssues} issues`}
          color={(ctx.openRisks + ctx.openIssues) > 5 ? 'text-semantic-danger' : 'text-semantic-warning'} icon={AlertTriangle} />;
      default:
        return <StatCard label="Team utilization" value={ctx.teamUtil.length} sub="Active members (30d)" color="text-brand-navy" icon={Users} />;
    }
  },
  'at-a-glance': (ctx) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
        <TrendingUp className="h-4 w-4 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" />At a glance
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Portfolio health', pct: ctx.health, label: 'done' },
          { title: 'On-track projects', pct: ctx.onTrackPct, label: 'on track' },
          { title: 'Release readiness', pct: ctx.releaseReadiness, label: 'ready' },
        ].map((r) => (
          <div key={r.title} className="flex flex-col items-center gap-2 text-center">
            <HealthRing pct={r.pct} size={72}
              stroke={r.pct >= 70 ? 'stroke-semantic-success' : r.pct >= 40 ? 'stroke-semantic-warning' : 'stroke-semantic-danger'} label={r.label} />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{r.title}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  'project-portfolio': (ctx) => (
    <TodayCard title="Project portfolio" icon={Target} iconColor="text-brand-navy" action={() => ctx.setView('projects')}>
      {ctx.portfolio.length === 0
        ? <Empty msg="No projects found." />
        : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ctx.portfolio.map(p => {
              const pct = p.total_items > 0 ? Math.round(p.done_items * 100 / p.total_items) : 0;
              const riskLevel = p.high_priority_open > 3 ? 'danger' : p.high_priority_open > 0 ? 'warning' : 'ok';
              const pctColor = pct >= 80 ? 'bg-semantic-success' : pct >= 50 ? 'bg-brand-navy' : 'bg-brand-orange';
              return (
                <div key={p.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                  <div className="mb-2 flex items-start justify-between gap-1">
                    <p className="line-clamp-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</p>
                    <span className={`flex-shrink-0 text-sm font-bold ${riskLevel === 'danger' ? 'text-semantic-danger' : riskLevel === 'warning' ? 'text-semantic-warning' : 'text-semantic-success'}`}>
                      {pct}%
                    </span>
                  </div>
                  <MiniBar value={pct} max={100} color={pctColor} />
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                    <span>{p.done_items}/{p.total_items} items</span>
                    {p.high_priority_open > 0 && (
                      <span className={riskLevel === 'danger' ? 'text-semantic-danger' : 'text-semantic-warning'}>
                        {p.high_priority_open} high-risk
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </TodayCard>
  ),
  'raid-pulse': (ctx) => (
    <TodayCard title="RAID pulse" icon={AlertTriangle} iconColor="text-semantic-warning">
      <div className="grid grid-cols-2 gap-3">
        {EXECUTIVE_RAID_CFG.map(cfg => {
          const item = ctx.raidSummary.find(r => r.type === cfg.type);
          return (
            <div key={cfg.type} className={`rounded-lg p-3 ${cfg.bgColor}`}>
              <p className={`text-2xl font-bold ${cfg.textColor}`}>{item?.open ?? 0}</p>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{cfg.label}</p>
              <p className="text-xs text-neutral-500">of {item?.total ?? 0} total</p>
            </div>
          );
        })}
      </div>
    </TodayCard>
  ),
  'release-schedule': (ctx) => (
    <TodayCard title="Release schedule" icon={Package} iconColor="text-brand-navy" action={() => ctx.setView('releases')}>
      {ctx.releaseSchedule.length === 0
        ? <Empty msg="No upcoming releases." />
        : (
          <div className="space-y-3">
            {ctx.releaseSchedule.slice(0, 4).map(r => {
              const pct = r.total_items > 0 ? Math.round(r.done_items * 100 / r.total_items) : 0;
              return (
                <div key={r.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{r.name}</span>
                    <span className="flex-shrink-0 text-xs text-neutral-500">{r.release_date || 'TBD'}</span>
                  </div>
                  <MiniBar value={pct} max={100} color={pct >= 80 ? 'bg-semantic-success' : 'bg-brand-navy'} />
                </div>
              );
            })}
          </div>
        )}
    </TodayCard>
  ),
  'team-utilization': (ctx) => (
    <TodayCard title="Team utilization" icon={Users} iconColor="text-brand-navy">
      {ctx.teamUtil.length === 0
        ? <Empty msg="No time logged in the last 30 days." />
        : (
          <>
            <BarChart data={utilizationSeries(ctx.teamUtil, 8)} />
            <p className="mt-3 text-xs text-neutral-500">Hours logged · last 30 days</p>
          </>
        )}
    </TodayCard>
  ),
  'overdue-actions': (ctx) => (
    <TodayCard title={`Overdue actions (${ctx.overdueActions.length})`} icon={Clock} iconColor="text-semantic-danger" className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            <th scope="col" className="px-5 py-2">Action</th>
            <th scope="col" className="px-3 py-2">Due</th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {ctx.overdueActions.slice(0, 5).map(a => (
            <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <td className="max-w-xs truncate px-5 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{a.title}</td>
              <td className="px-3 py-2.5 text-xs text-semantic-danger">{a.due_date}</td>
              <td className="hidden px-3 py-2.5 text-xs text-neutral-600 sm:table-cell dark:text-neutral-400">{a.owner_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TodayCard>
  ),
};

export function ExecutiveToday({ data, currentUser, setView, layout, builtinLayout, edit }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const portfolio = data?.projectPortfolio || [];
  const raidSummary = data?.raidSummary || [];
  const releaseSchedule = data?.releaseSchedule || [];
  const teamUtil = data?.teamUtilization || [];
  const health = data?.overallHealth ?? 0;
  const overdueActions = data?.overdueActions || [];

  const openRisks  = raidSummary.find(r => r.type === 'risks')?.open ?? 0;
  const openIssues = raidSummary.find(r => r.type === 'issues')?.open ?? 0;

  const healthColor = health >= 70 ? 'text-semantic-success' : health >= 40 ? 'text-semantic-warning' : 'text-semantic-danger';

  const subtitle = [
    `Portfolio at ${health}%`,
    overdueActions.length ? `${overdueActions.length} overdue action${overdueActions.length !== 1 ? 's' : ''}` : null,
    (openRisks + openIssues) > 0 ? `${openRisks + openIssues} open risks/issues` : null,
  ].filter(Boolean).join(' · ');

  const onTrackPct = portfolio.length
    ? Math.round(portfolio.filter(p => p.total_items > 0 && (p.done_items * 100 / p.total_items) >= 70).length * 100 / portfolio.length)
    : 0;
  const releaseReadiness = releaseSchedule.length
    ? Math.round(releaseSchedule.reduce((s, r) => s + ((r.total_items ?? 0) > 0 ? (r.done_items || 0) * 100 / r.total_items : 0), 0) / releaseSchedule.length)
    : 0;

  const ctx = {
    health, healthColor, overdueActions, openRisks, openIssues, teamUtil,
    portfolio, raidSummary, releaseSchedule, onTrackPct, releaseReadiness, setView,
  };

  return (
    <TodaySurface
      header={{ greeting: getGreeting(), firstName, rolePill: 'Leadership', subtitle, cta: 'View portfolio', onCta: () => setView('projects') }}
      registry={EXECUTIVE_REGISTRY} ctx={ctx} layout={layout} builtinLayout={builtinLayout} edit={edit} />
  );
}
