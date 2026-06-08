import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplianceView from './compliance-view';

const noop = () => {};

const baseProps = {
  complianceTab: 'dashboard',
  complianceDashboard: null,
  complianceRules: [],
  complianceTemplates: [],
  complianceViolations: [],
  complianceAudit: [],
  ruleBuilder: null,
  ruleTestResult: null,
  violationFilter: '',
  selectedViolations: [],
  activeWorkspaceId: 'ws-1',
  aiCapabilities: {},
  can: () => false,
  AiComplianceSuggestion: () => null,
  setComplianceTab: noop,
  setRuleBuilder: noop,
  setViolationFilter: noop,
  newRuleBuilder: noop,
  saveRule: noop,
  testRule: noop,
  evaluateRule: noop,
  setRuleActive: noop,
  editRuleBuilder: noop,
  deleteRule: noop,
  cloneTemplate: noop,
  fetchComplianceDashboard: noop,
  fetchComplianceRules: noop,
  fetchComplianceTemplates: noop,
  fetchComplianceViolations: noop,
  fetchComplianceAudit: noop,
  actOnViolation: noop,
  bulkAcknowledge: noop,
  toggleViolationSelect: noop,
  exportComplianceAudit: noop,
  showToast: noop,
  anyCapabilityEnabled: () => false,
};

describe('ComplianceView', () => {
  it('renders the Compliance heading', () => {
    render(<ComplianceView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^compliance$/i, level: 1 })).toBeInTheDocument();
  });

  it('shows skeleton loading state on dashboard tab when data is null', () => {
    const { container } = render(<ComplianceView {...baseProps} />);
    expect(container.querySelector('[aria-busy="true"][aria-label="Loading compliance dashboard"]')).toBeTruthy();
  });

  it('renders tab buttons', () => {
    render(<ComplianceView {...baseProps} />);
    expect(screen.getByRole('button', { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /violations/i })).toBeInTheDocument();
  });
});
