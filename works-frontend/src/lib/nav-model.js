// Two-tier navigation model — the single source of truth for the mode-rail + sub-rail shell
// (the redesign mockup). A "mode" is a top-level workspace (rendered as an icon on the navy rail);
// each mode owns a list of "surfaces" (the existing App views, rendered in the white sub-rail).
//
// View ids here MUST match the `view` strings the App switch renders and lib/routes.js maps to URLs
// — this module only reorganises how they are grouped and reached, never invents new destinations.

import {
  Home, LayoutGrid, BarChart2, Headset, BookOpen, Puzzle, Settings,
} from 'lucide-react';

// ─── Modes & their surfaces ─────────────────────────────────────────────────────
// Order matches the mockup rail top-to-bottom. The last mode ("Set up") is pinned to the
// bottom of the rail by the ModeRail component.

export const MODES = [
  { id: 'today', label: 'Home', Icon: Home, surfaces: [
    { id: 'dashboard',     label: 'Today' },
    { id: 'myworks',       label: 'My Works' },
    { id: 'notifications', label: 'Notifications' },
  ] },
  { id: 'deliver', label: 'Deliver', Icon: LayoutGrid, surfaces: [
    { id: 'smcockpit', label: 'Sprint Cockpit' },
    { id: 'board',     label: 'Board' },
    { id: 'backlog',   label: 'Backlog' },
    { id: 'sprint',    label: 'Active Sprint' },
    { id: 'releases',  label: 'Releases' },
    { id: 'projects',  label: 'Projects' },
    { id: 'pm',        label: 'PM Artifacts' },
  ] },
  { id: 'insight', label: 'Insight', Icon: BarChart2, surfaces: [
    { id: 'reports',       label: 'Reports' },
    { id: 'dashboards',    label: 'Dashboards' },
    { id: 'reportbuilder', label: 'Report Builder' },
    { id: 'performance',   label: 'Performance' },
  ] },
  { id: 'service', label: 'Service', Icon: Headset, surfaces: [
    { id: 'service',      label: 'Service Desk' },
    { id: 'supportinbox', label: 'Support Inbox' },
    { id: 'sla',          label: 'SLA' },
    { id: 'compliance',   label: 'Compliance' },
  ] },
  { id: 'know', label: 'Know', Icon: BookOpen, surfaces: [
    { id: 'knowledge',         label: 'Knowledge' },
    { id: 'knowledgeadvanced', label: 'Templates & Extract' },
  ] },
  { id: 'extend', label: 'Extend', Icon: Puzzle, surfaces: [
    { id: 'automations',     label: 'Automations' },
    { id: 'integrations',    label: 'Integrations' },
    { id: 'aistudio',        label: 'AI Studio' },
    { id: 'marketplace',     label: 'Marketplace' },
    { id: 'developerportal', label: 'Developer Portal' },
  ] },
  { id: 'setup', label: 'Set up', Icon: Settings, surfaces: [
    { id: 'workspace',     label: 'Settings' },
    { id: 'settings3',     label: 'Workflows & Fields' },
    { id: 'aicontrol',     label: 'AI Control' },
    { id: 'customization', label: 'Customization' },
    { id: 'security',      label: 'Security' },
    { id: 'trash',         label: 'Trash' },
  ] },
];

// ─── Lenses ─────────────────────────────────────────────────────────────────────
// The top-right lens switcher retunes the workspace to a role. Each lens maps to the existing
// role cockpit view + the dashboardRole string fetchDashboard() understands, so picking a lens
// jumps to that role's cockpit and the role-tuned "Today" dashboard follows.

export const LENSES = [
  { id: 'scrum-master',  label: 'Scrum Master',  view: 'smcockpit',   role: 'scrum-master' },
  { id: 'developer',     label: 'Developer',     view: 'developer',   role: 'developer' },
  { id: 'product-owner', label: 'Product Owner', view: 'poworkspace', role: 'product-owner' },
  { id: 'leadership',    label: 'Leadership',    view: 'leadership',  role: 'executive' },
  { id: 'admin',         label: 'Admin',         view: 'adminops',    role: 'admin' },
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
  adminops: 'setup',
  bql: 'insight',
};

// view id -> owning mode id. Falls back to the first mode so the rail always has a highlight.
export function modeForView(view) {
  for (const m of MODES) {
    if (m.surfaces.some((s) => s.id === view)) return m.id;
  }
  return SATELLITE_MODE[view] || MODES[0].id;
}

// mode id -> first surface view id (where the rail lands you when you click a mode).
export function firstSurfaceOf(modeId) {
  const m = MODES.find((x) => x.id === modeId);
  return m ? m.surfaces[0].id : MODES[0].surfaces[0].id;
}

// mode id -> mode object.
export function getMode(modeId) {
  return MODES.find((x) => x.id === modeId) || MODES[0];
}

// Friendly label for any known view id. Used to orient the user when the active view is a
// satellite (a lens cockpit or the BQL chip) that isn't pinned to its mode's sub-rail.
const EXTRA_LABELS = { bql: 'BQL Query', developer: 'Developer' };
export function labelForView(view) {
  for (const m of MODES) {
    const s = m.surfaces.find((x) => x.id === view);
    if (s) return s.label;
  }
  if (EXTRA_LABELS[view]) return EXTRA_LABELS[view];
  const l = LENSES.find((x) => x.view === view);
  return l ? l.label : view;
}
