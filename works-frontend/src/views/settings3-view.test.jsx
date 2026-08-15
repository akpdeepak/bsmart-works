import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Settings3View from './settings3-view';

const noop = () => {};

const baseProps = {
  settings3Tab: 'workflows',
  workflows: [],
  expandedWorkflowId: null,
  workflowDetail: null,
  newStatusForm: { name: '', category: 'TO_DO', color: '#0B2F5C', isInitial: false },
  newTransitionForm: { name: '', fromStatus: '', toStatus: '' },
  fieldDefs: [],
  showFieldForm: false,
  newFieldForm: { name: '', fieldType: 'TEXT', description: '', required: false },
  fieldLayouts: [],
  fieldVisibility: [],
  newFieldVisForm: { fieldDefId: '', roleId: '', visibility: 'EDITABLE' },
  roles: [],
  permMatrix: null,
  showRoleForm: false,
  newRoleForm: { name: '', tier: 2 },
  workItemTypes: { builtIn: [], custom: [] },
  showTypeForm: false,
  newTypeForm: { label: '', typeKey: '', icon: '' },
  activeWorkspaceId: 'ws-1',
  setSettings3Tab: noop,
  setExpandedWorkflowId: noop,
  setNewStatusForm: noop,
  setNewTransitionForm: noop,
  setShowFieldForm: noop,
  setNewFieldForm: noop,
  setNewFieldVisForm: noop,
  setShowRoleForm: noop,
  setNewRoleForm: noop,
  setShowTypeForm: noop,
  setNewTypeForm: noop,
  fetchWorkflows: noop,
  fetchFieldDefs: noop,
  fetchFieldLayouts: noop,
  fetchRoles: noop,
  fetchFieldVisibility: noop,
  fetchPermMatrix: noop,
  fetchWorkItemTypes: noop,
  expandWorkflow: noop,
  addStatus: noop,
  deleteStatus: noop,
  addTransition: noop,
  deleteTransition: noop,
  createFieldDef: noop,
  saveFieldVisibility: noop,
  togglePermission: noop,
  createRole: noop,
  createWorkItemType: noop,
  reportError: noop,
  showToast: noop,
  api: { send: vi.fn(), raw: () => Promise.resolve({ json: () => ({}) }), send: () => Promise.resolve() },
};

describe('Settings3View', () => {
  it('renders the Workflows & Fields heading', () => {
    render(<Settings3View {...baseProps} />);
    expect(screen.getByRole('heading', { name: /workflows & fields/i, level: 1 })).toBeInTheDocument();
  });

  it('shows empty workflows state', () => {
    render(<Settings3View {...baseProps} />);
    expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
  });

  it('renders sub-tab buttons', () => {
    render(<Settings3View {...baseProps} />);
    expect(screen.getByRole('button', { name: /^workflows$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^custom fields$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^item types$/i })).toBeInTheDocument();
  });

  // Regression: the Field Layout tab showed a checkbox whose only action was a "go elsewhere" toast
  // (a dead control / honest-software violation). Visibility is owned by the Field Visibility tab,
  // so it now renders as a read-only Visible/Hidden status with no interactive checkbox.
  it('shows field visibility on the Layout tab as a read-only status, not a fake checkbox', () => {
    const { container } = render(
      <Settings3View
        {...baseProps}
        settings3Tab="layout"
        fieldDefs={[{ id: 'FD-1', name: 'Meter Serial', fieldType: 'TEXT' }]}
        fieldLayouts={[{ itemType: 'Story', layout: [{ fieldDefId: 'FD-1', visible: false }] }]}
      />,
    );
    // No interactive checkbox is rendered in the layout rows anymore.
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    // The honest read-only status is shown instead (Story row marks FD-1 hidden).
    expect(screen.getAllByText(/^Hidden$/).length).toBeGreaterThan(0);
  });

  // Regression: a second "Fields" tab persisted per-type field config to localStorage while telling
  // the admin "Changes are saved to this workspace" (a false front). Per-type field config is owned
  // by the server-backed "Detail Fields" tab (type_field_prefs), so the duplicate tab is retired.
  it('offers only the server-backed Detail Fields tab, not the retired localStorage one', () => {
    render(<Settings3View {...baseProps} />);
    expect(screen.queryByRole('button', { name: /^fields$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^detail fields$/i })).toBeInTheDocument();
  });

  it('does not claim workspace persistence anywhere it only writes to this browser', () => {
    const { container } = render(<Settings3View {...baseProps} settings3Tab="detail-fields" />);
    expect(container.textContent).not.toMatch(/saved to this workspace/i);
  });
});
