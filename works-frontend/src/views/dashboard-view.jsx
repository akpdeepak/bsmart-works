import { useEffect } from 'react';
import { Button } from '@/components/works/button';
import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { onPressKey } from '@/lib/utils';
import { TIER } from '@/lib/nav-model';
import { DonutChart, BarChart, SegmentBar, DayBars, PairedBars } from '@/components/works/molecules';
import { TodayCanvas } from '@/components/works/organisms/today-canvas';
import { aggregateByDimension } from '@/lib/dashboard-metrics';
import {
  dueBuckets, dailyHours, velocityPairs, timeboxProgress,
  activeMemberCount, utilizationSeries,
} from '@/lib/today-metrics';
import {
  Pin, Zap, Timer, Ban, ArrowRight, TrendingUp, Users, ShieldCheck,
  AlertTriangle, Package, BarChart2, Activity, Target, Clock,
  CheckCircle2, Layers, AlertCircle,
} from 'lucide-react';

// ── Shared atoms ──────────────────────────────────────────────────────────────

function TodayCard({ title, icon: Icon, iconColor, action, actionLabel, children, className }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-700">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-neutral-500'}`} aria-hidden="true" />}
          {title}
        </h3>
        {action && (
          <button type="button" onClick={action}
            className="flex items-center gap-1 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
            {actionLabel || 'View all'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function HealthRing({ pct, size = 80, stroke = 'stroke-semantic-success', label }) {
  const safe = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
        <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
          className="stroke-neutral-100 dark:stroke-neutral-700" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
          className={stroke} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${safe} 100`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{safe}%</span>
        {label && <span className="mt-0.5 text-2xs text-neutral-500">{label}</span>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color = 'bg-brand-navy' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value || 0) * 100 / max)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700">
      <div className={`h-2 rounded-full transition-all duration-base ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Empty({ msg }) {
  return <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{msg}</p>;
}

// Due-pressure tiles — the developer's "what do I attack first" radar. The whole
// tile is a button into My Works (RB-30 §5: all five interaction states).
const DUE_CFG = [
  { key: 'overdue',  label: 'Overdue',         text: 'text-semantic-danger',  bg: 'bg-semantic-danger/10' },
  { key: 'dueToday', label: 'Due today',       text: 'text-semantic-warning', bg: 'bg-semantic-warning/10' },
  { key: 'dueWeek',  label: 'This week',       text: 'text-brand-navy dark:text-neutral-100', bg: 'bg-brand-navy/10 dark:bg-neutral-700' },
  { key: 'later',    label: 'Later / no date', text: 'text-neutral-700 dark:text-neutral-300', bg: 'bg-neutral-100 dark:bg-neutral-700' },
];

function DueBucketTiles({ buckets, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {DUE_CFG.map(cfg => (
        <button key={cfg.key} type="button" onClick={onSelect}
          aria-label={`${cfg.label}: ${buckets[cfg.key]} item${buckets[cfg.key] === 1 ? '' : 's'} — open My Works`}
          className={`rounded-lg p-3 text-left transition-colors duration-fast hover:ring-1 hover:ring-brand-navy-tint/40 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${cfg.bg}`}>
          <p className={`text-2xl font-bold ${cfg.text}`}>{buckets[cfg.key]}</p>
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{cfg.label}</p>
        </button>
      ))}
    </div>
  );
}

function TodayHeader({ greeting, firstName, rolePill, subtitle, cta, onCta }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
            Good {greeting}, {firstName}
          </h1>
          {rolePill && (
            <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-semibold text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">
              {rolePill}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
      </div>
      {cta && <Button variant="action" onClick={onCta}>{cta}</Button>}
    </div>
  );
}

// Shared greeting helper
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

// ── Role tab bar (Admin/Owner only) ───────────────────────────────────────────

const ROLE_TABS = [
  { role: 'developer',     label: 'Developer' },
  { role: 'scrum-master',  label: 'Scrum Master' },
  { role: 'product-owner', label: 'Product Owner' },
  { role: 'executive',     label: 'Leadership' },
  { role: 'admin',         label: 'Admin' },
];

function RoleTabs({ dashboardRole, onSwitch, userTier }) {
  if ((userTier ?? 0) < TIER.ADMIN) return null;
  return (
    <div className="mb-6 flex flex-wrap border-b border-neutral-200 dark:border-neutral-700">
      {ROLE_TABS.map(t => (
        <button key={t.role} type="button"
          aria-current={dashboardRole === t.role ? 'page' : undefined}
          onClick={() => onSwitch(t.role)}
          className={[
            '-mb-px px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
            dashboardRole === t.role
              ? 'border-brand-orange text-brand-navy dark:text-neutral-100'
              : 'border-transparent text-neutral-500 hover:text-brand-navy hover:border-neutral-300 dark:hover:text-neutral-200',
          ].join(' ')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TodaySkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-52 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-neutral-100 dark:bg-neutral-800 lg:col-span-2" />
        <div className="h-64 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVELOPER
// Focus: "What should I work on today?" — personal queue, sprint health, blockers
// ═══════════════════════════════════════════════════════════════════════════════

// Built-in Developer widget registry: type → renderer (ctx, widget) => JSX. Each reproduces the
// card it replaced 1:1; the canvas positions them per DEVELOPER_LAYOUT. From slice 4 a saved
// layout reorders/removes these entries; the renderers stay the same.
const DEVELOPER_REGISTRY = {
  stat: (ctx, w) => {
    switch (w.config?.k) {
      case 'open':
        return <StatCard label="Open work items" value={ctx.openCount} sub="Assigned to me" color="text-brand-navy" icon={Pin} onClick={() => ctx.setView('myworks')} />;
      case 'sprint':
        return <StatCard label="In active sprint" value={ctx.data?.mySprintItems?.length ?? 0} sub={ctx.sprint?.name || 'No active sprint'} color="text-semantic-success" icon={Zap} onClick={() => ctx.setView('sprint')} />;
      case 'hours':
        return <StatCard label="Hours this week" value={`${ctx.hours}h`} sub="Time logged (7 days)" color="text-semantic-warning" icon={Timer} />;
      default:
        return <StatCard label="Blockers" value={ctx.blockers.length} sub="Items blocked on me" color={ctx.blockers.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Ban} />;
    }
  },
  'due-radar': (ctx) => (
    <TodayCard title="Due radar" icon={Clock} iconColor="text-semantic-danger"
      action={() => ctx.setView('myworks')} actionLabel="Plan my day">
      <DueBucketTiles buckets={dueBuckets(ctx.myItems)} onSelect={() => ctx.setView('myworks')} />
    </TodayCard>
  ),
  'queue-mix': (ctx) => (
    <TodayCard title="Queue mix" icon={Layers} iconColor="text-brand-navy">
      <SegmentBar data={aggregateByDimension(ctx.myItems, 'status')} />
      <p className="mt-3 text-xs text-neutral-500">My open items by status</p>
    </TodayCard>
  ),
  'my-week': (ctx) => (
    <TodayCard title="My week" icon={Timer} iconColor="text-semantic-warning">
      <DayBars data={dailyHours(ctx.data?.dailyMinutes)} unit="h" />
      <p className="mt-3 text-xs text-neutral-500">{ctx.hours}h logged · last 7 days</p>
    </TodayCard>
  ),
  'focus-queue': (ctx) => (
    <TodayCard title="Focus queue" icon={Target} iconColor="text-brand-orange"
      action={() => ctx.setView('myworks')} actionLabel="View all" className="overflow-hidden">
      {ctx.prioritized.length === 0
        ? <Empty msg="All caught up — nothing needs your attention." />
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                <th scope="col" className="px-5 py-2">Item</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {ctx.prioritized.slice(0, 8).map(item => {
                const overdue = item.due_date && new Date(item.due_date) < new Date();
                return (
                  <tr key={item.id} role="button" tabIndex={0}
                    onClick={() => ctx.setSelectedItem(item)} onKeyDown={onPressKey}
                    className="cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700">
                    <td className="px-5 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <TypeBadge type={item.type} compact />
                        <span className="flex-shrink-0 font-mono text-xs text-neutral-400">{item.id}</span>
                        <span className="truncate text-neutral-900 dark:text-neutral-100">{item.title}</span>
                        {overdue && (
                          <span className="flex-shrink-0 rounded-full bg-semantic-danger/10 px-1.5 py-0.5 text-2xs font-bold uppercase text-semantic-danger">Overdue</span>
                        )}
                        {item.sprint_id && !overdue && (
                          <span className="flex-shrink-0 rounded-full bg-semantic-success/10 px-1.5 py-0.5 text-2xs font-semibold text-semantic-success">Sprint</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">{item.priority || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </TodayCard>
  ),
  'sprint-ring': (ctx) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
        <Zap className="h-4 w-4 text-semantic-success" aria-hidden="true" />Active sprint
      </h3>
      {ctx.sprint ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <HealthRing pct={ctx.sprintPct} size={84} stroke="stroke-semantic-success" label="done" />
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ctx.sprint.name}</p>
            {ctx.sprint.goal && (
              <p className="mt-1 line-clamp-2 text-xs italic text-neutral-500">&ldquo;{ctx.sprint.goal}&rdquo;</p>
            )}
            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              {ctx.sprint.done_items}/{ctx.sprint.total_items} items · {ctx.sprint.done_points}/{ctx.sprint.total_points}pt
            </p>
            <button type="button" onClick={() => ctx.setView('sprint')}
              className="mt-3 text-xs font-medium text-brand-navy hover:underline focus-visible:outline-none">
              View sprint board →
            </button>
          </div>
        </div>
      ) : <Empty msg="No active sprint." />}
    </div>
  ),
  blockers: (ctx) => (
    <TodayCard title="Blockers" icon={Ban} iconColor="text-semantic-danger">
      {ctx.blockers.length === 0
        ? <Empty msg="No blockers — you're clear." />
        : ctx.blockers.map(b => (
          <div key={b.id} className="border-b border-neutral-100 py-2.5 last:border-0 dark:border-neutral-700">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{b.title}</p>
            <p className="mt-0.5 text-xs text-semantic-danger">Blocked by: {b.blocking_title}</p>
          </div>
        ))}
    </TodayCard>
  ),
  'time-logs': (ctx) => (
    <TodayCard title="My time logs" icon={Timer} iconColor="text-semantic-warning"
      action={() => ctx.selectedItem ? ctx.setIsWorklogOpen(true) : ctx.showToast('Open a work item first', 'error')}
      actionLabel="+ Log time">
      {ctx.worklogs.length === 0
        ? <Empty msg="No time logged this week." />
        : ctx.worklogs.slice(0, 5).map(wl => (
          <div key={wl.id} className="flex items-center gap-2 border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-700">
            <span className="w-10 flex-shrink-0 text-xs font-bold text-brand-navy">
              {Math.round((wl.time_spent_minutes || 0) / 60 * 10) / 10}h
            </span>
            <span className="flex-1 truncate text-xs text-neutral-900 dark:text-neutral-100">
              {wl.work_item_title || wl.work_item_id}
            </span>
            <span className="text-xs text-neutral-500">{wl.work_date}</span>
          </div>
        ))}
    </TodayCard>
  ),
};

// Built-in Developer layout — the default widget arrangement (spans on a 12-col grid; spanSm keeps
// the stat cards 2-up on mobile). This is the shape a saved layout (slice 4) replaces.
const DEVELOPER_LAYOUT = [
  { id: 'd-stat-open', type: 'stat', span: 3, spanSm: 6, config: { k: 'open' } },
  { id: 'd-stat-sprint', type: 'stat', span: 3, spanSm: 6, config: { k: 'sprint' } },
  { id: 'd-stat-hours', type: 'stat', span: 3, spanSm: 6, config: { k: 'hours' } },
  { id: 'd-stat-blockers', type: 'stat', span: 3, spanSm: 6, config: { k: 'blockers' } },
  { id: 'd-due-radar', type: 'due-radar', span: 4 },
  { id: 'd-queue-mix', type: 'queue-mix', span: 4 },
  { id: 'd-my-week', type: 'my-week', span: 4 },
  { id: 'd-focus-queue', type: 'focus-queue', span: 8 },
  { id: 'd-sprint-ring', type: 'sprint-ring', span: 4 },
  { id: 'd-blockers', type: 'blockers', span: 6 },
  { id: 'd-timelogs', type: 'time-logs', span: 6 },
];

function DeveloperToday({ data, workItems, currentUser, setView, setSelectedItem, setIsCreateOpen, setIsWorklogOpen, selectedItem, showToast }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const myItems = data?.myOpenItems
    ?? workItems.filter(i => i.assigneeId === currentUser?.id && i.status !== 'Done');
  const openCount = data?.myOpenItemCount ?? myItems.length;
  const sprint = data?.activeSprint;
  const sprintPct = sprint?.total_items > 0 ? Math.round(sprint.done_items * 100 / sprint.total_items) : 0;
  const blockers = data?.blockers || [];
  const hours = data?.weeklyMinutes ? Math.round(data.weeklyMinutes / 60 * 10) / 10 : 0;
  const worklogs = data?.recentWorklogs || [];

  // Sort by urgency: overdue → in-sprint + critical/high → in-sprint → priority
  const PORD = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const prioritized = [...myItems].sort((a, b) => {
    const now = new Date();
    const aOD = a.due_date && new Date(a.due_date) < now;
    const bOD = b.due_date && new Date(b.due_date) < now;
    if (aOD !== bOD) return aOD ? -1 : 1;
    if (!!a.sprint_id !== !!b.sprint_id) return a.sprint_id ? -1 : 1;
    return (PORD[a.priority] ?? 9) - (PORD[b.priority] ?? 9);
  });

  const ctx = {
    data, myItems, openCount, sprint, sprintPct, blockers, hours, worklogs, prioritized,
    currentUser, setView, setSelectedItem, setIsWorklogOpen, selectedItem, showToast,
  };

  return (
    <>
      <TodayHeader greeting={getGreeting()} firstName={firstName}
        subtitle={`${openCount} item${openCount === 1 ? '' : 's'} assigned to you${blockers.length ? ` · ${blockers.length} blocked` : ''}`}
        cta="+ Create work item" onCta={() => setIsCreateOpen(true)} />
      <TodayCanvas layout={DEVELOPER_LAYOUT} registry={DEVELOPER_REGISTRY} ctx={ctx} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRUM MASTER
// Focus: "Is the sprint healthy?" — risk items, velocity, team capacity
// ═══════════════════════════════════════════════════════════════════════════════

function ScrumMasterToday({ data, currentUser, setView }) {
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

  return (
    <>
      <TodayHeader greeting={getGreeting()} firstName={firstName} rolePill="Scrum Master"
        subtitle={subtitle} cta="View sprint" onCta={() => setView('sprint')} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Sprint health" value={`${sprintPct}%`} sub={activeSprint?.name || 'No sprint'} color={sprintColor} icon={TrendingUp} onClick={() => setView('sprint')} />
        <StatCard label="High-risk items" value={highRisk.length} sub="CRITICAL/HIGH, not done" color={highRisk.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={AlertTriangle} />
        <StatCard label="Scope changes" value={scopeChanges.length} sub="This sprint" color={scopeChanges.length > 2 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'} icon={Activity} />
        <StatCard label="Velocity" value={`${velocityDone}pt`} sub="Last sprint" color="text-brand-navy" icon={Zap} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TodayCard title="High-risk items" icon={AlertTriangle} iconColor="text-semantic-danger"
          action={() => setView('board')} className="overflow-hidden lg:col-span-2">
          {highRisk.length === 0
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
                  {highRisk.slice(0, 8).map(item => (
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

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
            <Zap className="h-4 w-4 text-semantic-success" aria-hidden="true" />Sprint health
          </h3>
          {activeSprint ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <HealthRing pct={sprintPct} size={84} stroke={sprintStroke} label="done" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{activeSprint.name}</p>
                {activeSprint.goal && (
                  <p className="mt-1 line-clamp-2 text-xs italic text-neutral-500">&ldquo;{activeSprint.goal}&rdquo;</p>
                )}
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {activeSprint.done_items}/{activeSprint.total_items} items · {activeSprint.done_points}/{activeSprint.total_points}pt
                </p>
              </div>
            </div>
          ) : <Empty msg="No active sprint." />}
          {timebox && (
            <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">Time elapsed</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{timebox.timePct}%</span>
              </div>
              <MiniBar value={timebox.timePct} max={100} color="bg-neutral-400" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">Scope done</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{timebox.scopePct}%</span>
              </div>
              <MiniBar value={timebox.scopePct} max={100}
                color={timebox.drift >= 0 ? 'bg-semantic-success' : 'bg-semantic-warning'} />
              <p className="pt-1 text-xs text-neutral-500">
                {timebox.daysLeft}d left · {timebox.drift >= 0
                  ? `${timebox.drift}% ahead of the clock`
                  : `${-timebox.drift}% behind the clock`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TodayCard title="Velocity trend" icon={TrendingUp} iconColor="text-brand-navy">
          {velocity.length === 0
            ? <Empty msg="No sprint history yet." />
            : (
              <>
                <PairedBars data={velocityPairs(velocity)} aLabel="Committed" bLabel="Delivered" />
                <p className="mt-3 text-xs text-neutral-500">
                  Story points · last {Math.min(velocity.length, 6)} sprint{velocity.length === 1 ? '' : 's'}
                </p>
              </>
            )}
        </TodayCard>

        <TodayCard title="Team capacity" icon={Users} iconColor="text-brand-navy">
          {capacity.length === 0
            ? <Empty msg="No capacity data this sprint." />
            : (
              <>
                <BarChart data={utilizationSeries(capacity, 7)} />
                <p className="mt-3 text-xs text-neutral-500">Hours logged · last 14 days</p>
              </>
            )}
        </TodayCard>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT OWNER
// Focus: "What's the backlog and release state?" — grooming, release radar, features
// ═══════════════════════════════════════════════════════════════════════════════

function ProductOwnerToday({ data, currentUser, setView }) {
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

  const PCOLOR = { CRITICAL: 'bg-semantic-danger', HIGH: 'bg-semantic-warning', MEDIUM: 'bg-brand-navy', LOW: 'bg-neutral-400' };

  const subtitle = [
    `${ungroomedCount} ungroomed item${ungroomedCount !== 1 ? 's' : ''}`,
    upcoming.length ? `${upcoming.length} upcoming release${upcoming.length !== 1 ? 's' : ''}` : null,
    `${featurePct}% features done`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <TodayHeader greeting={getGreeting()} firstName={firstName} rolePill="Product Owner"
        subtitle={subtitle} cta="View backlog" onCta={() => setView('backlog')} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ungroomed items" value={ungroomedCount} sub="No sprint assigned"
          color={ungroomedCount > 10 ? 'text-semantic-danger' : ungroomedCount > 5 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'}
          icon={Layers} onClick={() => setView('backlog')} />
        <StatCard label="Upcoming releases" value={upcoming.length} sub="Next 3 months" color="text-brand-navy" icon={Package} onClick={() => setView('releases')} />
        <StatCard label="Features done" value={`${featurePct}%`} sub={`${featureStats.done}/${featureStats.total} stories`}
          color={featurePct >= 80 ? 'text-semantic-success' : 'text-brand-navy'} icon={CheckCircle2} />
        <StatCard label="Backlog size" value={totalBacklog} sub="Total open items" color="text-neutral-600 dark:text-neutral-400" icon={BarChart2} onClick={() => setView('backlog')} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TodayCard title="Upcoming releases" icon={Package} iconColor="text-brand-navy"
          action={() => setView('releases')} className="lg:col-span-2">
          {upcoming.length === 0
            ? <Empty msg="No upcoming releases in the next 3 months." />
            : (
              <div className="space-y-4">
                {upcoming.map(r => {
                  const rel = allReleases.find(x => x.id === r.id) || r;
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

        <TodayCard title="Backlog health" icon={BarChart2} iconColor="text-brand-navy">
          {priorityDist.length === 0
            ? <Empty msg="No backlog data." />
            : (
              <div className="space-y-3">
                {priorityDist.map(p => (
                  <div key={p.priority}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{p.priority}</span>
                      <span className="text-neutral-500">{p.count}</span>
                    </div>
                    <MiniBar value={p.count || 0} max={maxPri} color={PCOLOR[p.priority] || 'bg-neutral-400'} />
                  </div>
                ))}
                <p className="pt-1 text-xs text-neutral-500">{totalBacklog} total items</p>
              </div>
            )}
        </TodayCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TodayCard title="Backlog composition" icon={Layers} iconColor="text-brand-navy"
          action={() => setView('backlog')}>
          <DonutChart data={backlogByType.map(t => ({ label: t.type || 'None', value: Number(t.count) || 0 }))} />
          <p className="mt-3 text-xs text-neutral-500">Open items by type</p>
        </TodayCard>
        <TodayCard title="Feature completion" icon={CheckCircle2} iconColor="text-semantic-success">
          <div className="flex items-center gap-5">
            <HealthRing pct={featurePct} size={84}
              stroke={featurePct >= 80 ? 'stroke-semantic-success' : 'stroke-brand-navy'} label="done" />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {featureStats.done ?? 0} of {featureStats.total ?? 0} stories done
              </p>
              <p className="mt-1 text-xs text-neutral-500">Across the whole backlog</p>
              <button type="button" onClick={() => setView('reports')}
                className="mt-2 text-xs font-medium text-brand-navy hover:underline focus-visible:outline-none">
                View reports →
              </button>
            </div>
          </div>
        </TodayCard>
      </div>

      {ungroomed.length > 0 && (
        <div className="mt-6">
          <TodayCard
            title={`Ungroomed items${ungroomedCount > ungroomed.length ? ` (${ungroomedCount})` : ''}`}
            icon={AlertCircle} iconColor="text-semantic-warning"
            action={() => setView('backlog')} actionLabel="Groom backlog"
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
                {ungroomed.slice(0, 6).map(item => (
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
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE / LEADERSHIP
// Focus: "Is the portfolio on track?" — project health, RAID, release schedule
// ═══════════════════════════════════════════════════════════════════════════════

function ExecutiveToday({ data, currentUser, setView }) {
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

  const RAID_CFG = [
    { type: 'risks',        label: 'Risks',        textColor: 'text-semantic-danger',  bgColor: 'bg-semantic-danger/10' },
    { type: 'issues',       label: 'Issues',       textColor: 'text-semantic-warning', bgColor: 'bg-semantic-warning/10' },
    { type: 'actions',      label: 'Actions',      textColor: 'text-brand-navy',       bgColor: 'bg-brand-navy/10' },
    { type: 'dependencies', label: 'Dependencies', textColor: 'text-neutral-700 dark:text-neutral-300', bgColor: 'bg-neutral-100 dark:bg-neutral-700' },
  ];

  const subtitle = [
    `Portfolio at ${health}%`,
    overdueActions.length ? `${overdueActions.length} overdue action${overdueActions.length !== 1 ? 's' : ''}` : null,
    (openRisks + openIssues) > 0 ? `${openRisks + openIssues} open risks/issues` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <TodayHeader greeting={getGreeting()} firstName={firstName} rolePill="Leadership"
        subtitle={subtitle} cta="View portfolio" onCta={() => setView('projects')} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Portfolio health" value={`${health}%`} sub="Items done across projects" color={healthColor} icon={TrendingUp} />
        <StatCard label="Overdue actions" value={overdueActions.length} sub="From RAID tracker"
          color={overdueActions.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Clock} />
        <StatCard label="Open risks/issues" value={openRisks + openIssues} sub={`${openRisks} risks · ${openIssues} issues`}
          color={(openRisks + openIssues) > 5 ? 'text-semantic-danger' : 'text-semantic-warning'} icon={AlertTriangle} />
        <StatCard label="Team utilization" value={teamUtil.length} sub="Active members (30d)" color="text-brand-navy" icon={Users} />
      </div>

      {/* Portfolio grid */}
      <TodayCard title="Project portfolio" icon={Target} iconColor="text-brand-navy" action={() => setView('projects')}>
        {portfolio.length === 0
          ? <Empty msg="No projects found." />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {portfolio.map(p => {
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

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* RAID pulse */}
        <TodayCard title="RAID pulse" icon={AlertTriangle} iconColor="text-semantic-warning">
          <div className="grid grid-cols-2 gap-3">
            {RAID_CFG.map(cfg => {
              const item = raidSummary.find(r => r.type === cfg.type);
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

        {/* Release schedule */}
        <TodayCard title="Release schedule" icon={Package} iconColor="text-brand-navy" action={() => setView('releases')}>
          {releaseSchedule.length === 0
            ? <Empty msg="No upcoming releases." />
            : (
              <div className="space-y-3">
                {releaseSchedule.slice(0, 4).map(r => {
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

        {/* Team utilization */}
        <TodayCard title="Team utilization" icon={Users} iconColor="text-brand-navy">
          {teamUtil.length === 0
            ? <Empty msg="No time logged in the last 30 days." />
            : (
              <>
                <BarChart data={utilizationSeries(teamUtil, 8)} />
                <p className="mt-3 text-xs text-neutral-500">Hours logged · last 30 days</p>
              </>
            )}
        </TodayCard>
      </div>

      {/* Overdue actions */}
      {overdueActions.length > 0 && (
        <div className="mt-6">
          <TodayCard title={`Overdue actions (${overdueActions.length})`} icon={Clock} iconColor="text-semantic-danger" className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                  <th scope="col" className="px-5 py-2">Action</th>
                  <th scope="col" className="px-3 py-2">Due</th>
                  <th scope="col" className="hidden px-3 py-2 sm:table-cell">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {overdueActions.slice(0, 5).map(a => (
                  <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                    <td className="max-w-xs truncate px-5 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{a.title}</td>
                    <td className="px-3 py-2.5 text-xs text-semantic-danger">{a.due_date}</td>
                    <td className="hidden px-3 py-2.5 text-xs text-neutral-600 sm:table-cell dark:text-neutral-400">{a.owner_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TodayCard>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// Focus: "Is the platform healthy?" — member activity, security posture, audit
// ═══════════════════════════════════════════════════════════════════════════════

function AdminToday({ data, currentUser, setView }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const memberCount = data?.memberCount ?? 0;
  const mfa = data?.mfaStats || { total: 0, mfa_enabled: 0 };
  const mfaPct = mfa.total > 0 ? Math.round(mfa.mfa_enabled * 100 / mfa.total) : 0;
  const totalEvents = data?.totalEventsWeek ?? 0;
  const activityStats = data?.activityStats || [];
  const auditLog = data?.recentAuditLog || [];
  const roleDist = data?.roleDistribution || [];
  const maxEvents = Math.max(...activityStats.map(e => e.count || 0), 1);

  const mfaStroke = mfaPct >= 80 ? 'stroke-semantic-success' : mfaPct >= 50 ? 'stroke-semantic-warning' : 'stroke-semantic-danger';
  const mfaColor  = mfaPct >= 80 ? 'text-semantic-success'  : mfaPct >= 50 ? 'text-semantic-warning'  : 'text-semantic-danger';

  const subtitle = [
    `${memberCount} member${memberCount !== 1 ? 's' : ''}`,
    `${mfaPct}% MFA adoption`,
    `${totalEvents} events this week`,
  ].join(' · ');

  return (
    <>
      <TodayHeader greeting={getGreeting()} firstName={firstName} rolePill="Admin"
        subtitle={subtitle} cta="Manage members" onCta={() => setView('workspace')} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Members" value={memberCount}
          sub={`${activeMemberCount(data?.members)} active this week`}
          color="text-brand-navy" icon={Users} onClick={() => setView('workspace')} />
        <StatCard label="MFA adoption" value={`${mfaPct}%`} sub={`${mfa.mfa_enabled}/${mfa.total} enabled`} color={mfaColor} icon={ShieldCheck} />
        <StatCard label="Events this week" value={totalEvents} sub="Platform activity" color="text-neutral-600 dark:text-neutral-400" icon={Activity} />
        <StatCard label="Audit entries" value={auditLog.length} sub="Recent role changes" color={auditLog.length > 0 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'} icon={AlertTriangle} onClick={() => setView('security')} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TodayCard title="Activity this week" icon={Activity} iconColor="text-brand-navy" className="lg:col-span-2">
          {activityStats.length === 0
            ? <Empty msg="No platform activity recorded this week." />
            : (
              <div className="space-y-3">
                {activityStats.slice(0, 8).map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-44 flex-shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-400">{e.event_type}</span>
                    <div className="flex-1">
                      <MiniBar value={e.count || 0} max={maxEvents} color="bg-brand-navy" />
                    </div>
                    <span className="w-8 flex-shrink-0 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
        </TodayCard>

        <div className="space-y-4">
          {/* MFA security posture */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="h-4 w-4 text-semantic-success" aria-hidden="true" />Security posture
            </h3>
            <div className="flex items-center gap-4">
              <HealthRing pct={mfaPct} size={72} stroke={mfaStroke} label="MFA" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">MFA adoption</p>
                <p className="text-xs text-neutral-500">{mfa.mfa_enabled} of {mfa.total} users</p>
                {mfaPct < 80 && (
                  <p className="mt-1 text-xs text-semantic-danger">Below 80% target</p>
                )}
              </div>
            </div>
          </div>

          {/* Role distribution */}
          {roleDist.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
              <h3 className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">Role distribution</h3>
              <DonutChart data={roleDist.map(r => ({ label: r.role || '—', value: Number(r.count) || 0 }))} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <TodayCard title="Recent audit log" icon={AlertTriangle} iconColor="text-semantic-warning"
          action={() => setView('security')} className="overflow-hidden">
          {auditLog.length === 0
            ? <Empty msg="No recent role changes." />
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                    <th scope="col" className="px-5 py-2">Member</th>
                    <th scope="col" className="px-3 py-2">Change</th>
                    <th scope="col" className="hidden px-3 py-2 sm:table-cell">By</th>
                    <th scope="col" className="hidden px-3 py-2 md:table-cell">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {auditLog.slice(0, 6).map(a => (
                    <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                      <td className="px-5 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{a.target_name}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className="text-semantic-warning">{a.old_role}</span>
                        <span className="mx-1 text-neutral-400">→</span>
                        <span className="text-semantic-success">{a.new_role}</span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-neutral-500 sm:table-cell">{a.actor_name}</td>
                      <td className="hidden px-3 py-2.5 text-xs text-neutral-500 md:table-cell">{a.changed_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </TodayCard>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — branches on dashboardRole, manages auto-fetch
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardView({
  currentUser,
  userRole,
  dashboardRole,
  dashLoading,
  developerDash,
  smDash,
  poDash,
  execDash,
  adminDash,
  workItems,
  selectedItem,
  setIsCreateOpen,
  setDashboardRole,
  fetchDashboard,
  setView,
  setSelectedItem,
  setIsWorklogOpen,
  showToast,
}) {
  // Resolve the data for the active role and auto-fetch if not yet loaded
  const DATA_MAP = {
    'developer':     developerDash,
    'scrum-master':  smDash,
    'product-owner': poDash,
    'executive':     execDash,
    'admin':         adminDash,
  };
  const activeData = DATA_MAP[dashboardRole] ?? null;

  useEffect(() => {
    if (!activeData && !dashLoading) {
      fetchDashboard(dashboardRole);
    }
  }, [dashboardRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchRole = (role) => {
    setDashboardRole(role);
    fetchDashboard(role);
  };

  const sharedProps = { currentUser, setView, setIsCreateOpen, setSelectedItem, setIsWorklogOpen, selectedItem, showToast, workItems };

  return (
    <div className="p-6 max-w-7xl">
      <RoleTabs dashboardRole={dashboardRole} onSwitch={switchRole} userTier={userRole?.tier} />

      {dashLoading || !activeData
        ? <TodaySkeleton />
        : dashboardRole === 'scrum-master'  ? <ScrumMasterToday  data={smDash}       {...sharedProps} />
        : dashboardRole === 'product-owner' ? <ProductOwnerToday data={poDash}       {...sharedProps} />
        : dashboardRole === 'executive'     ? <ExecutiveToday    data={execDash}     {...sharedProps} />
        : dashboardRole === 'admin'         ? <AdminToday        data={adminDash}    {...sharedProps} />
        :                                     <DeveloperToday    data={developerDash} {...sharedProps} />
      }
    </div>
  );
}
