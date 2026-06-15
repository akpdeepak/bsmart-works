import { useEffect, useState } from 'react';
import { TIER } from '@/lib/nav-model';
import { builtinTodayLayout, widgetsToLayout, nextSpan } from '@/lib/today-layouts';
import { DeveloperToday } from './dashboards/developer-dashboard';
import { ScrumMasterToday } from './dashboards/scrum-master-dashboard';
import { ProductOwnerToday } from './dashboards/product-owner-dashboard';
import { ExecutiveToday } from './dashboards/executive-dashboard';
import { AdminToday } from './dashboards/admin-dashboard';

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
  todayLayout,
  saveTodayLayout,
  resetTodayLayout,
  saveTodayTemplate,
  fetchWidgetData,
  previewWidgetData,
  widgetMetrics,
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

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  // A draft is per-role; leaving a role exits edit mode. Reset during render (not in an effect)
  // using the previous-value idiom so the role's own data and draft never get out of sync.
  const [prevRole, setPrevRole] = useState(dashboardRole);
  if (prevRole !== dashboardRole) {
    setPrevRole(dashboardRole);
    setEditing(false);
  }

  useEffect(() => {
    if (!activeData && !dashLoading) {
      fetchDashboard(dashboardRole);
    }
  }, [dashboardRole]); // activeData/dashLoading excluded: including them would trigger a loop on every fetch.

  const switchRole = (role) => {
    setDashboardRole(role);
    fetchDashboard(role);
  };

  // Effective layout: the saved personal/workspace layout for THIS role, else the built-in default.
  const savedForRole = todayLayout?.role === dashboardRole ? todayLayout : null;
  const savedLayout = savedForRole?.widgets ? widgetsToLayout(savedForRole.widgets) : null;
  const builtin = builtinTodayLayout(dashboardRole, activeData);
  const resolved = savedLayout ?? builtin;

  const clone = (l) => l.map((w) => ({ ...w, config: { ...w.config } }));
  const swap = (l, i, j) => {
    if (j < 0 || j >= l.length) return l;
    const c = [...l];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  };

  const edit = {
    editing,
    source: savedForRole?.source || 'builtin',
    draft,
    start: () => { setDraft(clone(resolved)); setEditing(true); },
    cancel: () => setEditing(false),
    save: () => { saveTodayLayout?.(dashboardRole, draft); setEditing(false); },
    reset: () => { resetTodayLayout?.(dashboardRole); setEditing(false); },
    // Admin/Owner only: set the workspace-wide default for this role (slice 6). Visibility gate
    // only — the server re-checks manage_workspace (RB-40 §1).
    canTemplate: (userRole?.tier ?? 0) >= TIER.ADMIN,
    saveTemplate: () => { saveTodayTemplate?.(dashboardRole, draft); setEditing(false); },
    add: (w) => setDraft((d) => [...d, { ...w, config: { ...w.config } }]),
    remove: (i) => setDraft((d) => d.filter((_, j) => j !== i)),
    moveUp: (i) => setDraft((d) => swap(d, i, i - 1)),
    moveDown: (i) => setDraft((d) => swap(d, i, i + 1)),
    cycleSpan: (i) => setDraft((d) => d.map((w, j) => (j === i ? { ...w, span: nextSpan(w.span || 12) } : w))),
    // Data-widget tooling (slice 5): batch-resolve, live preview, and the metric catalogue.
    widgetTools: { fetchWidgetData, previewWidgetData, metrics: widgetMetrics || [] },
  };

  const sharedProps = {
    currentUser, setView, setIsCreateOpen, setSelectedItem, setIsWorklogOpen, selectedItem,
    showToast, workItems, layout: resolved, builtinLayout: builtin, edit,
  };

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
