import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { TIER } from '@/lib/nav-model';
import { buildTodayBrief } from '@/lib/today-brief';
import { builtinTodayLayout, widgetsToLayout, nextSpan } from '@/lib/today-layouts';
import { DeveloperToday } from './dashboards/developer-dashboard';
import { ScrumMasterToday } from './dashboards/scrum-master-dashboard';
import { ProductOwnerToday } from './dashboards/product-owner-dashboard';
import { ExecutiveToday } from './dashboards/executive-dashboard';
import { AdminToday } from './dashboards/admin-dashboard';
import { PageLayout } from '@/components/works/templates/page-layout';

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

const ATTENTION_TONE = {
  danger: { dot: 'bg-semantic-danger', text: 'text-semantic-danger', icon: AlertTriangle },
  warning: { dot: 'bg-semantic-warning', text: 'text-semantic-warning', icon: AlertTriangle },
  neutral: { dot: 'bg-brand-navy-tint', text: 'text-brand-navy dark:text-brand-navy-tint', icon: Sparkles },
};

function DailyClarityBand({ brief, onNavigate }) {
  if (!brief) return null;
  const attentionCount = brief.attention.length;

  return (
    <section aria-labelledby="daily-clarity-heading"
      className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {brief.dateLabel} - {brief.roleLabel}
          </p>
          <h2 id="daily-clarity-heading" className="mt-1 text-2xl font-bold text-neutral-950 dark:text-neutral-50">
            Daily clarity
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{brief.confidence}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.(brief.primaryAction.view)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-fast hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            {brief.primaryAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          {brief.secondaryAction && (
            <button type="button" onClick={() => onNavigate?.(brief.secondaryAction.view)}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-fast hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-700">
              {brief.secondaryAction.label}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Needs attention</h3>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {attentionCount} of {brief.attentionLimit}
            </span>
          </div>
          {attentionCount > 0 ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {brief.attention.map((item) => {
                const tone = ATTENTION_TONE[item.tone] || ATTENTION_TONE.neutral;
                const Icon = tone.icon;
                return (
                  <li key={item.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{item.reason}</p>
                      </div>
                      <Icon className={`h-4 w-4 flex-shrink-0 ${tone.text}`} aria-hidden="true" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-semantic-success/20 bg-semantic-success/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-semantic-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Quiet win
              </div>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{brief.quietWin}</p>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Suggested next action</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{brief.primaryAction.label}</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Start from the most constrained signal, then let the detailed Today canvas handle the rest of the day.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default function DashboardView({
  currentUser,
  activeWorkspaceId,
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
    currentUser, activeWorkspaceId, setView, setIsCreateOpen, setSelectedItem, setIsWorklogOpen, selectedItem,
    showToast, workItems, layout: resolved, builtinLayout: builtin, edit,
  };
  const todayBrief = activeData ? buildTodayBrief(dashboardRole, activeData) : null;
  const roleDashboard = dashboardRole === 'scrum-master'  ? <ScrumMasterToday  data={smDash}       {...sharedProps} />
    : dashboardRole === 'product-owner' ? <ProductOwnerToday data={poDash}       {...sharedProps} />
    : dashboardRole === 'executive'     ? <ExecutiveToday    data={execDash}     {...sharedProps} />
    : dashboardRole === 'admin'         ? <AdminToday        data={adminDash}    {...sharedProps} />
    :                                     <DeveloperToday    data={developerDash} {...sharedProps} />;

  return (
    <PageLayout header={null}>
      <RoleTabs dashboardRole={dashboardRole} onSwitch={switchRole} userTier={userRole?.tier} />

      {dashLoading || !activeData
        ? <TodaySkeleton />
        : (
          <>
            <DailyClarityBand brief={todayBrief} onNavigate={setView} />
            {roleDashboard}
          </>
        )
      }
    </PageLayout>
  );
}
