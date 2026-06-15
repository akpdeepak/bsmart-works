import { useState } from 'react';
import { ClipboardList, CheckCircle2, ScrollText, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Modal } from '@/components/works/molecules/modal';
import { PageHeader } from '@/components/works/atoms/page-header';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';

const severityClass = {
  CRITICAL: 'bg-semantic-danger text-white',
  HIGH:     'bg-semantic-warning text-white',
  MEDIUM:   'bg-brand-navy-tint text-white',
  LOW:      'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200',
  INFO:     'bg-neutral-100 text-neutral-600',
};

const vStatusClass = {
  OPEN:          'bg-semantic-danger text-white',
  ACKNOWLEDGED:  'bg-semantic-warning text-white',
  RESOLVED:      'bg-semantic-success text-white',
  WONT_FIX:      'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200',
};

/**
 * ComplianceView — rules engine, violations, and audit log.
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function ComplianceView({
  complianceTab,
  complianceDashboard,
  complianceRules,
  complianceTemplates,
  complianceViolations,
  complianceAudit,
  ruleBuilder,
  ruleTestResult,
  violationFilter,
  selectedViolations,
  activeWorkspaceId,
  aiCapabilities,
  can,
  AiComplianceSuggestion,
  projects = [],
  setComplianceTab,
  setRuleBuilder,
  setViolationFilter,
  newRuleBuilder,
  saveRule,
  testRule,
  evaluateRule,
  setRuleActive,
  editRuleBuilder,
  deleteRule,
  cloneTemplate,
  fetchComplianceDashboard,
  fetchComplianceRules,
  fetchComplianceTemplates,
  fetchComplianceViolations,
  fetchComplianceAudit,
  actOnViolation,
  bulkAcknowledge,
  toggleViolationSelect,
  selectAllViolations,
  exportComplianceAudit,
  showToast,
  anyCapabilityEnabled,
}) {
  // Gap 1 — per-violation resolution notes form
  const [resolveForm, setResolveForm] = useState(null); // { id, action } | null

  const selectableViolations = complianceViolations
    .filter(v => v.status === 'OPEN' || v.status === 'ACKNOWLEDGED')
    .map(v => v.id);
  const allSelected = selectableViolations.length > 0 &&
    selectableViolations.every(id => selectedViolations.includes(id));

  const COMPLIANCE_TABS = [
    { key: 'dashboard',  label: 'Dashboard',  load: () => fetchComplianceDashboard() },
    { key: 'rules',      label: 'Rules',      load: () => { fetchComplianceRules(); fetchComplianceTemplates(); } },
    { key: 'violations', label: 'Violations', load: () => fetchComplianceViolations() },
    { key: 'audit',      label: 'Audit log',  load: () => fetchComplianceAudit() },
  ];

  return (
    <Tabs
      value={complianceTab}
      onValueChange={(val) => {
        const t = COMPLIANCE_TABS.find(x => x.key === val);
        setComplianceTab(val);
        t?.load();
      }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header + tabs */}
      <div className="px-6 pt-5">
        <PageHeader
          title="Compliance"
          description="Native rules engine — define what compliance means, catch drift in hours not quarters."
          actions={complianceTab === 'rules' && can('manage_compliance') && (
            <Button variant="action" onClick={newRuleBuilder}>New Rule</Button>
          )}
          className="mb-3"
        />
        <TabList>
          {COMPLIANCE_TABS.map(t => (
            <Tab key={t.key} value={t.key}>{t.label}</Tab>
          ))}
        </TabList>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── DASHBOARD ── */}
        <TabPanel value="dashboard" className="pt-0">
          {!complianceDashboard ? (
            <div role="status" aria-busy="true" aria-label="Loading compliance dashboard">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 animate-pulse">
                    <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-700 rounded mb-2" />
                    <div className="h-8 w-12 bg-neutral-100 dark:bg-neutral-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 animate-pulse space-y-2">
                    <div className="h-4 w-32 bg-neutral-100 dark:bg-neutral-700 rounded mb-3" />
                    {[...Array(3)].map((_, j) => <div key={j} className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded" />)}
                  </div>
                ))}
              </div>
            </div>
          )
          : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active rules',  value: complianceDashboard.totals?.activeRules ?? 0,           tone: 'text-brand-navy' },
                  { label: 'Open',          value: complianceDashboard.totals?.openViolations ?? 0,        tone: 'text-semantic-danger' },
                  { label: 'Acknowledged',  value: complianceDashboard.totals?.acknowledgedViolations ?? 0, tone: 'text-semantic-warning' },
                  { label: 'Resolved',      value: complianceDashboard.totals?.resolvedViolations ?? 0,    tone: 'text-semantic-success' },
                ].map(c => (
                  <div key={c.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-semibold">{c.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${c.tone}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Open by severity</h3>
                  {(complianceDashboard.severityBreakdown || []).length === 0
                    ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No active violations. Clean posture.</p>
                    : (complianceDashboard.severityBreakdown || []).map(s => (
                      <div key={s.severity} className="flex items-center gap-3 py-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[s.severity] || severityClass.MEDIUM}`}>{s.severity}</span>
                        <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-navy rounded-full" style={{ width: `${Math.min(100, Number(s.count) * 12)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 w-8 text-right">{s.count}</span>
                      </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Top rules by open violations</h3>
                  {(complianceDashboard.topRules || []).length === 0
                    ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">Nothing flagged.</p>
                    : (complianceDashboard.topRules || []).map(r => (
                      <div key={r.rule_id} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                        <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">{r.rule_name}</span>
                        <span className="text-sm font-semibold text-semantic-danger ml-2">{r.count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">30-day detection trend</h3>
                {(complianceDashboard.trend || []).length === 0
                  ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No violations detected in the last 30 days.</p>
                  : (
                    <div className="flex items-end gap-1 h-28 mt-3">
                      {(complianceDashboard.trend || []).map(d => {
                        const max = Math.max(...complianceDashboard.trend.map(x => Number(x.count)), 1);
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center justify-end" title={`${d.day}: ${d.count}`}>
                            <div className="w-full bg-brand-navy-tint rounded-t" style={{ height: `${Math.max(4, Number(d.count) * 100 / max)}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>

              {/* Gap 6 — heatmap rows are clickable: drill into violations tab filtered by rule */}
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Rules × projects heatmap</h3>
                {(complianceDashboard.heatmap || []).length === 0
                  ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No open violations to map.</p>
                  : (
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                        <th className="py-1">Rule</th><th className="py-1">Project</th><th className="py-1 text-right">Open</th></tr></thead>
                      <tbody>
                        {(complianceDashboard.heatmap || []).map((h, i) => (
                          <tr key={i}
                            className="border-t border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                            onClick={() => { setComplianceTab('violations'); setViolationFilter('OPEN'); fetchComplianceViolations('OPEN'); }}
                            role="button"
                            aria-label={`View violations for ${h.rule_name}`}>
                            <td className="py-1.5 text-neutral-700 dark:text-neutral-200">{h.rule_name}</td>
                            <td className="py-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">{h.project_id || '—'}</td>
                            <td className="py-1.5 text-right font-semibold text-semantic-danger">{h.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          )
          }</TabPanel>

        {/* ── RULES ── */}
        <TabPanel value="rules" className="pt-0">
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Your rules ({complianceRules.length})</h3>
              {complianceRules.length === 0
                ? <EmptyState icon={ClipboardList} title="No rules yet" subtitle="Create a rule or start from a seeded template below." action={can('manage_compliance') ? <Button variant="action" onClick={newRuleBuilder}>New Rule</Button> : null} />
                : complianceRules.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[r.severity] || severityClass.MEDIUM}`}>{r.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{r.name}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate font-mono">{r.scopeBql ? `${r.scopeBql} ⟶ ` : ''}{r.assertionBql}</p>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${r.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>{r.active ? 'ACTIVE' : 'INACTIVE'}</span>
                    {can('manage_compliance') && <>
                      <button onClick={() => testRule(r.id)} className="text-xs text-brand-navy hover:underline">Test</button>
                      {r.active
                        ? <button onClick={() => evaluateRule(r.id)} className="text-xs text-brand-navy hover:underline">Run</button>
                        : null}
                      <button onClick={() => setRuleActive(r.id, !r.active)} className="text-xs text-brand-navy hover:underline">{r.active ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => editRuleBuilder(r)} className="text-xs text-neutral-500 hover:underline">Edit</button>
                      <button onClick={() => deleteRule(r.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
                    </>}
                  </div>
                ))}
              {ruleTestResult && ruleTestResult.valid && (
                <p className="text-xs text-neutral-500 mt-3">Last test: would flag <b>{ruleTestResult.violations}</b> item(s){ruleTestResult.sample?.length ? ` — e.g. ${ruleTestResult.sample.slice(0, 3).map(s => s.id).join(', ')}` : ''}.</p>
              )}
            </div>

            {/* B27 — AI compliance rule suggestion (hidden when AI is off; RB-40 §2) */}
            {anyCapabilityEnabled(aiCapabilities) && can('manage_compliance') && (
              <AiComplianceSuggestion
                workspaceId={activeWorkspaceId}
                onAdopt={rule => { setRuleBuilder({ ...rule, id: null }); }}
                onToast={showToast}
              />
            )}

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Seeded template library</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">Opinionated defaults — clone one, test it, then activate.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {complianceTemplates.map(t => (
                  <div key={t.id} className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${severityClass[t.severity] || severityClass.MEDIUM}`}>{t.severity}</span>
                    <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200 truncate" title={t.description}>{t.name}</span>
                    {can('manage_compliance') && <button onClick={() => cloneTemplate(t.id)} className="text-xs text-brand-navy hover:underline">+ Add</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabPanel>

        {/* ── VIOLATIONS ── */}
        <TabPanel value="violations" className="pt-0">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Gap 7 — select all checkbox */}
                {can('manage_compliance') && selectableViolations.length > 0 && (
                  <input
                    type="checkbox"
                    aria-label="Select all violations"
                    checked={allSelected}
                    onChange={() => selectAllViolations(allSelected ? [] : selectableViolations)}
                  />
                )}
                <select aria-label="Filter violations by status" value={violationFilter} onChange={e => { setViolationFilter(e.target.value); fetchComplianceViolations(e.target.value); }} className="input text-xs py-1">
                  <option value="">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="WONT_FIX">Won&apos;t fix</option>
                </select>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{complianceViolations.length} violation(s)</span>
              </div>
              {can('manage_compliance') && selectedViolations.length > 0 && (
                <Button variant="secondary" onClick={bulkAcknowledge}>Acknowledge {selectedViolations.length}</Button>
              )}
            </div>
            {complianceViolations.length === 0
              ? <EmptyState icon={CheckCircle2} title="No violations" subtitle="Nothing is breaching the active rules for this filter." />
              : complianceViolations.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  {can('manage_compliance') && (v.status === 'OPEN' || v.status === 'ACKNOWLEDGED') && (
                    <input type="checkbox" checked={selectedViolations.includes(v.id)} onChange={() => toggleViolationSelect(v.id)} aria-label={`Select violation ${v.id}`} />
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[v.severity] || severityClass.MEDIUM}`}>{v.severity}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{v.workItemTitle || v.workItemId}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{v.workItemId}</p>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${vStatusClass[v.status] || ''}`}>{v.status}{v.escalated ? <ArrowUp className="inline-block h-3 w-3 align-text-bottom" aria-label="Escalated" /> : ''}</span>
                  {can('manage_compliance') && (v.status === 'OPEN' || v.status === 'ACKNOWLEDGED') && <>
                    {v.status === 'OPEN' && <button onClick={() => actOnViolation(v.id, 'acknowledge')} className="text-xs text-brand-navy hover:underline">Ack</button>}
                    {/* Gap 1 — resolution notes before acting */}
                    <button onClick={() => setResolveForm({ id: v.id, action: 'resolve' })} className="text-xs text-semantic-success hover:underline">Resolve</button>
                    <button onClick={() => setResolveForm({ id: v.id, action: 'wont-fix' })} className="text-xs text-neutral-500 hover:underline">Won&apos;t fix</button>
                  </>}
                </div>
              ))}
          </div>
        </TabPanel>

        {/* ── AUDIT LOG ── */}
        <TabPanel value="audit" className="pt-0">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Append-only audit log</h3>
              <Button variant="secondary" onClick={exportComplianceAudit}>Export CSV</Button>
            </div>
            {complianceAudit.length === 0
              ? <EmptyState icon={ScrollText} title="No audit entries yet" subtitle="Rule changes, violations, acknowledgements and resolutions are recorded here." />
              : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                    <th className="py-1">When</th><th className="py-1">Event</th><th className="py-1">Subject</th><th className="py-1">Actor</th></tr></thead>
                  <tbody>
                    {complianceAudit.map((e, i) => (
                      <tr key={i} className="border-t border-neutral-100 dark:border-neutral-700">
                        <td className="py-1.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{e.occurred_at ? new Date(e.occurred_at).toLocaleString() : '—'}</td>
                        <td className="py-1.5 text-neutral-700 dark:text-neutral-200">{(e.event_type || '').replace(/^COMPLIANCE_/, '').replaceAll('_', ' ').toLowerCase()}</td>
                        <td className="py-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">{e.aggregate_id}</td>
                        <td className="py-1.5 text-neutral-500">{e.actor_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </TabPanel>
      </div>

      {/* Gap 1 — Resolution notes modal */}
      {resolveForm && (
        <ResolveModal
          action={resolveForm.action}
          onConfirm={note => { actOnViolation(resolveForm.id, resolveForm.action, note); setResolveForm(null); }}
          onClose={() => setResolveForm(null)}
        />
      )}

      {/* Rule builder (test-before-activate) */}
      {ruleBuilder && (
        <RuleBuilderModal
          ruleBuilder={ruleBuilder}
          setRuleBuilder={setRuleBuilder}
          projects={projects}
          saveRule={saveRule}
        />
      )}
    </Tabs>
  );
}

function ResolveModal({ action, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  const label = action === 'resolve' ? 'Resolve' : "Won't fix";
  return (
    <Modal title={label} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label htmlFor="resolve-note" className="block text-xs font-medium text-neutral-500 mb-1">
            Resolution note <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            id="resolve-note"
            className="input w-full h-24 resize-none"
            placeholder="Describe how this was resolved or why it won't be fixed…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="action" onClick={() => onConfirm(note.trim() || undefined)}>{label}</Button>
      </div>
    </Modal>
  );
}

function RuleBuilderModal({ ruleBuilder, setRuleBuilder, projects, saveRule }) {
  return (
    <Modal title={ruleBuilder.id ? 'Edit rule' : 'New compliance rule'} onClose={() => setRuleBuilder(null)} size="xl" className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-3">
        <div>
          <label htmlFor="rule-name" className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
          <input id="rule-name" className="input w-full" value={ruleBuilder.name} onChange={e => setRuleBuilder({ ...ruleBuilder, name: e.target.value })} placeholder="Stories need acceptance criteria before In Progress" />
        </div>
        <div>
          <label htmlFor="rule-desc" className="block text-xs font-medium text-neutral-500 mb-1">Description</label>
          <input id="rule-desc" className="input w-full" value={ruleBuilder.description} onChange={e => setRuleBuilder({ ...ruleBuilder, description: e.target.value })} />
        </div>
        {/* Gap 3 — project-scoped rules */}
        {projects.length > 0 && (
          <div>
            <label htmlFor="rule-project" className="block text-xs font-medium text-neutral-500 mb-1">Project scope <span className="text-neutral-400">(optional — leave blank to apply workspace-wide)</span></label>
            <select id="rule-project" className="input w-full" value={ruleBuilder.projectId} onChange={e => setRuleBuilder({ ...ruleBuilder, projectId: e.target.value })}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="rule-scope-bql" className="block text-xs font-medium text-neutral-500 mb-1">Scope (BQL) — which items the rule applies to</label>
          <input id="rule-scope-bql" className="input w-full font-mono text-sm" value={ruleBuilder.scopeBql} onChange={e => setRuleBuilder({ ...ruleBuilder, scopeBql: e.target.value })} placeholder="type = Story AND status = In Progress" />
        </div>
        <div>
          <label htmlFor="rule-assertion-bql" className="block text-xs font-medium text-neutral-500 mb-1">Assertion (BQL) — what scoped items must satisfy</label>
          <input id="rule-assertion-bql" className="input w-full font-mono text-sm" value={ruleBuilder.assertionBql} onChange={e => setRuleBuilder({ ...ruleBuilder, assertionBql: e.target.value })} placeholder="acceptance_criteria != ''" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rule-severity" className="block text-xs font-medium text-neutral-500 mb-1">Severity</label>
            <select id="rule-severity" className="input w-full" value={ruleBuilder.severity} onChange={e => setRuleBuilder({ ...ruleBuilder, severity: e.target.value })}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rule-eval-mode" className="block text-xs font-medium text-neutral-500 mb-1">Evaluation</label>
            <select id="rule-eval-mode" className="input w-full" value={ruleBuilder.evaluationMode} onChange={e => setRuleBuilder({ ...ruleBuilder, evaluationMode: e.target.value })}>
              <option value="CONTINUOUS">Continuous</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
        </div>

        {/* Gap 2 — extended notification routing: USER / EMAIL / SLACK */}
        <div>
          <span className="block text-xs font-medium text-neutral-500 mb-1">Notify</span>
          <div className="flex gap-4 text-sm text-neutral-700 dark:text-neutral-200 mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={ruleBuilder.notifyOwner} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyOwner: e.target.checked })} /> Item owner</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ruleBuilder.notifyAdmin} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyAdmin: e.target.checked })} /> Project admins</label>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label htmlFor="rule-notify-users" className="block text-xs text-neutral-400 mb-0.5">User IDs (comma-separated)</label>
              <input id="rule-notify-users" className="input w-full text-sm" value={ruleBuilder.notifyUsers} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyUsers: e.target.value })} placeholder="user-123, user-456" />
            </div>
            <div>
              <label htmlFor="rule-notify-emails" className="block text-xs text-neutral-400 mb-0.5">Email addresses (comma-separated)</label>
              <input id="rule-notify-emails" className="input w-full text-sm" value={ruleBuilder.notifyEmails} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyEmails: e.target.value })} placeholder="eng@example.com, ops@example.com" />
            </div>
            <div>
              <label htmlFor="rule-notify-slack" className="block text-xs text-neutral-400 mb-0.5">Slack channels (comma-separated)</label>
              <input id="rule-notify-slack" className="input w-full text-sm" value={ruleBuilder.notifySlack} onChange={e => setRuleBuilder({ ...ruleBuilder, notifySlack: e.target.value })} placeholder="#compliance-alerts, #eng-ops" />
            </div>
          </div>
        </div>

        {/* Gap 5 — multi-step escalation builder */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="block text-xs font-medium text-neutral-500">Escalation steps</span>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-brand-navy hover:underline"
              onClick={() => setRuleBuilder({ ...ruleBuilder, escalationSteps: [...(ruleBuilder.escalationSteps || []), { hours: 24, targets: [{ type: 'ITEM_OWNER' }] }] })}>
              <Plus aria-hidden="true" className="h-3 w-3" /> Add step
            </button>
          </div>
          {(ruleBuilder.escalationSteps || []).length === 0
            ? <p className="text-xs text-neutral-400 py-1">No steps — add a step to enable multi-step escalation, or use the single-step field below.</p>
            : (ruleBuilder.escalationSteps || []).map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                <span className="text-xs text-neutral-500 w-16 shrink-0">Step {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <label htmlFor={`step-hours-${idx}`} className="sr-only">Hours until step {idx + 1}</label>
                  <input
                    id={`step-hours-${idx}`}
                    type="number" min="1" className="input w-20 text-sm py-1"
                    value={step.hours}
                    onChange={e => {
                      const updated = ruleBuilder.escalationSteps.map((s, i) => i === idx ? { ...s, hours: Number(e.target.value) } : s);
                      setRuleBuilder({ ...ruleBuilder, escalationSteps: updated });
                    }} />
                  <span className="text-xs text-neutral-500">h →</span>
                </div>
                <select
                  aria-label={`Step ${idx + 1} target type`}
                  className="input text-sm py-1 flex-1"
                  value={(step.targets?.[0]?.type) || 'ITEM_OWNER'}
                  onChange={e => {
                    const updated = ruleBuilder.escalationSteps.map((s, i) => i === idx ? { ...s, targets: [{ type: e.target.value }] } : s);
                    setRuleBuilder({ ...ruleBuilder, escalationSteps: updated });
                  }}>
                  <option value="ITEM_OWNER">Item owner</option>
                  <option value="PROJECT_ADMIN">Project admin</option>
                  <option value="WORKSPACE_ADMIN">Workspace admin</option>
                </select>
                <button
                  type="button"
                  aria-label={`Remove step ${idx + 1}`}
                  onClick={() => setRuleBuilder({ ...ruleBuilder, escalationSteps: ruleBuilder.escalationSteps.filter((_, i) => i !== idx) })}>
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-semantic-danger" />
                </button>
              </div>
            ))}
          <p className="text-xs text-neutral-400 mt-1">Steps fire in order. A violation is marked fully escalated only when all steps have fired.</p>
        </div>

        <div>
          <label htmlFor="rule-escalate-hours" className="block text-xs font-medium text-neutral-500 mb-1">Single-step escalation — escalate if unacknowledged after (hours) <span className="text-neutral-400">— ignored when steps are defined above</span></label>
          <input id="rule-escalate-hours" type="number" min="0" className="input w-full" value={ruleBuilder.escalateAfterHours} onChange={e => setRuleBuilder({ ...ruleBuilder, escalateAfterHours: e.target.value })} placeholder="e.g. 24" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={() => setRuleBuilder(null)}>Cancel</Button>
        <Button variant="action" onClick={saveRule}>{ruleBuilder.id ? 'Save rule' : 'Create rule (inactive)'}</Button>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">New rules are created inactive — test them, then activate from the rules list.</p>
    </Modal>
  );
}
