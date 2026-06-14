import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { DonutChart } from '@/components/works/molecules';
import { Layers, Package, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { TodayCard, HealthRing, MiniBar, Empty, TodaySurface, getGreeting } from './_shared';

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT OWNER
// Focus: "What's the backlog and release state?" — grooming, release radar, features
// ═══════════════════════════════════════════════════════════════════════════════

const PCOLOR = { CRITICAL: 'bg-semantic-danger', HIGH: 'bg-semantic-warning', MEDIUM: 'bg-brand-navy', LOW: 'bg-neutral-400' };

const PRODUCT_OWNER_REGISTRY = {
  stat: (ctx, w) => {
    switch (w.config?.k) {
      case 'ungroomed':
        return <StatCard label="Ungroomed items" value={ctx.ungroomedCount} sub="No sprint assigned"
          color={ctx.ungroomedCount > 10 ? 'text-semantic-danger' : ctx.ungroomedCount > 5 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'}
          icon={Layers} onClick={() => ctx.setView('backlog')} />;
      case 'releases':
        return <StatCard label="Upcoming releases" value={ctx.upcoming.length} sub="Next 3 months" color="text-brand-navy" icon={Package} onClick={() => ctx.setView('releases')} />;
      case 'features':
        return <StatCard label="Features done" value={`${ctx.featurePct}%`} sub={`${ctx.featureStats.done}/${ctx.featureStats.total} stories`}
          color={ctx.featurePct >= 80 ? 'text-semantic-success' : 'text-brand-navy'} icon={CheckCircle2} />;
      default:
        return <StatCard label="Backlog size" value={ctx.totalBacklog} sub="Total open items" color="text-neutral-600 dark:text-neutral-400" icon={BarChart2} onClick={() => ctx.setView('backlog')} />;
    }
  },
  'upcoming-releases': (ctx) => (
    <TodayCard title="Upcoming releases" icon={Package} iconColor="text-brand-navy"
      action={() => ctx.setView('releases')}>
      {ctx.upcoming.length === 0
        ? <Empty msg="No upcoming releases in the next 3 months." />
        : (
          <div className="space-y-4">
            {ctx.upcoming.map(r => {
              const rel = ctx.allReleases.find(x => x.id === r.id) || r;
              const pct = (rel.total_items ?? 0) > 0 ? Math.round((rel.done_items || 0) * 100 / rel.total_items) : 0;
              const daysLeft = r.release_date
                ? Math.ceil((new Date(r.release_date) - new Date()) / 86400000)
                : null;
              return (
                <div key={r.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">{r.version}</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {daysLeft !== null && (
                        <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-semantic-danger' : daysLeft <= 30 ? 'text-semantic-warning' : 'text-neutral-500'}`}>
                          {daysLeft <= 0 ? 'Due today' : `${daysLeft}d left`}
                        </span>
                      )}
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{pct}%</span>
                    </div>
                  </div>
                  <MiniBar value={pct} max={100}
                    color={pct >= 80 ? 'bg-semantic-success' : pct >= 50 ? 'bg-brand-navy' : 'bg-brand-orange'} />
                  <p className="mt-1 text-xs text-neutral-500">
                    {rel.done_items ?? 0}/{rel.total_items ?? '?'} items
                    {r.release_date ? ` · ${r.release_date}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
    </TodayCard>
  ),
  'backlog-health': (ctx) => (
    <TodayCard title="Backlog health" icon={BarChart2} iconColor="text-brand-navy">
      {ctx.priorityDist.length === 0
        ? <Empty msg="No backlog data." />
        : (
          <div className="space-y-3">
            {ctx.priorityDist.map(p => (
              <div key={p.priority}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{p.priority}</span>
                  <span className="text-neutral-500">{p.count}</span>
                </div>
                <MiniBar value={p.count || 0} max={ctx.maxPri} color={PCOLOR[p.priority] || 'bg-neutral-400'} />
              </div>
            ))}
            <p className="pt-1 text-xs text-neutral-500">{ctx.totalBacklog} total items</p>
          </div>
        )}
    </TodayCard>
  ),
  'backlog-composition': (ctx) => (
    <TodayCard title="Backlog composition" icon={Layers} iconColor="text-brand-navy"
      action={() => ctx.setView('backlog')}>
      <DonutChart data={ctx.backlogByType.map(t => ({ label: t.type || 'None', value: Number(t.count) || 0 }))} />
      <p className="mt-3 text-xs text-neutral-500">Open items by type</p>
    </TodayCard>
  ),
  'feature-completion': (ctx) => (
    <TodayCard title="Feature completion" icon={CheckCircle2} iconColor="text-semantic-success">
      <div className="flex items-center gap-5">
        <HealthRing pct={ctx.featurePct} size={84}
          stroke={ctx.featurePct >= 80 ? 'stroke-semantic-success' : 'stroke-brand-navy'} label="done" />
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {ctx.featureStats.done ?? 0} of {ctx.featureStats.total ?? 0} stories done
          </p>
          <p className="mt-1 text-xs text-neutral-500">Across the whole backlog</p>
          <button type="button" onClick={() => ctx.setView('reports')}
            className="mt-2 text-xs font-medium text-brand-navy hover:underline focus-visible:outline-none">
            View reports →
          </button>
        </div>
      </div>
    </TodayCard>
  ),
  ungroomed: (ctx) => (
    <TodayCard
      title={`Ungroomed items${ctx.ungroomedCount > ctx.ungroomed.length ? ` (${ctx.ungroomedCount})` : ''}`}
      icon={AlertCircle} iconColor="text-semantic-warning"
      action={() => ctx.setView('backlog')} actionLabel="Groom backlog"
      className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            <th scope="col" className="px-5 py-2">Item</th>
            <th scope="col" className="px-3 py-2">Priority</th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {ctx.ungroomed.slice(0, 6).map(item => (
            <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <td className="px-5 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <TypeBadge type={item.type} compact />
                  <span className="truncate text-neutral-900 dark:text-neutral-100">{item.title}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">{item.priority || '—'}</td>
              <td className="hidden px-3 py-2.5 text-xs text-neutral-600 sm:table-cell dark:text-neutral-400">{item.story_points ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TodayCard>
  ),
};

export function ProductOwnerToday({ data, currentUser, setView, layout, builtinLayout, edit }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const upcoming = data?.upcomingReleases || [];
  const allReleases = data?.releases || [];
  const ungroomed = data?.ungroomedItems || [];
  const ungroomedCount = data?.ungroomedCount ?? ungroomed.length;
  // The API key is priorityDistribution; keep the old key as a fallback.
  const priorityDist = data?.priorityDistribution || data?.priorityDist || [];
  const backlogByType = data?.backlogByType || [];
  const featureStats = data?.featureStats || { total: 0, done: 0 };
  const featurePct = featureStats.total > 0 ? Math.round(featureStats.done * 100 / featureStats.total) : 0;
  const totalBacklog = backlogByType.reduce((s, x) => s + (x.count || 0), 0);
  const maxPri = Math.max(...priorityDist.map(p => p.count || 0), 1);

  const subtitle = [
    `${ungroomedCount} ungroomed item${ungroomedCount !== 1 ? 's' : ''}`,
    upcoming.length ? `${upcoming.length} upcoming release${upcoming.length !== 1 ? 's' : ''}` : null,
    `${featurePct}% features done`,
  ].filter(Boolean).join(' · ');

  const ctx = {
    upcoming, allReleases, ungroomed, ungroomedCount, priorityDist, backlogByType,
    featureStats, featurePct, totalBacklog, maxPri, setView,
  };

  return (
    <TodaySurface
      header={{ greeting: getGreeting(), firstName, rolePill: 'Product Owner', subtitle, cta: 'View backlog', onCta: () => setView('backlog') }}
      registry={PRODUCT_OWNER_REGISTRY} ctx={ctx} layout={layout} builtinLayout={builtinLayout} edit={edit} />
  );
}
