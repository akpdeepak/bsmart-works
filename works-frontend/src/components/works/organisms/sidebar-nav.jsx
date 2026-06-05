import {
  Home,
  User,
  Bell,
  LayoutGrid,
  List,
  Zap,
  BarChart2,
  Rocket,
  Settings,
  Search,
  BookOpen,
  ClipboardList,
  FolderOpen,
  Settings2,
  Trash2,
  PanelLeftClose,
  LogOut,
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
  {
    id: null,
    items: [{ id: 'dashboard', label: 'Home', icon: Home }],
  },
  {
    id: 'my-work',
    label: 'My Work',
    items: [
      { id: 'myworks',       label: 'My Work',       icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    items: [
      { id: 'board',    label: 'Board',         icon: LayoutGrid },
      { id: 'backlog',  label: 'Backlog',        icon: List },
      { id: 'sprint',   label: 'Active sprint',  icon: Zap },
      { id: 'reports',  label: 'Reports',        icon: BarChart2 },
      { id: 'releases', label: 'Releases',       icon: Rocket },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { id: 'settings3', label: 'Workflows & fields', icon: Settings },
      { id: 'bql',      label: 'BQL query',         icon: Search },
      { id: 'knowledge', label: 'Knowledge',           icon: BookOpen },
    ],
  },
  {
    id: 'pm',
    label: 'Project management',
    items: [
      { id: 'pm',       label: 'PM artifacts', icon: ClipboardList },
      { id: 'projects', label: 'Projects',     icon: FolderOpen },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'workspace', label: 'Settings', icon: Settings2 },
      { id: 'trash',     label: 'Trash',    icon: Trash2 },
    ],
  },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ item, active, collapsed, badge, dot, onClick }) {
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
            <Badge tone="neutral" className="ml-auto shrink-0 bg-white/10 text-white/80">
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
}) {
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
      {/* ── Header: workspace + collapse toggle ─────────────────────── */}
      <div className="flex h-14 shrink-0 items-center border-b border-white/10">
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
          <div className="flex flex-1 items-center gap-2 px-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-orange text-xs font-bold text-white">
              {getInitials(workspace.name)}
            </div>
            <span className="flex-1 truncate text-sm font-semibold">{workspace.name}</span>
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
