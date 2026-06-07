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
