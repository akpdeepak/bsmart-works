import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceView from './workspace-view';

const noop = () => {};
const baseProps = {
  workspaceMembers: [{ id: 'USR-1', fullName: 'Deepak Pandey', email: 'd@bcits.com', role: 'OWNER' }],
  currentUser: { id: 'USR-1' },
  userRole: { role: 'OWNER', tier: 5 },
  inviteEmail: '',
  inviteMsg: '',
  notifPrefs: { notifyAssign: true, notifyComment: false, notifyMention: true, emailDigest: false },
  mfaSetup: null,
  mfaSetupCode: '',
  mfaSetupMsg: '',
  brandingColor: '#E94E1B',
  brandingDesc: '',
  projects: [],
  selectedProjectId: null,
  projectMembers: [],
  projectMemberEmail: '',
  projectMemberMsg: '',
  setInviteEmail: noop,
  setMfaSetup: noop,
  setMfaSetupCode: noop,
  setBrandingColor: noop,
  setBrandingDesc: noop,
  setProjectMemberEmail: noop,
  handleRemoveMember: noop,
  handleInvite: noop,
  saveNotifPrefs: noop,
  handleMfaEnroll: noop,
  handleMfaConfirm: noop,
  saveBranding: noop,
  fetchProjectMembers: noop,
  addProjectMember: noop,
  can: () => true,
  showToast: noop,
};

describe('WorkspaceView', () => {
  it('lists workspace members and the notification preferences', () => {
    render(<WorkspaceView {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Workspace Settings' })).toBeInTheDocument();
    // The member renders in both the Members and Role Management sections.
    expect(screen.getAllByText('Deepak Pandey').length).toBeGreaterThan(0);
    expect(screen.getByText('Assigned to a work item')).toBeInTheDocument();
  });

  it('offers MFA enrollment when not yet set up', () => {
    render(<WorkspaceView {...baseProps} />);
    expect(screen.getByRole('button', { name: /Set up authenticator app/ })).toBeInTheDocument();
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
