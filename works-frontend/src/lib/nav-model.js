// Two-tier navigation model — the single source of truth for the mode-rail + sub-rail shell
// (the redesign mockup). A "mode" is a top-level workspace (rendered as an icon on the navy rail);
// each mode owns a list of "surfaces" (the existing App views, rendered in the white sub-rail).
//
// View ids here MUST match the `view` strings the App switch renders and lib/routes.js maps to URLs
// — this module only reorganises how they are grouped and reached, never invents new destinations.

import {
  Home, LayoutGrid, BarChart2, Headset, BookOpen, Puzzle, Settings,
  User, Bell, Gauge, ListTodo, Zap, Rocket, FolderKanban, ClipboardList,
  LayoutDashboard, FileText, TrendingUp, MessageSquare, Timer, ShieldCheck,
  Workflow, Plug, Bot, Package, Code2, SlidersHorizontal, Sparkles, Shield, Trash2,
  Code, Map as MapIcon, Crown, ShieldHalf, Search,
} from 'lucide-react';

// ─── Permission tiers (mirror the server: RbacService) ───────────────────────────
// VIEWER(1) < MEMBER(2) < LEAD(3) < ADMIN(4) < OWNER(5). This client map decides nav VISIBILITY
// (declutter) only — it is NOT the access boundary. Every action/query is still authorised
// server-side by RbacService (RB-10 §2, RB-40 §1): hiding a surface never grants or denies access.
export const TIER = { VIEWER: 1, MEMBER: 2, LEAD: 3, ADMIN: 4, OWNER: 5 };

// Surface id -> minimum tier that should SEE it in the nav. Owner(5) sees everything. Unlisted
// surfaces default to VIEWER(1) (visible to all members). Keep this reconciled with the server's
// permissions.min_tier as the real contract evolves (tracked as tech-debt).
export const SURFACE_TIER = {
  // Home
  dashboard: TIER.VIEWER, myworks: TIER.MEMBER, notifications: TIER.MEMBER,
  // Deliver
  smcockpit: TIER.LEAD, board: TIER.VIEWER, backlog: TIER.MEMBER, sprint: TIER.MEMBER,
  releases: TIER.MEMBER, projects: TIER.VIEWER, pm: TIER.LEAD,
  // Insight
  reports: TIER.VIEWER, dashboards: TIER.VIEWER, reportbuilder: TIER.LEAD, performance: TIER.LEAD,
  // Service
  service: TIER.MEMBER, supportinbox: TIER.MEMBER, sla: TIER.MEMBER, compliance: TIER.ADMIN,
  // Know
  knowledge: TIER.VIEWER, knowledgeadvanced: TIER.MEMBER,
  // Extend
  automations: TIER.LEAD, integrations: TIER.ADMIN, aistudio: TIER.ADMIN,
  marketplace: TIER.ADMIN, developerportal: TIER.ADMIN,
  // Personal
  account: TIER.VIEWER,
  // Set up
  workspace: TIER.ADMIN, settings3: TIER.ADMIN, aicontrol: TIER.ADMIN,
  customization: TIER.ADMIN, security: TIER.OWNER, trash: TIER.LEAD,
  // Satellite cockpits + BQL
  developer: TIER.MEMBER, poworkspace: TIER.LEAD, leadership: TIER.ADMIN,
  adminops: TIER.ADMIN, bql: TIER.MEMBER,
};

// Minimum tier (1 = everyone) required to see a surface in the nav.
export function tierForSurface(view) {
  return SURFACE_TIER[view] ?? TIER.VIEWER;
}

// Can a user at `userTier` see this surface? (Owner/tier 5 sees all.) Pure tier predicate — the
// client fallback when the server hasn't supplied an explicit surface list.
export function canSeeSurface(view, userTier) {
  return (userTier ?? TIER.VIEWER) >= tierForSurface(view);
}

// Visibility resolver. `vis` may be:
//   • a number            — a tier (used by tests + the Admin/Owner "preview as tier" mode)
//   • { surfaces: [...] }  — the server-authoritative list from /rbac/me (preferred; single source)
//   • { tier }            — tier fallback when the server didn't send a surface list
// The server list always wins when present, so the client tier map is only a resilience fallback.
export function allowed(view, vis) {
  if (vis && Array.isArray(vis.surfaces)) return vis.surfaces.includes(view);
  const tier = typeof vis === 'number' ? vis : vis?.tier;
  return canSeeSurface(view, tier);
}

// ─── Modes & their surfaces ─────────────────────────────────────────────────────
// Order matches the requested rail top-to-bottom: Home, Deliver, Insight, Service, Know, Extend.
// Setup/admin destinations stay out of the rail and remain reachable through More / command
// palette so the primary mode model does not grow a seventh top-level bucket.

// Each mode + surface also carries an i18n `labelKey` (issue 275). `label` remains the English
// fallback / canonical orientation string; user-facing renders prefer `t(labelKey)` (see
// mode-rail.jsx, sub-rail.jsx, command-palette.jsx). Keys live in the `nav.*` namespace (locales.js).
export const MODES = [
  { id: 'today', label: 'Home', labelKey: 'nav.mode.home', Icon: Home, surfaces: [
    { id: 'dashboard',     label: 'Today',         labelKey: 'nav.today',         Icon: Home },
    { id: 'myworks',       label: 'My Works',      labelKey: 'nav.myWork',        Icon: User },
    { id: 'notifications', label: 'Notifications', labelKey: 'nav.notifications', Icon: Bell },
  ] },
  { id: 'deliver', label: 'Deliver', labelKey: 'nav.mode.deliver', Icon: LayoutGrid, surfaces: [
    { id: 'smcockpit', label: 'Sprint Cockpit', labelKey: 'nav.sprintCockpit', Icon: Gauge },
    { id: 'board',     label: 'Board',          labelKey: 'nav.board',         Icon: LayoutGrid },
    { id: 'backlog',   label: 'Backlog',        labelKey: 'nav.backlog',       Icon: ListTodo },
    { id: 'sprint',    label: 'Active Sprint',  labelKey: 'nav.sprint',        Icon: Zap },
    { id: 'releases',  label: 'Releases',       labelKey: 'nav.releases',      Icon: Rocket },
    { id: 'projects',  label: 'Teams',           labelKey: 'nav.teams',         Icon: FolderKanban },
    { id: 'pm',        label: 'PM Artifacts',   labelKey: 'nav.pmArtifacts',   Icon: ClipboardList },
  ] },
  { id: 'insight', label: 'Insight', labelKey: 'nav.mode.insight', Icon: BarChart2, surfaces: [
    { id: 'reports',       label: 'Reports',       labelKey: 'nav.reports',       Icon: BarChart2 },
    { id: 'dashboards',    label: 'Dashboards',    labelKey: 'nav.dashboards',    Icon: LayoutDashboard },
    { id: 'reportbuilder', label: 'Report Builder', labelKey: 'nav.reportBuilder', Icon: FileText },
    { id: 'performance',   label: 'Performance',   labelKey: 'nav.performance',   Icon: TrendingUp },
  ] },
  { id: 'service', label: 'Service', labelKey: 'nav.mode.service', Icon: Headset, surfaces: [
    { id: 'service',      label: 'Service Desk',  labelKey: 'nav.serviceDesk',  Icon: Headset },
    { id: 'supportinbox', label: 'Support Inbox', labelKey: 'nav.supportInbox', Icon: MessageSquare },
    { id: 'sla',          label: 'SLA',           labelKey: 'nav.sla',          Icon: Timer },
    { id: 'compliance',   label: 'Compliance',    labelKey: 'nav.compliance',   Icon: ShieldCheck },
  ] },
  { id: 'know', label: 'Know', labelKey: 'nav.mode.know', Icon: BookOpen, surfaces: [
    { id: 'knowledge',         label: 'Knowledge',           labelKey: 'nav.knowledge',        Icon: BookOpen },
    { id: 'knowledgeadvanced', label: 'Templates & Extract', labelKey: 'nav.templatesExtract', Icon: FileText },
  ] },
  { id: 'extend', label: 'Extend', labelKey: 'nav.mode.extend', Icon: Puzzle, surfaces: [
    { id: 'automations',     label: 'Automations',      labelKey: 'nav.automations',     Icon: Workflow },
    { id: 'integrations',    label: 'Integrations',     labelKey: 'nav.integrations',    Icon: Plug },
    { id: 'aistudio',        label: 'AI Studio',        labelKey: 'nav.aiStudio',        Icon: Bot },
    { id: 'marketplace',     label: 'Marketplace',      labelKey: 'nav.marketplace',     Icon: Package },
    { id: 'developerportal', label: 'Developer Portal', labelKey: 'nav.developerPortal', Icon: Code2 },
  ] },
];

export const SETUP_DESTINATIONS = [
  { id: 'workspace',     label: 'Settings',           labelKey: 'nav.settings',        Icon: Settings },
  { id: 'settings3',     label: 'Workflows & Fields', labelKey: 'nav.workflowsFields', Icon: SlidersHorizontal },
  { id: 'aicontrol',     label: 'AI Control',         labelKey: 'nav.aiControl',       Icon: Sparkles },
  { id: 'customization', label: 'Customization',      labelKey: 'nav.customization',   Icon: Puzzle },
  { id: 'security',      label: 'Security',           labelKey: 'nav.security',        Icon: Shield },
  { id: 'trash',         label: 'Trash',              labelKey: 'nav.trash',           Icon: Trash2 },
];

// Satellite destinations — reachable via a lens / the BQL chip / ⌘K, but not pinned to a sub-rail.
export const SATELLITES = [
  { id: 'account',     label: 'My Account',   labelKey: 'nav.account',     Icon: User },
  { id: 'developer',   label: 'Developer',    labelKey: 'nav.developer',   Icon: Code },
  { id: 'poworkspace', label: 'PO Workspace', labelKey: 'nav.poWorkspace', Icon: MapIcon },
  { id: 'leadership',  label: 'Leadership',   labelKey: 'nav.leadership',  Icon: Crown },
  { id: 'adminops',    label: 'Admin Ops',    labelKey: 'nav.adminOps',    Icon: ShieldHalf },
  { id: 'bql',         label: 'BQL Query',    labelKey: 'nav.bqlQuery',    Icon: Search },
];

// Flat list of every navigable destination (mode surfaces + satellites), each tagged with the
// group it belongs to — the single source the ⌘K palette builds its "go to" commands from.
// Each entry carries `labelKey` (from the surface) and `groupKey` (the owning mode's key) so a
// consumer with the i18n `t` can localize at render; `label`/`group` remain the English fallback.
export function navDestinations() {
  const out = [];
  for (const m of MODES) for (const s of m.surfaces) out.push({ ...s, group: m.label, groupKey: m.labelKey });
  for (const s of SETUP_DESTINATIONS) out.push({ ...s, group: 'More', groupKey: 'nav.more' });
  for (const s of SATELLITES) out.push({ ...s, group: 'More', groupKey: 'nav.more' });
  return out;
}

// The visible destinations shown by the explicit More menu. This is deliberately derived from
// the same setup/satellite catalogues as the command palette, so neither path can silently drift.
export function moreDestinations(vis) {
  return [...SETUP_DESTINATIONS, ...SATELLITES].filter((destination) => allowed(destination.id, vis));
}

// ─── Lenses ─────────────────────────────────────────────────────────────────────
// The top-right lens switcher retunes the workspace to a role. Each lens maps to the existing
// role cockpit view + the dashboardRole string fetchDashboard() understands, so picking a lens
// jumps to that role's cockpit and the role-tuned "Today" dashboard follows.

// `previewTier` is the representative permission tier each role typically holds — so when an
// Admin/Owner previews a role, the nav reduces to what that role would actually see.
export const LENSES = [
  { id: 'scrum-master',  label: 'Scrum Master',  view: 'smcockpit',   role: 'scrum-master',  previewTier: TIER.LEAD },
  { id: 'developer',     label: 'Developer',     view: 'developer',   role: 'developer',     previewTier: TIER.MEMBER },
  { id: 'product-owner', label: 'Product Owner', view: 'poworkspace', role: 'product-owner', previewTier: TIER.LEAD },
  { id: 'support-agent', label: 'Support Agent', view: 'supportinbox', role: 'support-agent', previewTier: TIER.MEMBER },
  { id: 'leadership',    label: 'Leadership',    view: 'leadership',  role: 'executive',     previewTier: TIER.ADMIN },
  { id: 'admin',         label: 'Admin',         view: 'adminops',    role: 'admin',         previewTier: TIER.ADMIN },
];

// ─── Feature → role mapping ──────────────────────────────────────────────────────
// Which surfaces each role leans on, ordered by how central they are to that role's day-to-day
// responsibilities and Agile/delivery practice. This is a USABILITY lens (what to surface first),
// NOT an access boundary — access is RBAC, enforced server-side (RB-40). Every surface stays
// reachable to everyone via the rail and ⌘K; this only decides emphasis/ordering.
//
//   Developer      — executes the work: own queue, the board, the sprint, code/runbooks, the API.
//   Scrum Master   — facilitates flow & ceremonies, clears impediments, watches velocity/health.
//   Product Owner  — owns backlog, value, releases, stakeholders, and the delivery roadmap.
//   Support Agent  — resolves customer conversations, service requests, and SLA risk.
//   Leadership     — portfolio outcomes: KPIs, performance, SLA & compliance posture across teams.
//   Admin          — operates the platform: config, governance, security, integrations, AI control.
export const ROLE_PROFILES = {
  developer: {
    landing: 'developer',
    primary: ['developer', 'dashboard', 'myworks', 'board', 'sprint', 'backlog', 'releases', 'knowledge', 'developerportal', 'bql', 'notifications'],
  },
  'scrum-master': {
    landing: 'smcockpit',
    primary: ['smcockpit', 'board', 'sprint', 'backlog', 'reports', 'performance', 'pm', 'automations', 'sla', 'notifications'],
  },
  'product-owner': {
    landing: 'poworkspace',
    primary: ['poworkspace', 'backlog', 'projects', 'releases', 'reports', 'dashboards', 'pm', 'knowledge', 'knowledgeadvanced', 'notifications'],
  },
  'support-agent': {
    landing: 'supportinbox',
    primary: ['supportinbox', 'service', 'sla', 'knowledge', 'notifications', 'dashboard'],
  },
  leadership: {
    landing: 'leadership',
    primary: ['leadership', 'dashboards', 'reports', 'performance', 'projects', 'sla', 'compliance', 'service', 'supportinbox', 'aicontrol'],
  },
  admin: {
    landing: 'adminops',
    primary: ['adminops', 'workspace', 'settings3', 'aicontrol', 'security', 'integrations', 'automations', 'marketplace', 'customization', 'compliance', 'developerportal', 'trash'],
  },
};

// lens id -> ordered list of that role's primary surface ids (empty list if unknown).
export function primarySurfacesFor(lensId) {
  return ROLE_PROFILES[lensId]?.primary || [];
}

// Is this surface a primary one for the given role lens? Drives "for your role" emphasis.
export function isPrimaryForRole(lensId, view) {
  return primarySurfacesFor(lensId).includes(view);
}

// Views reachable from a lens / the BQL chip / the command palette but not pinned to a sub-rail.
// Kept here so modeForView() can resolve which mode to highlight when one of them is active.
const SATELLITE_MODE = {
  developer: 'today',
  smcockpit: 'deliver',
  poworkspace: 'deliver',
  leadership: 'insight',
  adminops: 'extend',
  bql: 'insight',
  workspace: 'extend',
  settings3: 'extend',
  aicontrol: 'extend',
  customization: 'extend',
  security: 'extend',
  trash: 'extend',
};

// view id -> owning mode id. Falls back to the first mode so the rail always has a highlight.
export function modeForView(view) {
  for (const m of MODES) {
    if (m.surfaces.some((s) => s.id === view)) return m.id;
  }
  return SATELLITE_MODE[view] || MODES[0].id;
}

// The surfaces of a mode that `vis` may see (vis = tier number | { surfaces } | { tier }).
export function visibleSurfaces(modeId, vis) {
  const m = getMode(modeId);
  return m.surfaces.filter((s) => allowed(s.id, vis));
}

// The modes that have at least one visible surface — empty modes drop off the rail.
export function visibleModes(vis) {
  return MODES.filter((m) => m.surfaces.some((s) => allowed(s.id, vis)));
}

// mode id -> first surface view id the user may actually see (where the rail lands you when you
// click a mode). Falls back to the mode's first surface if nothing is visible.
export function firstSurfaceOf(modeId, vis) {
  const visible = visibleSurfaces(modeId, vis);
  if (visible.length) return visible[0].id;
  const m = getMode(modeId);
  return m.surfaces[0]?.id ?? MODES[0].surfaces[0].id;
}

// mode id -> mode object.
export function getMode(modeId) {
  return MODES.find((x) => x.id === modeId) || MODES[0];
}

// Friendly label for any known view id. Used to orient the user when the active view is a
// satellite (a lens cockpit or the BQL chip) that isn't pinned to its mode's sub-rail.
export function labelForView(view) {
  for (const m of MODES) {
    const s = m.surfaces.find((x) => x.id === view);
    if (s) return s.label;
  }
  const more = [...SETUP_DESTINATIONS, ...SATELLITES].find((x) => x.id === view);
  if (more) return more.label;
  const l = LENSES.find((x) => x.view === view);
  return l ? l.label : view;
}

// ─── Breadcrumb trail ────────────────────────────────────────────────────────
// Given a view id, produce the breadcrumb hierarchy: [Mode, Surface] (+ optional entity label).
// Returns an array of { label, labelKey, id, href?, onClick? } objects ready for the Breadcrumb
// atom. The last item in the array is the current page (no href — rendered as plain text).
//
// Examples:
//   breadcrumbTrail('board')       → [{ label: 'Deliver', id: 'deliver' }, { label: 'Board', id: 'board' }]
//   breadcrumbTrail('workspace')   → [{ label: 'More', id: 'more' }, { label: 'Settings', id: 'workspace' }]
//   breadcrumbTrail('dashboard')   → [{ label: 'Home', id: 'today' }, { label: 'Today', id: 'dashboard' }]
export function breadcrumbTrail(view, entityLabel) {
  // Check mode surfaces first
  for (const m of MODES) {
    const surface = m.surfaces.find((s) => s.id === view);
    if (surface) {
      const trail = [
        { label: m.label, labelKey: m.labelKey, id: m.id },
        { label: surface.label, labelKey: surface.labelKey, id: surface.id },
      ];
      if (entityLabel) trail.push({ label: entityLabel, id: 'entity' });
      return trail;
    }
  }

  // Check setup/satellite destinations (grouped under "More")
  const moreDest = [...SETUP_DESTINATIONS, ...SATELLITES].find((s) => s.id === view);
  if (moreDest) {
    const trail = [
      { label: 'More', labelKey: 'nav.more', id: 'more' },
      { label: moreDest.label, labelKey: moreDest.labelKey, id: moreDest.id },
    ];
    if (entityLabel) trail.push({ label: entityLabel, id: 'entity' });
    return trail;
  }

  // Check lenses — map to their owning mode
  const lens = LENSES.find((l) => l.view === view);
  if (lens) {
    const modeId = modeForView(view);
    const mode = getMode(modeId);
    const trail = [
      { label: mode.label, labelKey: mode.labelKey, id: mode.id },
      { label: lens.label, labelKey: `nav.${lens.id}`, id: view },
    ];
    if (entityLabel) trail.push({ label: entityLabel, id: 'entity' });
    return trail;
  }

  // Fallback: single-item trail
  return [{ label: labelForView(view), id: view }];
}

// ─── Role-aware mode landing ─────────────────────────────────────────────────
// When a lens is active, prefer the role's primary surface within a mode (instead of the
// tier-ordered first surface). Falls back to firstSurfaceOf when the lens has no primary
// surface in the mode or when no lens is active.
//
// Example: a Developer clicking the "Deliver" mode should land on 'board' (their primary
// surface there) rather than 'smcockpit' (which is first in the surface list but LEAD-tier).
export function roleLandingForMode(modeId, lensId, vis) {
  if (!lensId) return firstSurfaceOf(modeId, vis);

  const profile = ROLE_PROFILES[lensId];
  if (!profile?.primary) return firstSurfaceOf(modeId, vis);

  const mode = getMode(modeId);
  // Find the first surface in this mode that is in the role's primary list AND visible
  for (const surfaceId of profile.primary) {
    const inMode = mode.surfaces.some((s) => s.id === surfaceId);
    if (inMode && allowed(surfaceId, vis)) return surfaceId;
  }

  // No role-preferred surface in this mode — fall back to default
  return firstSurfaceOf(modeId, vis);
}
