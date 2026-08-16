import { useRef, useState } from 'react';
import { Settings, X, ChevronRight, ArrowRight, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { onPressKey } from '@/lib/utils';
import { BRAND_NAVY } from '@/lib/brand-tokens';

/**
 * WorkflowSettings — the "Workflows" sub-tab: workflow definitions with their
 * statuses (drag to reorder) and transitions (conditions / validators / post-functions).
 * Pure rendering shell — all data + handlers come from props (state lives in App).
 */
export default function WorkflowSettings({
  workflows,
  expandedWorkflowId,
  workflowDetail,
  newStatusForm,
  newTransitionForm,
  activeWorkspaceId,
  setExpandedWorkflowId,
  setNewStatusForm,
  setNewTransitionForm,
  fetchWorkflows,
  expandWorkflow,
  addStatus,
  deleteStatus,
  addTransition,
  deleteTransition,
  api,
}) {
  // Local drag state — useRef avoids re-renders during drag gesture.
  const statusDragId = useRef(null);
  // Expanded transition ID for viewing/editing conditions/validators/post-functions.
  const [expandedTransId, setExpandedTransId] = useState(null);
  // "Add rule" form state (one active form at a time per section).
  const [addRuleForm, setAddRuleForm] = useState({ transId: null, section: null, type: '', fieldKey: '', value: '', tier: 3 });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Workflow Definitions</h2>
        <Button variant="action" onClick={() => {
          const name = 'New Workflow ' + (workflows.length + 1);
          api.send(`/workflows`, { method: 'POST', body: JSON.stringify({ name, workspaceId: activeWorkspaceId, isDefault: false }) })
            .then(() => fetchWorkflows());
        }}>+ New Workflow</Button>
      </div>
      {workflows.length === 0
        ? <EmptyState icon={Settings} title="No workflows yet" subtitle="Create a workflow to define statuses and transitions for your work items."
            action={<Button variant="action" onClick={() => {
              api.send(`/workflows`, { method: 'POST', body: JSON.stringify({ name: 'Default Workflow', workspaceId: activeWorkspaceId, isDefault: true }) })
                .then(() => fetchWorkflows());
            }}>Create default workflow</Button>} />
        : <div className="space-y-3">
            {workflows.map(wf => {
              const isExpanded = expandedWorkflowId === wf.id;
              const detail = isExpanded ? workflowDetail : null;
              const statuses = detail?.statuses || [];
              const transitions = detail?.transitions || [];
              const CATEGORIES = ['TO_DO', 'IN_PROGRESS', 'DONE'];
              const catColor = { TO_DO: 'bg-neutral-200 text-neutral-700', IN_PROGRESS: 'bg-brand-navy/10 text-brand-navy', DONE: 'bg-semantic-success/10 text-semantic-success' };
              return (
                <div key={wf.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  {/* Workflow header */}
                  <div role="button" tabIndex={0} onKeyDown={onPressKey} aria-expanded={isExpanded}
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
                    onClick={() => expandWorkflow(wf.id)}>
                    <div className="flex items-center gap-3">
                      <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''} text-neutral-600 dark:text-neutral-400`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{wf.name}</span>
                      {wf.isDefault && <span className="text-xs bg-brand-navy text-white px-2 py-0.5 rounded-full font-semibold">DEFAULT</span>}
                      {wf.itemType && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded">{wf.itemType}</span>}
                    </div>
                    <div className="flex gap-3 items-center" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="none">
                      <span className="font-mono text-xs text-neutral-300">{wf.id}</span>
                      <Button unstyled onClick={() => api.send(`/workflows/${wf.id}`, { method: 'DELETE' }).then(() => { fetchWorkflows(); if (expandedWorkflowId === wf.id) setExpandedWorkflowId(null); })}
                        className="text-xs text-semantic-danger hover:underline">Delete</Button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 dark:border-neutral-700 p-5 bg-neutral-50 dark:bg-neutral-900 space-y-6">
                      {!detail ? <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">Loading...</p> : (
                        <>
                          {/* Statuses */}
                          <div>
                            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Statuses ({statuses.length})</p>
                            <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Workflow statuses — drag to reorder">
                              {statuses.map(s => (
                                <div key={s.id} role="listitem"
                                  draggable={true}
                                  onDragStart={() => { statusDragId.current = s.id; }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => {
                                    const fromId = statusDragId.current;
                                    if (!fromId || fromId === s.id) return;
                                    const ids = statuses.map(x => x.id);
                                    const fromIdx = ids.indexOf(fromId);
                                    const toIdx = ids.indexOf(s.id);
                                    const reordered = [...ids];
                                    reordered.splice(fromIdx, 1);
                                    reordered.splice(toIdx, 0, fromId);
                                    const order = reordered.map((id, pos) => ({ id, position: pos }));
                                    api.send(`/workflows/${wf.id}/statuses/reorder`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(order),
                                    }).then(() => expandWorkflow(wf.id));
                                  }}
                                  className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 cursor-grab active:cursor-grabbing select-none">
                                  <GripVertical className="h-3.5 w-3.5 text-neutral-300 flex-shrink-0" aria-hidden="true" />
                                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || BRAND_NAVY }}></span>
                                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${catColor[s.category] || 'bg-neutral-100 text-neutral-600'}`}>{s.category}</span>
                                  {s.isInitial && <span className="text-xs text-brand-amber font-bold">INITIAL</span>}
                                  <Button unstyled onClick={() => deleteStatus(wf.id, s.id)} className="text-neutral-300 hover:text-semantic-danger ml-1 text-xs" aria-label="Delete status"><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                                </div>
                              ))}
                            </div>
                            {/* Add status inline form */}
                            <div className="flex gap-2 items-end flex-wrap">
                              <div>
                                <label htmlFor="new-status-name" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Status Name</label>
                                <input id="new-status-name" className="input text-sm w-36" placeholder="e.g. In Review" value={newStatusForm.name}
                                  onChange={e => setNewStatusForm(f => ({ ...f, name: e.target.value }))} />
                              </div>
                              <div>
                                <label htmlFor="new-status-category" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Category</label>
                                <select id="new-status-category" className="input text-sm" value={newStatusForm.category}
                                  onChange={e => setNewStatusForm(f => ({ ...f, category: e.target.value }))}>
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label htmlFor="new-status-color" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Color</label>
                                <input id="new-status-color" type="color" className="h-9 w-12 rounded border border-neutral-200 cursor-pointer" value={newStatusForm.color}
                                  onChange={e => setNewStatusForm(f => ({ ...f, color: e.target.value }))} />
                              </div>
                              <Button variant="secondary" onClick={() => addStatus(wf.id)}>+ Add Status</Button>
                            </div>
                          </div>

                          {/* Transitions */}
                          <div>
                            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Transitions ({transitions.length})</p>
                            {transitions.length > 0 && (
                              <div className="space-y-1.5 mb-3">
                                {transitions.map(t => {
                                  const fromS = statuses.find(s => s.id === t.fromStatus);
                                  const toS = statuses.find(s => s.id === t.toStatus);
                                  const isExpTrans = expandedTransId === t.id;
                                  const conditions    = (() => { try { return JSON.parse(t.conditions || '[]'); } catch { return []; } })();
                                  const validators    = (() => { try { return JSON.parse(t.validators || '[]'); } catch { return []; } })();
                                  const postFunctions = (() => { try { return JSON.parse(t.postFunctions || '[]'); } catch { return []; } })();
                                  const totalRules = conditions.length + validators.length + postFunctions.length;
                                  const saveRules = (newConds, newVals, newPfs) => {
                                    api.send(`/workflows/${wf.id}/transitions/${t.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        ...t,
                                        conditions: JSON.stringify(newConds),
                                        validators: JSON.stringify(newVals),
                                        postFunctions: JSON.stringify(newPfs),
                                      }),
                                    }).then(() => expandWorkflow(wf.id));
                                  };
                                  return (
                                    <div key={t.id} className="bg-white dark:bg-neutral-700/50 rounded-lg border border-neutral-100 dark:border-neutral-600">
                                      <div className="flex items-center gap-2 text-sm px-3 py-2">
                                        <span className="font-medium text-neutral-700 dark:text-neutral-200 w-32 truncate">{t.name}</span>
                                        <span className="text-neutral-600 dark:text-neutral-400 text-xs">{fromS?.name || t.fromStatus}</span>
                                        <span className="text-neutral-300"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
                                        <span className="text-neutral-600 dark:text-neutral-400 text-xs">{toS?.name || t.toStatus}</span>
                                        <Button unstyled
                                          onClick={() => setExpandedTransId(isExpTrans ? null : t.id)}
                                          className="ml-auto flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy dark:hover:text-white transition-colors"
                                          aria-expanded={isExpTrans} aria-label="Toggle transition rules">
                                          {totalRules > 0 && <span className="bg-brand-navy text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{totalRules}</span>}
                                          <span className="hidden sm:inline">Rules</span>
                                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpTrans ? 'rotate-180' : ''}`} aria-hidden="true" />
                                        </Button>
                                        <Button unstyled onClick={() => deleteTransition(wf.id, t.id)} className="text-neutral-300 hover:text-semantic-danger text-xs" aria-label="Delete transition"><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                                      </div>
                                      {isExpTrans && (
                                        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-600 space-y-3 pt-2">
                                          {/* Conditions */}
                                          <div>
                                            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Conditions <span className="font-normal normal-case">(all must pass — who can trigger)</span></p>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                              {conditions.map((c, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-brand-navy/10 text-brand-navy dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                  {c.type}{c.tier ? ` tier≥${c.tier}` : ''}{c.fieldKey ? ` ${c.fieldKey}=${c.value}` : ''}
                                                  <Button unstyled onClick={() => saveRules(conditions.filter((_,j)=>j!==i), validators, postFunctions)} className="hover:text-semantic-danger" aria-label="Remove condition"><X className="h-3 w-3" aria-hidden="true" /></Button>
                                                </span>
                                              ))}
                                            </div>
                                            {addRuleForm.transId === t.id && addRuleForm.section === 'conditions' ? (
                                              <div className="flex gap-2 flex-wrap items-end">
                                                <select className="input text-xs w-44" value={addRuleForm.type} onChange={e => setAddRuleForm(f => ({ ...f, type: e.target.value }))}>
                                                  <option value="">— Condition type —</option>
                                                  <option value="IS_ASSIGNEE">IS_ASSIGNEE — only assignee</option>
                                                  <option value="HAS_MIN_TIER">HAS_MIN_TIER — minimum role tier</option>
                                                  <option value="FIELD_EQUALS">FIELD_EQUALS — field must equal value</option>
                                                </select>
                                                {addRuleForm.type === 'HAS_MIN_TIER' && (
                                                  <select className="input text-xs w-24" value={addRuleForm.tier} onChange={e => setAddRuleForm(f => ({ ...f, tier: Number(e.target.value) }))}>
                                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>Tier {n}</option>)}
                                                  </select>
                                                )}
                                                {addRuleForm.type === 'FIELD_EQUALS' && (
                                                  <>
                                                    <input className="input text-xs w-28" placeholder="fieldKey" value={addRuleForm.fieldKey} onChange={e => setAddRuleForm(f => ({ ...f, fieldKey: e.target.value }))} />
                                                    <input className="input text-xs w-28" placeholder="value" value={addRuleForm.value} onChange={e => setAddRuleForm(f => ({ ...f, value: e.target.value }))} />
                                                  </>
                                                )}
                                                <Button variant="secondary" onClick={() => {
                                                  if (!addRuleForm.type) return;
                                                  const rule = { type: addRuleForm.type };
                                                  if (addRuleForm.type === 'HAS_MIN_TIER') rule.tier = addRuleForm.tier;
                                                  if (addRuleForm.type === 'FIELD_EQUALS') { rule.fieldKey = addRuleForm.fieldKey; rule.value = addRuleForm.value; }
                                                  saveRules([...conditions, rule], validators, postFunctions);
                                                  setAddRuleForm(f => ({ ...f, transId: null, section: null, type: '' }));
                                                }}>Add</Button>
                                                <Button variant="ghost" onClick={() => setAddRuleForm(f => ({ ...f, transId: null, section: null }))}>Cancel</Button>
                                              </div>
                                            ) : (
                                              <Button unstyled className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'conditions', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add condition</Button>
                                            )}
                                          </div>
                                          {/* Validators */}
                                          <div>
                                            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Validators <span className="font-normal normal-case">(required before transition)</span></p>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                              {validators.map((v, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-semantic-warning/10 text-semantic-warning px-2 py-0.5 rounded-full">
                                                  {v.type}{v.fieldKey ? ` ${v.fieldKey}` : ''}
                                                  <Button unstyled onClick={() => saveRules(conditions, validators.filter((_,j)=>j!==i), postFunctions)} className="hover:text-semantic-danger" aria-label="Remove validator"><X className="h-3 w-3" aria-hidden="true" /></Button>
                                                </span>
                                              ))}
                                            </div>
                                            {addRuleForm.transId === t.id && addRuleForm.section === 'validators' ? (
                                              <div className="flex gap-2 flex-wrap items-end">
                                                <select className="input text-xs w-44" value={addRuleForm.type} onChange={e => setAddRuleForm(f => ({ ...f, type: e.target.value }))}>
                                                  <option value="">— Validator type —</option>
                                                  <option value="REQUIRE_COMMENT">REQUIRE_COMMENT — must have a comment</option>
                                                  <option value="REQUIRE_FIELD">REQUIRE_FIELD — field must not be empty</option>
                                                </select>
                                                {addRuleForm.type === 'REQUIRE_FIELD' && (
                                                  <input className="input text-xs w-28" placeholder="fieldKey" value={addRuleForm.fieldKey} onChange={e => setAddRuleForm(f => ({ ...f, fieldKey: e.target.value }))} />
                                                )}
                                                <Button variant="secondary" onClick={() => {
                                                  if (!addRuleForm.type) return;
                                                  const rule = { type: addRuleForm.type };
                                                  if (addRuleForm.type === 'REQUIRE_FIELD') rule.fieldKey = addRuleForm.fieldKey;
                                                  saveRules(conditions, [...validators, rule], postFunctions);
                                                  setAddRuleForm(f => ({ ...f, transId: null, section: null, type: '' }));
                                                }}>Add</Button>
                                                <Button variant="ghost" onClick={() => setAddRuleForm(f => ({ ...f, transId: null, section: null }))}>Cancel</Button>
                                              </div>
                                            ) : (
                                              <Button unstyled className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'validators', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add validator</Button>
                                            )}
                                          </div>
                                          {/* Post-functions */}
                                          <div>
                                            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Post-functions <span className="font-normal normal-case">(run after transition)</span></p>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                              {postFunctions.map((pf, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-semantic-success/10 text-semantic-success px-2 py-0.5 rounded-full">
                                                  {pf.type}{pf.fieldKey ? ` ${pf.fieldKey}=${pf.value}` : ''}
                                                  <Button unstyled onClick={() => saveRules(conditions, validators, postFunctions.filter((_,j)=>j!==i))} className="hover:text-semantic-danger" aria-label="Remove post-function"><X className="h-3 w-3" aria-hidden="true" /></Button>
                                                </span>
                                              ))}
                                            </div>
                                            {addRuleForm.transId === t.id && addRuleForm.section === 'postFunctions' ? (
                                              <div className="flex gap-2 flex-wrap items-end">
                                                <select className="input text-xs w-48" value={addRuleForm.type} onChange={e => setAddRuleForm(f => ({ ...f, type: e.target.value }))}>
                                                  <option value="">— Post-function type —</option>
                                                  <option value="ASSIGN_TO_CURRENT_USER">ASSIGN_TO_CURRENT_USER</option>
                                                  <option value="SET_FIELD">SET_FIELD — set a field value</option>
                                                </select>
                                                {addRuleForm.type === 'SET_FIELD' && (
                                                  <>
                                                    <input className="input text-xs w-28" placeholder="fieldKey" value={addRuleForm.fieldKey} onChange={e => setAddRuleForm(f => ({ ...f, fieldKey: e.target.value }))} />
                                                    <input className="input text-xs w-28" placeholder="value" value={addRuleForm.value} onChange={e => setAddRuleForm(f => ({ ...f, value: e.target.value }))} />
                                                  </>
                                                )}
                                                <Button variant="secondary" onClick={() => {
                                                  if (!addRuleForm.type) return;
                                                  const rule = { type: addRuleForm.type };
                                                  if (addRuleForm.type === 'SET_FIELD') { rule.fieldKey = addRuleForm.fieldKey; rule.value = addRuleForm.value; }
                                                  saveRules(conditions, validators, [...postFunctions, rule]);
                                                  setAddRuleForm(f => ({ ...f, transId: null, section: null, type: '' }));
                                                }}>Add</Button>
                                                <Button variant="ghost" onClick={() => setAddRuleForm(f => ({ ...f, transId: null, section: null }))}>Cancel</Button>
                                              </div>
                                            ) : (
                                              <Button unstyled className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'postFunctions', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add post-function</Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {statuses.length >= 2 && (
                              <div className="flex gap-2 items-end flex-wrap">
                                <div>
                                  <label htmlFor="new-transition-name" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Transition Name</label>
                                  <input id="new-transition-name" className="input text-sm w-32" placeholder="e.g. Start Review" value={newTransitionForm.name}
                                    onChange={e => setNewTransitionForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                  <label htmlFor="new-transition-from" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">From</label>
                                  <select id="new-transition-from" className="input text-sm" value={newTransitionForm.fromStatus}
                                    onChange={e => setNewTransitionForm(f => ({ ...f, fromStatus: e.target.value }))}>
                                    <option value="">— From —</option>
                                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label htmlFor="new-transition-to" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">To</label>
                                  <select id="new-transition-to" className="input text-sm" value={newTransitionForm.toStatus}
                                    onChange={e => setNewTransitionForm(f => ({ ...f, toStatus: e.target.value }))}>
                                    <option value="">— To —</option>
                                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                                <Button variant="secondary" onClick={() => addTransition(wf.id)}>+ Add Transition</Button>
                              </div>
                            )}
                            {statuses.length < 2 && <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">Add at least 2 statuses to define transitions.</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
