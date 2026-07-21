import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarNav } from './sidebar-nav';

const defaultProps = {
  activeView: 'dashboard',
  onNavigate: vi.fn(),
  workspace: { name: 'BCITS Works' },
  currentUser: { fullName: 'Deepak Pal' },
  userRole: 'Admin',
};

describe('SidebarNav', () => {
  it('renders expanded with workspace name and nav labels', () => {
    render(<SidebarNav {...defaultProps} />);
    expect(screen.getByText('BCITS Works')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backlog/i })).toBeInTheDocument();
  });

  it('marks the active nav item', () => {
    render(<SidebarNav {...defaultProps} activeView="backlog" />);
    const backlog = screen.getByRole('button', { name: /Backlog/i });
    expect(backlog.className).toMatch(/bg-white\/10/);
  });

  it('calls onNavigate with the item id on click', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<SidebarNav {...defaultProps} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: /Backlog/i }));
    expect(onNavigate).toHaveBeenCalledWith('backlog');
  });

  it('shows unread count badge on Notifications', () => {
    render(<SidebarNav {...defaultProps} unreadCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the full destination set (Service Desk, Automations, Sprint Cockpit, Performance)', () => {
    render(<SidebarNav {...defaultProps} />);
    for (const label of ['Service Desk', 'Automations', 'Sprint Cockpit', 'Performance', 'Compliance', 'Dashboards']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('derives visibility from the shared server surface contract', () => {
    render(<SidebarNav {...defaultProps} visibility={{ surfaces: ['dashboard', 'account'] }} />);
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Backlog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Security/i })).not.toBeInTheDocument();
  });

  it('uses the brand-orange tone for the unread notifications badge', () => {
    render(<SidebarNav {...defaultProps} unreadCount={3} />);
    expect(screen.getByText('3').className).toMatch(/bg-brand-orange/);
  });

  it('collapsed: hides nav labels, shows title attribute for tooltip', () => {
    render(<SidebarNav {...defaultProps} collapsed />);
    expect(screen.queryByText('Backlog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backlog/i })).toHaveAttribute('title', 'Backlog');
  });

  it('calls onToggleCollapse when collapse button clicked', async () => {
    const onToggleCollapse = vi.fn();
    const user = userEvent.setup();
    render(<SidebarNav {...defaultProps} onToggleCollapse={onToggleCollapse} />);
    await user.click(screen.getByRole('button', { name: /Collapse sidebar/i }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it('renders sign-out button and calls onLogout', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<SidebarNav {...defaultProps} onLogout={onLogout} />);
    await user.click(screen.getByRole('button', { name: /Sign out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('has a main navigation landmark', () => {
    render(<SidebarNav {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('without switcher props, shows a static workspace name (no switch button)', () => {
    render(<SidebarNav {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /Switch workspace/i })).not.toBeInTheDocument();
    expect(screen.getByText('BCITS Works')).toBeInTheDocument();
  });

  it('opens the workspace switcher and switches workspace', async () => {
    const onSwitchWorkspace = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarNav
        {...defaultProps}
        workspaces={[{ id: 'w1', name: 'BCITS Works' }, { id: 'w2', name: 'Acme DISCOM' }]}
        activeWorkspaceId="w1"
        onSwitchWorkspace={onSwitchWorkspace}
        onOpenWorkspaceSettings={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /Switch workspace/i }));
    await user.click(screen.getByRole('button', { name: /Acme DISCOM/i }));
    expect(onSwitchWorkspace).toHaveBeenCalledWith('w2');
  });

  it('opens workspace settings from the switcher', async () => {
    const onOpenWorkspaceSettings = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarNav
        {...defaultProps}
        workspaces={[{ id: 'w1', name: 'BCITS Works' }]}
        activeWorkspaceId="w1"
        onSwitchWorkspace={vi.fn()}
        onOpenWorkspaceSettings={onOpenWorkspaceSettings}
      />
    );
    await user.click(screen.getByRole('button', { name: /Switch workspace/i }));
    await user.click(screen.getByRole('button', { name: /Workspace settings/i }));
    expect(onOpenWorkspaceSettings).toHaveBeenCalledOnce();
  });
});
