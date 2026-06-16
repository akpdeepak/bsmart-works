import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PermissionsSettings from './permissions-settings';

const permMatrix = {
  allPermissions: ['view_items', 'create_items', 'manage_permissions'],
  roles: [{ id: 'r1', name: 'Support', tier: 2 }],
  matrix: [{ role: { id: 'r1', name: 'Support', tier: 2 }, permissions: { view_items: true, create_items: false, manage_permissions: false } }],
};

const baseProps = {
  permMatrix,
  showRoleForm: false,
  newRoleForm: { name: '', tier: 1 },
  setShowRoleForm: vi.fn(),
  setNewRoleForm: vi.fn(),
  togglePermission: vi.fn(),
  createRole: vi.fn(),
};

describe('PermissionsSettings — grouped matrix (WI-32c)', () => {
  it('renders domain group headers and the per-role granted count', () => {
    render(<PermissionsSettings {...baseProps} />);
    expect(screen.getByRole('button', { name: /work items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permissions & roles/i })).toBeInTheDocument();
    // Support role has exactly one grant (view_items).
    expect(screen.getByText(/1 granted/i)).toBeInTheDocument();
  });

  it('collapsing a group hides its permission rows', () => {
    render(<PermissionsSettings {...baseProps} />);
    expect(screen.getByText('view_items')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /work items/i }));
    expect(screen.queryByText('view_items')).not.toBeInTheDocument();
    // Other groups remain.
    expect(screen.getByText('manage_permissions')).toBeInTheDocument();
  });

  it('still calls togglePermission with unchanged grant semantics', () => {
    const togglePermission = vi.fn();
    render(<PermissionsSettings {...baseProps} togglePermission={togglePermission} />);
    // Toggle the view_items cell for role r1 (currently granted → revoke).
    const row = screen.getByText('view_items').closest('tr');
    fireEvent.click(within(row).getByRole('button'));
    expect(togglePermission).toHaveBeenCalledWith('r1', 'view_items', true);
  });
});
