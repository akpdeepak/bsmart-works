import { describe, it, expect } from 'vitest';
import { groupPermissions, domainOf } from './permission-groups';

describe('domainOf', () => {
  it('uses the resource noun (last underscore segment)', () => {
    expect(domainOf('create_items')).toBe('items');
    expect(domainOf('manage_permissions')).toBe('permissions');
    expect(domainOf('view_reports')).toBe('reports');
    expect(domainOf('admin')).toBe('admin');
    expect(domainOf('')).toBe('general');
  });
});

describe('groupPermissions', () => {
  it('groups permissions by domain with friendly labels in preferred order', () => {
    const groups = groupPermissions([
      'manage_permissions', 'create_items', 'edit_items', 'manage_sprints', 'view_reports',
    ]);
    // items before sprints before permissions before reports (DOMAIN_ORDER)
    expect(groups.map((g) => g.domain)).toEqual(['items', 'sprints', 'permissions', 'reports']);
    expect(groups[0]).toMatchObject({ label: 'Work items', permissions: ['create_items', 'edit_items'] });
    expect(groups.find((g) => g.domain === 'permissions').label).toBe('Permissions & roles');
  });

  it('appends unknown domains after the known ones', () => {
    const groups = groupPermissions(['create_items', 'do_zebra']);
    expect(groups[0].domain).toBe('items');
    expect(groups[groups.length - 1]).toMatchObject({ domain: 'zebra', label: 'Zebra' });
  });

  it('returns [] for no permissions', () => {
    expect(groupPermissions([])).toEqual([]);
  });
});
