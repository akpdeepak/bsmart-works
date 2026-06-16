// Pure grouping for the permission matrix (WI-32c). Turns the flat permission list into ordered,
// labelled domain groups so the matrix is navigable — a PRESENTATION-ONLY transform. It does not
// touch grant logic, tiers, or enforcement (those stay server-side in RbacService, RB-40 §1).
// Framework-free → unit-testable.

const DOMAIN_LABELS = {
  items: 'Work items',
  sprints: 'Sprints',
  projects: 'Projects',
  workflows: 'Workflows',
  permissions: 'Permissions & roles',
  members: 'Members',
  reports: 'Reports',
  automations: 'Automations',
  dashboards: 'Dashboards',
  knowledge: 'Knowledge',
  settings: 'Settings',
  integrations: 'Integrations',
};

// Preferred display order; domains not listed are appended alphabetically by label.
const DOMAIN_ORDER = [
  'items', 'sprints', 'projects', 'workflows', 'members', 'permissions',
  'automations', 'reports', 'dashboards', 'knowledge', 'integrations', 'settings',
];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The domain of a permission is its resource noun — the last underscore segment
// (e.g. create_items → items, manage_permissions → permissions). Falls back to 'general'.
export function domainOf(perm) {
  if (!perm) return 'general';
  const parts = String(perm).split('_');
  return parts[parts.length - 1] || 'general';
}

/**
 * Group a flat permission list into ordered domain groups.
 * @param {string[]} all
 * @returns {Array<{ domain, label, permissions: string[] }>}
 */
export function groupPermissions(all = []) {
  const map = new Map();
  for (const p of all) {
    const d = domainOf(p);
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(p);
  }
  const groups = [...map.entries()].map(([domain, permissions]) => ({
    domain,
    label: DOMAIN_LABELS[domain] ?? cap(domain),
    permissions,
  }));
  groups.sort((a, b) => {
    const ia = DOMAIN_ORDER.indexOf(a.domain);
    const ib = DOMAIN_ORDER.indexOf(b.domain);
    const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return ra !== rb ? ra - rb : a.label.localeCompare(b.label);
  });
  return groups;
}
