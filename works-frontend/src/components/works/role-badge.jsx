// Role/tier badge, extracted from the App.jsx monolith. ROLE_CONFIG stays module-private (used
// only here) so this file exports a single component (react-refresh/only-export-components). The
// unified <Badge> work (UX finding A4) will later fold this into the one badge API.
const ROLE_CONFIG = {
  OWNER:  { label: 'Owner',  bg: 'bg-brand-amber/10', text: 'text-brand-amber', tier: 5 },
  ADMIN:  { label: 'Admin',  bg: 'bg-brand-navy/10', text: 'text-brand-navy', tier: 4 },
  LEAD:   { label: 'Lead',   bg: 'bg-semantic-success/10', text: 'text-semantic-success', tier: 3 },
  MEMBER: { label: 'Member', bg: 'bg-neutral-100',   text: 'text-neutral-600', tier: 2 },
  VIEWER: { label: 'Viewer', bg: 'bg-neutral-50',    text: 'text-neutral-600 dark:text-neutral-400', tier: 1 },
};

export function RoleBadge({ role, tier, small = false }) {
  const r = ROLE_CONFIG[role] || Object.values(ROLE_CONFIG).find(config => config.tier === tier) || ROLE_CONFIG.MEMBER;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded ${small ? 'text-xs px-1 py-0.5' : 'text-xs px-1.5 py-0.5'} ${r.bg} ${r.text}`}>
      {r.label}
    </span>
  );
}
