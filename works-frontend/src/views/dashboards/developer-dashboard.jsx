import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { onPressKey } from '@/lib/utils';
import { SegmentBar, DayBars } from '@/components/works/molecules';
import { aggregateByDimension } from '@/lib/dashboard-metrics';
import { dueBuckets, dailyHours } from '@/lib/today-metrics';
import { Pin, Zap, Timer, Ban, Clock, Layers, Target, CheckCircle2 } from 'lucide-react';
import { TodayCard, HealthRing, Empty, TodaySurface } from './_shared';
import { getTimeOfDay as getGreeting } from '@/lib/utils';
import { useWorkspaceSetup } from '@/hooks/queries/useWorkspaceSetup';

// ── Setup-completeness widget ─────────────────────────────────────────────────

function SetupCompletenessWidget({ workspaceId }) {
  const { data, isLoading } = useWorkspaceSetup(workspaceId);
  if (isLoading || !data) return null;
  // Hide once all steps are done and workspace is no longer new
  if (!data.needsWizard && data.score === 100) return null;
  const steps = data.steps ?? [];
  const score = data.score ?? 0;
  return (
    <TodayCard title="Workspace setup" icon={CheckCircle2} iconColor="text-brand-orange">
      <div className="mb-4 flex items-center gap-4">
        <HealthRing pct={score} size={56} stroke="stroke-brand-orange" label="done" />
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {score < 100
            ? 'Complete these steps to get the most out of bSmart Works.'
            : 'Your workspace is fully set up!'}
        </p>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${step.done ? 'text-semantic-success' : 'text-neutral-200 dark:text-neutral-600'}`}
              aria-hidden="true" />
            <span className={step.done ? 'text-neutral-600 dark:text-neutral-400 line-through' : 'text-neutral-700 dark:text-neutral-300'}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </TodayCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVELOPER
// Focus: "What should I work on today?" — personal queue, sprint health, blockers
// ═══════════════════════════════════════════════════════════════════════════════

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
  'setup-completeness': (ctx) => (
    <SetupCompletenessWidget workspaceId={ctx.currentUser?.workspaceId} />
  ),
};

export function DeveloperToday({ data, workItems, currentUser, setView, setSelectedItem, setIsCreateOpen, setIsWorklogOpen, selectedItem, showToast, layout, builtinLayout, edit }) {
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
    <TodaySurface
      header={{
        greeting: getGreeting(), firstName,
        subtitle: `${openCount} item${openCount === 1 ? '' : 's'} assigned to you${blockers.length ? ` · ${blockers.length} blocked` : ''}`,
        cta: '+ Create work item', onCta: () => setIsCreateOpen(true),
      }}
      registry={DEVELOPER_REGISTRY} ctx={ctx} layout={layout} builtinLayout={builtinLayout} edit={edit} />
  );
}
