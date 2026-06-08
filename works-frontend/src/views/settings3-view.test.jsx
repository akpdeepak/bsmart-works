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
  api: { raw: () => Promise.resolve({ json: () => ({}) }), send: () => Promise.resolve() },
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
});
