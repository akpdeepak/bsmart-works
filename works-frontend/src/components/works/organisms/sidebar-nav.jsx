import { useState, useRef, useEffect } from 'react';
import {
  Home, User, Bell, Code, LayoutGrid, ListTodo, Zap, Rocket, FolderKanban,
  BarChart2, LayoutDashboard, FileText, TrendingUp, Headset, Timer, ShieldCheck,
  Gauge, Map as MapIcon, ClipboardList, Workflow, Plug, Search, BookOpen,
  SlidersHorizontal, Settings, Trash2, PanelLeftClose, LogOut, ChevronDown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/works/atoms/badge';

// Organism — brand-navy sidebar nav (CLAUDE.md §4.6, §4.12).
// Props are domain-typed: accepts current view, workspace, user, counts.
// Collapse state is managed externally via `collapsed` + `onToggleCollapse`.
//
// DESIGN RULES enforced:
//  - bg-brand-navy (not bg-white like the App.jsx legacy sidebar — §4.6)
//  - lucide icons only (no emoji — §4.23)
//  - Active item: 2px brand-orange left accent + bg-white/10 (§4.12)
//  - Hover: bg-white/5 (§4.12)
//  - Collapsed: icon rail, tooltip on hover (§4.12)
//  - All 5 interactive states on every nav item (§4.8)

// ─── Nav item data ────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: null, items: [{ id: 'dashboard', label: 'Home', icon: Home }] },
  { id: 'my-work', label: 'My Work', items: [
    { id: 'myworks',       label: 'My Works',      icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'developer',     label: 'Developer',     icon: Code },
  ] },
  { id: 'plan', label: 'Plan & Track', items: [
    { id: 'board',    label: 'Board',         icon: LayoutGrid },
    { id: 'backlog',  label: 'Backlog',       icon: ListTodo },
    { id: 'sprint',   label: 'Active Sprint', icon: Zap },
    { id: 'releases', label: 'Releases',      icon: Rocket },
    { id: 'projects', label: 'Projects',      icon: FolderKanban },
  ] },
  { id: 'insights', label: 'Insights', items: [
    { id: 'reports',       label: 'Reports',        icon: BarChart2 },
    { id: 'dashboards',    label: 'Dashboards',     icon: LayoutDashboard },
    { id: 'reportbuilder', label: 'Report builder', icon: FileText },
    { id: 'performance',   label: 'Performance',    icon: TrendingUp },
  ] },
  { id: 'service', label: 'Service & Compliance', items: [
    { id: 'service',    label: 'Service Desk', icon: Headset },
    { id: 'sla',        label: 'SLA',          icon: Timer },
    { id: 'compliance', label: 'Compliance',   icon: ShieldCheck },
  ] },
  { id: 'cockpits', label: 'Cockpits', items: [
    { id: 'smcockpit',   label: 'SM Cockpit',   icon: Gauge },
    { id: 'poworkspace', label: 'PO Workspace', icon: MapIcon },
    { id: 'pm',          label: 'PM Artifacts', icon: ClipboardList },
  ] },
  { id: 'automate', label: 'Automate & Connect', items: [
    { id: 'automations',  label: 'Automations',  icon: Workflow },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'bql',          label: 'BQL Query',    icon: Search },
  ] },
  { id: 'knowledge', label: 'Knowledge', items: [
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  ] },
  { id: 'configure', label: 'Configure', items: [
    { id: 'settings3', label: 'Workflows & Fields', icon: SlidersHorizontal },
    { id: 'workspace', label: 'Settings',           icon: Settings },
    { id: 'trash',     label: 'Trash',              icon: Trash2 },
  ] },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ item, active, collapsed, badge, badgeTone = 'neutral', dot, onClick }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md text-sm transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-navy',
        collapsed ? 'h-9 justify-center px-0' : 'h-9 px-3',
        active
          ? 'bg-white/10 font-semibold text-white'
          : 'font-normal text-white/70 hover:bg-white/5 hover:text-white'
      )}
    >
      {/* orange left accent when active */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 h-7 w-0.5 rounded-r-full bg-brand-orange"
        />
      )}

      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {badge != null && (
            <Badge
              tone="neutral"
              className={cn(
                'ml-auto shrink-0',
                badgeTone === 'orange' ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/80'
              )}
            >
              {badge}
            </Badge>
          )}
          {dot && (
            <span aria-hidden="true" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-semantic-success" />
          )}
        </>
      )}

      {/* collapsed badge — notification dot only */}
      {collapsed && badge != null && badge > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-orange"
        />
      )}
    </button>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

export function SidebarNav({
  activeView,
  onNavigate,
  workspace = { name: 'Workspace' },
  currentUser = { fullName: '' },
  userRole = '',
  myItemCount = 0,
  unreadCount = 0,
  projectCount = 0,
  hasActiveSprint = false,
  collapsed = false,
  onToggleCollapse,
  onLogout,
  // Workspace switcher (optional): when onSwitchWorkspace is provided, the header workspace name
  // becomes a dropdown to change tenants — preserving the multi-tenant switch (RB-40 §1).
  workspaces = [],
  activeWorkspaceId,
  workspacesLoading = false,
  workspacesError = false,
  onSwitchWorkspace,
  onRetryWorkspaces,
  onOpenWorkspaceSettings,
}) {
  const hasSwitcher = typeof onSwitchWorkspace === 'function';
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef(null);
  useEffect(() => {
    if (!wsOpen) return undefined;
    function onDocClick(e) {
      if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [wsOpen]);

  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  function badgeFor(id) {
    if (id === 'myworks')       return myItemCount > 0 ? myItemCount : null;
    if (id === 'notifications') return unreadCount > 0 ? unreadCount : null;
    if (id === 'projects')      return projectCount > 0 ? projectCount : null;
    return null;
  }

  function dotFor(id) {
    return id === 'sprint' && hasActiveSprint;
  }

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white">
      {/* ── Header: workspace switcher + collapse toggle ─────────────── */}
      <div ref={wsRef} className="relative flex h-14 shrink-0 items-center border-b border-white/10">
        {collapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={onToggleCollapse}
            className="flex h-full w-full items-center justify-center text-white/60 transition-colors duration-fast hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-orange text-xs font-bold text-white">
              {getInitials(workspace.name)}
            </div>
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-1 px-3">
            {hasSwitcher ? (
              <button
                type="button"
                onClick={() => setWsOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={wsOpen}
                aria-label="Switch workspace"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-[120ms] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-orange text-xs font-bold text-white">
                  {getInitials(workspace.name)}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{workspace.name}</span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-white/50" />
              </button>
            ) : (
              <>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-orange text-xs font-bold text-white">
                  {getInitials(workspace.name)}
                </div>
                <span className="flex-1 truncate text-sm font-semibold">{workspace.name}</span>
              </>
            )}
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={onToggleCollapse}
              className="shrink-0 rounded p-1 text-white/50 transition-colors duration-fast hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}

        {hasSwitcher && wsOpen && !collapsed && (
          <div className="absolute left-3 right-3 top-full z-dropdown mt-1 rounded-lg border border-neutral-200 bg-white py-1 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Workspaces</p>
            {workspacesLoading ? (
              <div className="space-y-2 px-3 py-2">
                <div className="h-7 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />
                <div className="h-7 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />
              </div>
            ) : workspacesError ? (
              <div className="px-3 py-3">
                <p className="mb-2 text-xs text-semantic-danger">Couldn’t load your workspaces.</p>
                {onRetryWorkspaces && (
                  <button type="button" onClick={onRetryWorkspaces} className="text-xs font-medium text-brand-navy hover:text-brand-navy-tint">
                    Try again
                  </button>
                )}
              </div>
            ) : workspaces.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-400">You don’t belong to any workspace yet.</p>
            ) : (
              workspaces.map((w) => {
                const isActive = w.id === activeWorkspaceId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => { setWsOpen(false); onSwitchWorkspace(w.id); }}
                    aria-current={isActive ? 'true' : undefined}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-navy text-xs font-bold text-white">
                      {getInitials(w.name)}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.name}</span>
                    {isActive && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-orange" />}
                  </button>
                );
              })
            )}
            {onOpenWorkspaceSettings && (
              <div className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => { setWsOpen(false); onOpenWorkspaceSettings(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-50 hover:text-brand-navy dark:hover:bg-neutral-700"
                >
                  <Settings aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  Workspace settings
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto p-2"
      >
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.id ?? `root-${si}`} className={cn(si > 0 && 'mt-1')}>
            {section.label && !collapsed && (
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                {section.label}
              </p>
            )}
            {section.label && collapsed && si > 0 && (
              <hr className="my-2 border-white/10" aria-hidden="true" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeView === item.id}
                  collapsed={collapsed}
                  badge={badgeFor(item.id)}
                  badgeTone={item.id === 'notifications' ? 'orange' : 'neutral'}
                  dot={dotFor(item.id)}
                  onClick={() => onNavigate?.(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 p-2">
        {collapsed ? (
          <div className="flex justify-center py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
              {getInitials(currentUser.fullName)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{currentUser.fullName}</p>
              {userRole && (
                <p className="truncate text-xs text-white/50">{userRole}</p>
              )}
            </div>
            {onLogout && (
              <button
                type="button"
                aria-label="Sign out"
                onClick={onLogout}
                className="shrink-0 rounded p-1 text-white/40 transition-colors duration-fast hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
