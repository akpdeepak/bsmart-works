import { TIER } from '@/lib/nav-model';

export const TODAY_ROLE_TABS = [
  { role: 'developer', label: 'Developer', minTier: TIER.MEMBER },
  { role: 'scrum-master', label: 'Scrum Master', minTier: TIER.LEAD },
  { role: 'product-owner', label: 'Product Owner', minTier: TIER.LEAD },
  { role: 'support-agent', label: 'Support Agent', minTier: TIER.MEMBER, permission: 'work_service' },
  { role: 'executive', label: 'Leadership', minTier: TIER.ADMIN },
  { role: 'admin', label: 'Admin', minTier: TIER.ADMIN },
];

export function availableTodayRoles(userRole = {}) {
  const tier = userRole.tier ?? 0;
  const permissions = new Set(userRole.permissions || []);
  return TODAY_ROLE_TABS.filter((option) => tier >= option.minTier
    && (!option.permission || permissions.has(option.permission)));
}
