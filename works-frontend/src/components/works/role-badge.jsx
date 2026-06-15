import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Role/tier badge — converted to cva (UX finding A4: unified badge family, WI-04).
// tier lookup is preserved for callers that resolve by numeric tier instead of string key.
const roleVariants = cva(
  'inline-flex items-center gap-1 text-xs font-semibold rounded whitespace-nowrap',
  {
    variants: {
      role: {
        OWNER:  'bg-brand-amber/10 text-brand-amber',
        ADMIN:  'bg-brand-navy/10 text-brand-navy dark:text-brand-navy-tint',
        LEAD:   'bg-semantic-success/10 text-semantic-success',
        MEMBER: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400',
        VIEWER: 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
      },
      small: {
        true:  'px-1 py-0.5',
        false: 'px-1.5 py-0.5',
      },
    },
    defaultVariants: { role: 'MEMBER', small: false },
  }
);

const TIER_TO_ROLE = { 5: 'OWNER', 4: 'ADMIN', 3: 'LEAD', 2: 'MEMBER', 1: 'VIEWER' };
const LABELS = { OWNER: 'Owner', ADMIN: 'Admin', LEAD: 'Lead', MEMBER: 'Member', VIEWER: 'Viewer' };

const KNOWN_ROLES = new Set(['OWNER', 'ADMIN', 'LEAD', 'MEMBER', 'VIEWER']);

export function RoleBadge({ role, tier, small = false, className }) {
  const raw = (role || '').toUpperCase();
  const r = KNOWN_ROLES.has(raw) ? raw : (TIER_TO_ROLE[tier] || 'MEMBER');
  return (
    <span className={cn(roleVariants({ role: r, small }), className)}>
      {LABELS[r] ?? r}
    </span>
  );
}
