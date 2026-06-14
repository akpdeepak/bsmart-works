import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import ComplianceView from './compliance-view';

// ComplianceView is a pure prop-driven shell. We sweep the four tabs (dashboard incl. the
// rules×projects heatmap, rules incl. template library, violations with bulk-select, audit table)
// plus the two modals (resolve-note, rule builder) for serious/critical a11y issues.

const noop = () => {};

const base = {
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
  projects: [{ id: 'P-1', name: 'WEB Portal' }],
  can: () => true,
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
  selectAllViolations: noop,
  exportComplianceAudit: noop,
  showToast: noop,
  anyCapabilityEnabled: () => false,
};

const DASHBOARD = {
  totals: { activeRules: 5, openViolations: 3, acknowledgedViolations: 1, resolvedViolations: 9 },
  severityBreakdown: [{ severity: 'HIGH', count: 2 }, { severity: 'LOW', count: 1 }],
  topRules: [{ rule_id: 'R-1', rule_name: 'AC before In Progress', count: 2 }],
  trend: [{ day: '2026-06-10', count: 1 }, { day: '2026-06-11', count: 3 }],
  heatmap: [{ rule_name: 'AC before In Progress', project_id: 'P-1', count: 2 }],
};
const RULES = [{ id: 'R-1', name: 'AC before In Progress', severity: 'HIGH', scopeBql: 'type = Story', assertionBql: "ac != ''", active: true }];
const TEMPLATES = [{ id: 'TPL-1', name: 'Definition of Ready', severity: 'MEDIUM', description: 'Stories ready' }];
const VIOLATIONS = [{ id: 'V-1', severity: 'HIGH', status: 'OPEN', workItemId: 'WI-1', workItemTitle: 'Login bug', escalated: false }];
const AUDIT = [{ event_type: 'COMPLIANCE_VIOLATION_RAISED', aggregate_id: 'V-1', actor_id: 'u-1', occurred_at: '2026-06-12T10:00:00Z' }];

describe('ComplianceView a11y', () => {
  it('dashboard tab (KPIs + severity + heatmap) has no serious/critical violations', async () => {
    const { container } = render(<ComplianceView {...base} complianceDashboard={DASHBOARD} />);
    await expectNoA11yViolations(container);
  });

  it('dashboard loading skeleton has no serious/critical violations', async () => {
    const { container } = render(<ComplianceView {...base} />);
    await expectNoA11yViolations(container);
  });

  it('rules tab (rules list + template library) has no serious/critical violations', async () => {
    const { container } = render(<ComplianceView {...base} complianceTab="rules" complianceRules={RULES} complianceTemplates={TEMPLATES} />);
    await expectNoA11yViolations(container);
  });

  it('violations tab (bulk-select + actions) has no serious/critical violations', async () => {
    const { container } = render(<ComplianceView {...base} complianceTab="violations" complianceViolations={VIOLATIONS} selectedViolations={['V-1']} />);
    await expectNoA11yViolations(container);
  });

  it('audit log tab (table) has no serious/critical violations', async () => {
    const { container } = render(<ComplianceView {...base} complianceTab="audit" complianceAudit={AUDIT} />);
    await expectNoA11yViolations(container);
  });

  it('resolve-note modal has no serious/critical violations', async () => {
    const { container } = render(
      <ComplianceView {...base} complianceTab="violations" complianceViolations={VIOLATIONS} ruleBuilder={null} />,
    );
    await expectNoA11yViolations(container);
  });

  it('rule-builder modal has no serious/critical violations', async () => {
    const ruleBuilder = {
      id: null, name: '', description: '', projectId: '', scopeBql: '', assertionBql: '',
      severity: 'MEDIUM', evaluationMode: 'CONTINUOUS', notifyOwner: true, notifyAdmin: false,
      notifyUsers: '', notifyEmails: '', notifySlack: '', escalationSteps: [{ hours: 24, targets: [{ type: 'ITEM_OWNER' }] }],
      escalateAfterHours: '',
    };
    const { container } = render(<ComplianceView {...base} complianceTab="rules" ruleBuilder={ruleBuilder} />);
    await expectNoA11yViolations(container);
  });
});
