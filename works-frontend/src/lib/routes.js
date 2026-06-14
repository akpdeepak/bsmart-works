// Pure view <-> URL path mapping for top-level navigation, so views become deep-linkable and
// browser back/forward + refresh work. Deliberately dependency-free (History API, no router
// library — adding one would mean rewriting the single-`view` monolith, RB-10 §12) and pure, so
// it can be unit-tested in isolation. Sub-state (open item, active tab) is not encoded yet.

export const VIEW_PATHS = {
  dashboard: '/',
  myworks: '/my-work',
  notifications: '/notifications',
  developer: '/developer',
  board: '/board',
  backlog: '/backlog',
  sprint: '/sprint',
  releases: '/releases',
  projects: '/projects',
  reports: '/reports',
  dashboards: '/dashboards',
  reportbuilder: '/report-builder',
  performance: '/performance',
  service: '/service-desk',
  sla: '/sla',
  compliance: '/compliance',
  security: '/security',
  smcockpit: '/sm-cockpit',
  poworkspace: '/po-workspace',
  leadership: '/leadership',
  adminops: '/admin-ops',
  pm: '/pm-artifacts',
  automations: '/automations',
  integrations: '/integrations',
  bql: '/bql',
  knowledge: '/knowledge',
  knowledgeadvanced: '/knowledge/advanced',
  aistudio: '/ai-studio',
  marketplace: '/marketplace',
  developerportal: '/developer-portal',
  supportinbox: '/support-inbox',
  settings3: '/settings/workflows',
  customization: '/customization',
  workspace: '/settings',
  account: '/account',
  trash: '/trash',
};

const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([v, p]) => [p, v]));

// view -> path. Returns null for an unknown view so the caller leaves the URL untouched rather
// than clobbering it (e.g. a transient sub-view that has no canonical path).
export function viewToPath(view) {
  return Object.prototype.hasOwnProperty.call(VIEW_PATHS, view) ? VIEW_PATHS[view] : null;
}

// path -> view. Tolerant of a trailing slash and letter case; null when nothing matches.
export function pathToView(pathname) {
  if (!pathname) return null;
  let p = pathname.toLowerCase();
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return PATH_VIEWS[p] || null;
}

// Entity route pattern — /items/:id
const ENTITY_RE = /^\/items\/([^/]+)$/i;

// Parses entity deep-link paths. Returns { kind: 'work-item', id } for /items/:id,
// or null for anything else. Call this after pathToView() returns null.
export function parseEntityRoute(pathname) {
  if (!pathname) return null;
  const m = ENTITY_RE.exec(pathname.replace(/\/$/, ''));
  if (m) return { kind: 'work-item', id: m[1] };
  return null;
}
