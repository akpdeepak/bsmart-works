import { Button } from '@/components/works/button';
import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { onPressKey } from '@/lib/utils';
import { Pin, Zap, Timer, Ban, ArrowRight } from 'lucide-react';

// Home dashboard — the "My Works" home (mockup 02). A single, focused surface for the signed-in
// person: greeting, the work that needs their attention, the active sprint, blockers, and time
// logged. Role-specific surfaces live in their own nav items (SM Cockpit, PO Workspace, Performance).
// The parent owns the `developerDash` payload + fetchers; this is presentational. Tokens only, a11y.
export default function DashboardView({
  currentUser,
  developerDash,
  workItems,
  selectedItem,
  setIsCreateOpen,
  setView,
  setSelectedItem,
  setIsWorklogOpen,
  showToast,
}) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const myItems = developerDash?.myOpenItems
    ?? workItems.filter(i => i.assigneeId === currentUser?.id && i.status !== 'Done');
  const openCount = developerDash?.myOpenItemCount ?? myItems.length;
  const sprint = developerDash?.activeSprint;
  const sprintPct = sprint && sprint.total_items > 0 ? Math.round(sprint.done_items * 100 / sprint.total_items) : 0;
  const blockers = developerDash?.blockers || [];
  const hours = developerDash?.weeklyMinutes ? Math.round(developerDash.weeklyMinutes / 60 * 10) / 10 : 0;
  const worklogs = developerDash?.recentWorklogs || [];

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Good {greeting}, {firstName}</h1>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {openCount} item{openCount === 1 ? '' : 's'} assigned to you{blockers.length ? ` · ${blockers.length} blocked` : ''}
          </p>
        </div>
        <Button variant="action" onClick={() => setIsCreateOpen(true)}>+ Create work item</Button>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Open work items" value={openCount} sub="Assigned to me" color="text-brand-navy" icon={Pin} onClick={() => setView('myworks')} />
        <StatCard label="In active sprint" value={developerDash?.mySprintItems?.length ?? 0} sub={sprint?.name || 'No active sprint'} color="text-semantic-success" icon={Zap} onClick={() => setView('sprint')} />
        <StatCard label="Hours this week" value={`${hours}h`} sub="Time logged (7 days)" color="text-brand-amber" icon={Timer} />
        <StatCard label="Blockers" value={blockers.length} sub="Items blocked on me" color={blockers.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Ban} />
      </div>

      {/* Needs attention + active sprint */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Assigned to me — needs attention</h3>
            <button onClick={() => setView('myworks')} className="text-xs text-brand-navy hover:underline">
              View all <ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
            </button>
          </div>
          {myItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-600 dark:text-neutral-400">All caught up — nothing needs your attention.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                  <th scope="col" className="px-5 py-2">Item</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {myItems.slice(0, 8).map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} role="button" tabIndex={0} onKeyDown={onPressKey}
                    className="cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700">
                    <td className="px-5 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <TypeBadge type={item.type} compact />
                        <span className="flex-shrink-0 font-mono text-xs text-neutral-500">{item.id}</span>
                        <span className="truncate text-neutral-900 dark:text-neutral-100">{item.title}</span>
                        {item.due_date && new Date(item.due_date) < new Date() && <span className="flex-shrink-0 text-xs font-bold text-semantic-danger">OVERDUE</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge></td>
                    <td className="px-3 py-2.5"><span className="text-xs text-neutral-600 dark:text-neutral-300">{item.priority || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
            <Zap className="h-4 w-4 text-semantic-success" aria-hidden="true" />Active sprint
          </h3>
          {sprint ? (
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100" className="stroke-neutral-100 dark:stroke-neutral-700" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100" className="stroke-semantic-success" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${sprintPct} 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neutral-900 dark:text-neutral-100">{sprintPct}%</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{sprint.name}</p>
                {sprint.goal && <p className="truncate text-xs italic text-neutral-600 dark:text-neutral-400">&ldquo;{sprint.goal}&rdquo;</p>}
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{sprint.done_items}/{sprint.total_items} items · {sprint.done_points}/{sprint.total_points}pt</p>
              </div>
            </div>
          ) : <p className="py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">No active sprint right now.</p>}
        </div>
      </div>

      {/* Blockers + time logs */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
            <Ban className="h-4 w-4 text-semantic-danger" aria-hidden="true" />Blockers
          </h3>
          {blockers.length === 0
            ? <p className="py-4 text-center text-sm text-neutral-600 dark:text-neutral-400">No blockers — you&apos;re clear.</p>
            : blockers.map(b => (
              <div key={b.id} className="border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{b.title}</p>
                <p className="mt-0.5 text-xs text-semantic-danger">Blocked by: {b.blocking_title}</p>
              </div>
            ))}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Timer className="h-4 w-4 text-brand-amber" aria-hidden="true" />My time logs
            </h3>
            <button onClick={() => selectedItem ? setIsWorklogOpen(true) : showToast('Open a work item first', 'error')} className="text-xs text-brand-navy hover:underline">+ Log time</button>
          </div>
          {worklogs.length === 0
            ? <p className="py-4 text-center text-sm text-neutral-600 dark:text-neutral-400">No time logged this week.</p>
            : worklogs.slice(0, 5).map(wl => (
              <div key={wl.id} className="flex items-center gap-2 border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-700">
                <span className="w-10 text-xs font-bold text-brand-navy">{Math.round((wl.time_spent_minutes || 0) / 60 * 10) / 10}h</span>
                <span className="flex-1 truncate text-xs text-neutral-900 dark:text-neutral-100">{wl.work_item_title || wl.work_item_id}</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{wl.work_date}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
