// useComplianceState.js — Compliance Rules Engine domain state (TD-003 Phase 4)
// Extracted from AppShell: compliance rules, violations, audit, rule builder,
// and all associated CRUD/workflow functions.
import { useState } from 'react';

const COMPLIANCE_WS = 'WS-001';

/**
 * @param {Object}   api
 * @param {Function} showToast
 * @param {Function} reportError
 */
export function useComplianceState(api, showToast, reportError) {
  const [complianceTab, setComplianceTab]         = useState('dashboard');
  const [complianceRules, setComplianceRules]     = useState([]);
  const [complianceTemplates, setComplianceTemplates] = useState([]);
  const [complianceViolations, setComplianceViolations] = useState([]);
  const [complianceDashboard, setComplianceDashboard] = useState(null);
  const [complianceAudit, setComplianceAudit]     = useState([]);
  const [violationFilter, setViolationFilter]     = useState('');
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [ruleBuilder, setRuleBuilder]             = useState(null);
  const [ruleTestResult, setRuleTestResult]       = useState(null);

  function fetchComplianceRules() {
    api.raw(`/compliance/rules?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceRules(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchComplianceTemplates() {
    api.raw(`/compliance/rules/templates`).then(r => r.json())
      .then(d => setComplianceTemplates(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchComplianceViolations(status = violationFilter) {
    const qs = status ? `&status=${status}` : '';
    api.raw(`/compliance/violations?workspaceId=${COMPLIANCE_WS}${qs}`).then(r => r.json())
      .then(d => { setComplianceViolations(Array.isArray(d) ? d : []); setSelectedViolations([]); }).catch(reportError);
  }
  function fetchComplianceDashboard() {
    api.raw(`/compliance/dashboard?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceDashboard(d)).catch(reportError);
  }
  function fetchComplianceAudit() {
    api.raw(`/compliance/audit?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceAudit(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function newRuleBuilder() {
    setRuleTestResult(null);
    setRuleBuilder({ name: '', description: '', projectId: '', scopeBql: '', assertionBql: '', severity: 'MEDIUM',
      evaluationMode: 'CONTINUOUS', escalateAfterHours: '', notifyOwner: true, notifyAdmin: false,
      notifyUsers: '', notifyEmails: '', notifySlack: '', escalationSteps: [] });
  }

  function editRuleBuilder(rule) {
    setRuleTestResult(null);
    const notify = (() => { try { return JSON.parse(rule.notifyTo || '[]'); } catch { return []; } })();
    const types = notify.map(t => (typeof t === 'string' ? t : t.type));
    const userTargets = notify.filter(t => t.type === 'USER').map(t => t.id || '').filter(Boolean);
    const emailTargets = notify.filter(t => t.type === 'EMAIL').map(t => t.address || '').filter(Boolean);
    const slackTargets = notify.filter(t => t.type === 'SLACK').map(t => t.channel || '').filter(Boolean);
    const steps = (() => { try { return JSON.parse(rule.escalationSteps || '[]'); } catch { return []; } })();
    setRuleBuilder({ id: rule.id, name: rule.name || '', description: rule.description || '',
      projectId: rule.projectId || '',
      scopeBql: rule.scopeBql || '', assertionBql: rule.assertionBql || '', severity: rule.severity || 'MEDIUM',
      evaluationMode: rule.evaluationMode || 'CONTINUOUS',
      escalateAfterHours: rule.escalateAfterHours ?? '',
      notifyOwner: types.includes('ITEM_OWNER'), notifyAdmin: types.includes('PROJECT_ADMIN'),
      notifyUsers: userTargets.join(', '), notifyEmails: emailTargets.join(', '), notifySlack: slackTargets.join(', '),
      escalationSteps: steps });
  }

  function buildNotifyTo(b) {
    const targets = [];
    if (b.notifyOwner) targets.push({ type: 'ITEM_OWNER' });
    if (b.notifyAdmin) targets.push({ type: 'PROJECT_ADMIN' });
    if (b.notifyUsers) b.notifyUsers.split(',').map(s => s.trim()).filter(Boolean).forEach(id => targets.push({ type: 'USER', id }));
    if (b.notifyEmails) b.notifyEmails.split(',').map(s => s.trim()).filter(Boolean).forEach(address => targets.push({ type: 'EMAIL', address }));
    if (b.notifySlack) b.notifySlack.split(',').map(s => s.trim()).filter(Boolean).forEach(channel => targets.push({ type: 'SLACK', channel }));
    return JSON.stringify(targets);
  }

  function saveRule() {
    const b = ruleBuilder;
    if (!b.name.trim() || !b.assertionBql.trim()) { showToast('Name and assertion are required', 'error'); return; }
    const payload = {
      workspaceId: COMPLIANCE_WS, projectId: b.projectId || null, name: b.name.trim(), description: b.description,
      scopeBql: b.scopeBql, assertionBql: b.assertionBql, severity: b.severity,
      evaluationMode: b.evaluationMode, notifyTo: buildNotifyTo(b),
      escalateAfterHours: b.escalateAfterHours === '' ? null : Number(b.escalateAfterHours),
      escalationSteps: JSON.stringify(Array.isArray(b.escalationSteps) ? b.escalationSteps : []),
    };
    const req = b.id
      ? api.send(`/compliance/rules/${b.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : api.send(`/compliance/rules`, { method: 'POST', body: JSON.stringify(payload) });
    req.then(() => { showToast(b.id ? 'Rule updated' : 'Rule created'); setRuleBuilder(null); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to save rule', 'error'));
  }

  function testRule(id) {
    api.send(`/compliance/rules/${id}/test`, { method: 'POST' })
      .then(d => { setRuleTestResult(d); showToast(d.valid ? `Would flag ${d.violations} item(s)` : 'Rule did not validate', d.valid ? 'success' : 'error'); })
      .catch(e => showToast(e.message || 'Test failed', 'error'));
  }

  function setRuleActive(id, active) {
    api.send(`/compliance/rules/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' })
      .then(() => { showToast(active ? 'Rule activated' : 'Rule deactivated'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed', 'error'));
  }

  function evaluateRule(id) {
    api.send(`/compliance/rules/${id}/evaluate`, { method: 'POST' })
      .then(d => { showToast(`Evaluated: ${d.opened} opened, ${d.resolved} resolved`); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Evaluation failed', 'error'));
  }

  function cloneTemplate(templateId) {
    api.send(`/compliance/rules/from-template/${templateId}?workspaceId=${COMPLIANCE_WS}`, { method: 'POST' })
      .then(() => { showToast('Rule added from template'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to clone template', 'error'));
  }

  function deleteRule(id) {
    api.send(`/compliance/rules/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Rule deleted'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to delete', 'error'));
  }

  function actOnViolation(id, action, note) {
    const body = note ? JSON.stringify({ note }) : undefined;
    api.send(`/compliance/violations/${id}/${action}`, { method: 'POST', body })
      .then(() => { showToast('Violation updated'); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Failed', 'error'));
  }

  function bulkAcknowledge() {
    if (selectedViolations.length === 0) return;
    api.send(`/compliance/violations/bulk-acknowledge`, { method: 'POST', body: JSON.stringify({ ids: selectedViolations }) })
      .then(d => { showToast(`Acknowledged ${d.acknowledged} violation(s)`); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Bulk acknowledge failed', 'error'));
  }

  function toggleViolationSelect(id) {
    setSelectedViolations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAllViolations(ids) { setSelectedViolations(ids); }

  function exportComplianceAudit() {
    api.raw(`/compliance/audit/export?workspaceId=${COMPLIANCE_WS}`)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'compliance-audit.csv'; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Export failed', 'error'));
  }

  return {
    complianceTab, setComplianceTab,
    complianceRules, complianceTemplates, complianceViolations, complianceDashboard, complianceAudit,
    violationFilter, setViolationFilter,
    selectedViolations, setSelectedViolations,
    ruleBuilder, setRuleBuilder,
    ruleTestResult, setRuleTestResult,
    fetchComplianceRules, fetchComplianceTemplates, fetchComplianceViolations,
    fetchComplianceDashboard, fetchComplianceAudit,
    newRuleBuilder, editRuleBuilder, saveRule, testRule,
    setRuleActive, evaluateRule, cloneTemplate, deleteRule,
    actOnViolation, bulkAcknowledge, toggleViolationSelect, selectAllViolations,
    exportComplianceAudit,
  };
}
