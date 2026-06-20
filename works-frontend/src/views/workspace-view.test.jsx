import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkspaceView from './workspace-view';

const noop = () => {};
const baseProps = {
  workspaceMembers: [{ id: 'USR-1', fullName: 'Deepak Pandey', email: 'd@bcits.com', role: 'OWNER' }],
  currentUser: { id: 'USR-1' },
  userRole: { role: 'OWNER', tier: 5 },
  inviteEmail: '',
  inviteMsg: '',
  brandingColor: '#E94E1B',
  brandingDesc: '',
  projects: [],
  selectedProjectId: null,
  projectMembers: [],
  projectMemberEmail: '',
  projectMemberMsg: '',
  setInviteEmail: noop,
  setBrandingColor: noop,
  setBrandingDesc: noop,
  setProjectMemberEmail: noop,
  handleRemoveMember: noop,
  handleInvite: noop,
  saveBranding: noop,
  fetchProjectMembers: noop,
  addProjectMember: noop,
  can: () => true,
  showToast: noop,
};

// Personal settings (MFA, notification prefs, language) moved to AccountView —
// covered in account-view.test.jsx.
describe('WorkspaceView', () => {
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = render(<WorkspaceView {...baseProps} />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('lists workspace members', () => {
    render(<WorkspaceView {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Workspace Settings' })).toBeInTheDocument();
    // The member renders in both the Members and Role Management sections.
    expect(screen.getAllByText('Deepak Pandey').length).toBeGreaterThan(0);
  });

  it('exposes the branding fields with associated labels (a11y)', () => {
    render(<WorkspaceView {...baseProps} />);
    expect(screen.getByLabelText('Primary Accent Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace Description')).toBeInTheDocument();
  });

  it('hides admin-only sections when not permitted', () => {
    render(<WorkspaceView {...baseProps} can={() => false} />);
    expect(screen.queryByText('Role Management')).toBeNull();
    expect(screen.queryByText('Workspace Branding')).toBeNull();
  });
});
