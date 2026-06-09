import { useState } from 'react';
import {
  Construction, MessageCircle, ArrowLeft, AlertTriangle, LayoutDashboard,
  TrendingUp, Zap, CheckCircle2, ClipboardList, RefreshCw,
  ChevronUp, ArrowRight, Check, Megaphone, Reply, BarChart2, Repeat,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { StatCard } from '@/components/works/stat-card';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { api } from '@/lib/apiClient';
import { aiClient, anyCapabilityEnabled } from '@/lib/ai';

const RETRO_COLUMNS = {
  START_STOP_CONTINUE: [
    { key: 'START', label: 'Start' },
    { key: 'STOP', label: 'Stop' },
    { key: 'CONTINUE', label: 'Continue' },
  ],
  FOUR_LS: [
    { key: 'LIKED', label: 'Liked' },
    { key: 'LEARNED', label: 'Learned' },
    { key: 'LACKED', label: 'Lacked' },
    { key: 'LONGED_FOR', label: 'Longed for' },
  ],
  MAD_SAD_GLAD: [
    { key: 'MAD', label: 'Mad' },
    { key: 'SAD', label: 'Sad' },
    { key: 'GLAD', label: 'Glad' },
  ],
};

// Scrum Master Cockpit — extracted from the App.jsx monolith (Wave 3). Behaviour-preserving:
// the parent owns all state and handlers; this renders the seven-tab cockpit.
export default function ScrumMasterCockpitView({
  i15ProjectId, projects, smTab, impediments, newImpediment, activeStandup, standups,
  standupDraft, sprints, riskSprintId, riskPanel, planningTimeOff, planningResult, activeSprint,
  retros, activeRetro, newRetro, retroNoteDraft, reviewSprintId, reviewResult, patternsResult,
  users, aiCapabilities, aiLoading, activeWorkspaceId,
  setI15ProjectId, fetchImpediments, fetchStandups, fetchRetros, fetchSprints, setSmTab,
  updateImpediment, setNewImpediment, createImpediment,
  startStandup, openStandup, setActiveStandup, advanceStandup, completeStandup,
  setStandupDraft, recordStandup,
  setRiskSprintId, runRiskPanel,
  setPlanningTimeOff, runSprintPlanning,
  setActiveRetro, openRetro, setNewRetro, createRetro,
  addRetroNote, setRetroNoteDraft, voteRetroNote, convertRetroNote,
  setReviewSprintId, runReviewPrep, runPatterns,
  showToast, aiAction,
}) {
  const [confirmComplete, setConfirmComplete] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Scrum Master Cockpit</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Run the sprint — standup, impediments, risk, retro and review in one place.</p>
        </div>
        <select className="input text-sm py-1.5" value={i15ProjectId}
          onChange={e => { setI15ProjectId(e.target.value); fetchImpediments(e.target.value); fetchStandups(e.target.value); fetchRetros(e.target.value); fetchSprints(e.target.value); }}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Button variant="action" onClick={() => setSmTab('planning')}>Plan sprint</Button>
        <Button variant="secondary" onClick={() => setSmTab('standup')}>Start standup</Button>
        <Button variant="secondary" onClick={() => setSmTab('retro')}>Run retro</Button>
      </div>

      <div role="tablist" aria-label="Cockpit sections" className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-5">
        {[['impediments', 'Impediments'], ['standup', 'Standup'], ['risk', 'Risk panel'], ['planning', 'Planning'], ['retro', 'Retro'], ['review', 'Review prep'], ['patterns', 'Patterns']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={smTab === k} onClick={() => setSmTab(k)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${smTab === k ? 'border-brand-navy text-brand-navy dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {smTab === 'impediments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-2">
            {impediments.length === 0
              ? <EmptyState icon={Construction} title="No impediments" subtitle="Blockers raised here are tracked with owner, severity and age — not buried in chat." />
              : impediments.map(imp => (
                <div key={imp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.severity === 'CRITICAL' ? 'bg-semantic-danger text-white' : imp.severity === 'HIGH' ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{imp.severity}</span>
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{imp.title}</span>
                      </div>
                      {imp.description && <p className="text-xs text-neutral-500 mb-1">{imp.description}</p>}
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">{imp.category || 'Uncategorized'} · raised {imp.raisedAt ? new Date(imp.raisedAt).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.status === 'RESOLVED' ? 'bg-semantic-success text-white' : imp.status === 'ESCALATED' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{imp.status}</span>
                      {imp.status !== 'RESOLVED' && (
                        <div className="flex gap-2">
                          {imp.status !== 'ESCALATED' && <button onClick={() => updateImpediment(imp, { status: 'ESCALATED', escalated: true })} className="text-[11px] text-semantic-danger hover:underline">Escalate</button>}
                          <button onClick={() => updateImpediment(imp, { status: 'RESOLVED' })} className="text-[11px] text-brand-navy hover:underline">Resolve</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">Raise impediment</h3>
            <div className="space-y-3">
              <Field label="Title"><input className="input w-full text-sm" value={newImpediment.title} onChange={e => setNewImpediment({ ...newImpediment, title: e.target.value })} placeholder="What is blocked?" /></Field>
              <Field label="Severity">
                <select className="input w-full text-sm" value={newImpediment.severity} onChange={e => setNewImpediment({ ...newImpediment, severity: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Category"><input className="input w-full text-sm" value={newImpediment.category} onChange={e => setNewImpediment({ ...newImpediment, category: e.target.value })} placeholder="e.g. Environment, Dependency" /></Field>
              <Field label="Detail"><textarea className="input w-full text-sm" rows={2} value={newImpediment.description} onChange={e => setNewImpediment({ ...newImpediment, description: e.target.value })} /></Field>
              <Button variant="action" fullWidth onClick={createImpediment}>Raise impediment</Button>
            </div>
          </div>
        </div>
      )}

      {smTab === 'standup' && (
        <div>
          {!activeStandup ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standups</h3>
                <Button variant="action" onClick={startStandup}>Start standup</Button>
              </div>
              {standups.length === 0
                ? <EmptyState icon={MessageCircle} title="No standups yet" subtitle="Start a sequential, time-boxed standup — each member's turn is recorded." />
                : <div className="space-y-2">{standups.map(s => (
                    <button key={s.id} onClick={() => openStandup(s.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : s.id}</span>
                      <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${s.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{s.status}</span>
                    </button>))}</div>}
            </div>
          ) : (
            <div className="max-w-[880px]">
              <button onClick={() => setActiveStandup(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All standups</button>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standup — {activeStandup.session.status}</h3>
                {activeStandup.session.status !== 'COMPLETED' && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" onClick={advanceStandup}>Next member</Button>
                    <Button variant="action" onClick={completeStandup}>Complete</Button>
                    {anyCapabilityEnabled(aiCapabilities) && (
                      <Button
                        variant="secondary"
                        disabled={!!aiLoading['standup-draft']}
                        onClick={() => aiAction(
                          'standup-draft',
                          () => aiClient.generate(activeWorkspaceId, 'standup_draft', { sprintId: activeSprint?.id }),
                          res => {
                            const draft = res?.result || res?.text || '';
                            if (draft) { setStandupDraft(d => ({ ...d, today: draft })); showToast('AI drafted standup update', 'info'); }
                            if (res?.meta?.fallback) showToast('AI standup draft used fallback.', 'info');
                          },
                          'Enable AI to draft standup updates',
                        )}
                      >
                        {aiLoading['standup-draft'] ? 'Drafting…' : '✦ Draft standup'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {activeStandup.entries.map(e => {
                  const isCurrent = e.memberId === activeStandup.session.currentMemberId;
                  const name = (users.find(u => u.id === e.memberId) || {}).fullName || e.memberId;
                  return (
                    <div key={e.id} className={`rounded-xl p-3 border ${isCurrent ? 'border-brand-navy bg-brand-navy/5' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.status === 'RECORDED' ? 'bg-semantic-success text-white' : e.status === 'MISSING' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{e.status}</span>
                      </div>
                      {e.status === 'RECORDED' && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 space-y-0.5">
                          <p><span className="font-semibold">Yesterday:</span> {e.yesterday || '—'}</p>
                          <p><span className="font-semibold">Today:</span> {e.today || '—'}</p>
                          {e.blockers && <p className="text-semantic-danger"><span className="font-semibold">Blockers:</span> {e.blockers}</p>}
                        </div>
                      )}
                      {isCurrent && e.status !== 'RECORDED' && activeStandup.session.status !== 'COMPLETED' && (
                        <div className="mt-2 space-y-2">
                          <input className="input w-full text-xs" placeholder="Yesterday" value={standupDraft.yesterday} onChange={ev => setStandupDraft({ ...standupDraft, yesterday: ev.target.value })} />
                          <input className="input w-full text-xs" placeholder="Today" value={standupDraft.today} onChange={ev => setStandupDraft({ ...standupDraft, today: ev.target.value })} />
                          <input className="input w-full text-xs" placeholder="Blockers (optional)" value={standupDraft.blockers} onChange={ev => setStandupDraft({ ...standupDraft, blockers: ev.target.value })} />
                          <Button variant="action" onClick={() => recordStandup(e.id)}>Record & next</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {smTab === 'risk' && (
        <div>
          <div className="flex items-end gap-2 mb-4">
            <Field label="Sprint">
              <select className="input text-sm" value={riskSprintId} onChange={e => setRiskSprintId(e.target.value)}>
                <option value="">Select sprint…</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Button variant="action" onClick={runRiskPanel}>Analyze</Button>
          </div>
          {!riskPanel ? <EmptyState icon={AlertTriangle} title="Mid-sprint risk panel" subtitle="Live view of scope creep, stale items, unassigned work and breach predictions." />
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[['Scope creep', riskPanel.scopeCreep, 'work_item_id'], ['Stale items', riskPanel.staleItems, 'id'], ['Unassigned', riskPanel.unassignedItems, 'id'], ['Breach risk', riskPanel.breachPredictions, 'id']].map(([label, rows]) => (
                  <div key={label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{label}</h4>
                      <span className="text-lg font-bold text-brand-navy dark:text-white">{(rows || []).length}</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(rows || []).map((r, idx) => <p key={idx} className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{r.title || r.work_item_id || r.id}</p>)}
                      {(rows || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None — clear.</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {smTab === 'planning' && (
        <div>
          <div className="flex items-end gap-2 mb-4 flex-wrap">
            <Field label="Time off (points)"><input type="number" className="input text-sm w-28" value={planningTimeOff} onChange={e => setPlanningTimeOff(e.target.value)} /></Field>
            <Button variant="action" onClick={runSprintPlanning}>Suggest commit</Button>
            {anyCapabilityEnabled(aiCapabilities) && (
              <Button
                variant="secondary"
                disabled={!!aiLoading['sprint-plan']}
                onClick={() => aiAction(
                  'sprint-plan',
                  () => aiClient.generate(activeWorkspaceId, 'sprint_plan', { sprintId: activeSprint?.id, timeOffPoints: Number(planningTimeOff) || 0 }),
                  res => {
                    const suggestion = res?.result || res?.text || '';
                    if (suggestion) showToast(`AI sprint plan: ${suggestion.slice(0, 120)}`, 'info');
                    if (res?.meta?.fallback) showToast('AI sprint planning used fallback (capacity calc).', 'info');
                  },
                  'Enable AI for sprint planning suggestions',
                )}
              >
                {aiLoading['sprint-plan'] ? 'Planning…' : '✦ AI Sprint Plan'}
              </Button>
            )}
          </div>
          {!planningResult ? <EmptyState icon={LayoutDashboard} title="Sprint planning helper" subtitle="Capacity from rolling velocity, an AI-suggested commit, and the refined-item list." />
            : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Avg velocity" value={planningResult.averageVelocity} sub="last 3 sprints" color="text-brand-navy" icon={TrendingUp} />
                  <StatCard label="Capacity" value={planningResult.capacity} sub="velocity − time off" color="text-semantic-success" icon={Zap} />
                  <StatCard label="Suggested" value={planningResult.suggestedPoints} sub="points committed" color="text-brand-navy" icon={CheckCircle2} />
                  <StatCard label="Ready" value={planningResult.readyCount} sub="refined items" color="text-neutral-600" icon={ClipboardList} />
                </div>
                <AiMetaBadge meta={planningResult.meta} narrative={planningResult.narrative} />
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Suggested commit</h4>
                  {(planningResult.suggestedItems || []).map(i => (
                    <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                      <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority}</span>
                      <span className="text-xs font-mono text-brand-navy">{i.story_points} pts</span>
                    </div>
                  ))}
                  {(planningResult.suggestedItems || []).length === 0 && <p className="text-xs text-neutral-600">No ready items fit the capacity.</p>}
                </div>
              </div>
            )}
        </div>
      )}

      {smTab === 'retro' && (
        <div>
          {!activeRetro ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-2">
                {retros.length === 0
                  ? <EmptyState icon={RefreshCw} title="No retros yet" subtitle="Pick a template, gather the team, and turn outcomes into tracked action items." />
                  : retros.map(r => (
                    <button key={r.id} onClick={() => openRetro(r.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.title}</span>
                      <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">{r.template}</span>
                      <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${r.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{r.status}</span>
                    </button>))}
              </div>
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">New retro</h3>
                <div className="space-y-3">
                  <Field label="Title"><input className="input w-full text-sm" value={newRetro.title} onChange={e => setNewRetro({ ...newRetro, title: e.target.value })} /></Field>
                  <Field label="Template">
                    <select className="input w-full text-sm" value={newRetro.template} onChange={e => setNewRetro({ ...newRetro, template: e.target.value })}>
                      <option value="START_STOP_CONTINUE">Start / Stop / Continue</option>
                      <option value="FOUR_LS">4 Ls (Liked/Learned/Lacked/Longed for)</option>
                      <option value="MAD_SAD_GLAD">Mad / Sad / Glad</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input type="checkbox" checked={newRetro.anonymous} onChange={e => setNewRetro({ ...newRetro, anonymous: e.target.checked })} /> Anonymous
                  </label>
                  <Button variant="action" fullWidth onClick={createRetro}>Create retro</Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setActiveRetro(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All retros</button>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{activeRetro.session.title}</h3>
                {activeRetro.session.status !== 'COMPLETED' && <Button variant="secondary" onClick={() => setConfirmComplete(true)}>Complete retro</Button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RETRO_COLUMNS[activeRetro.session.template].map(col => (
                  <div key={col.key} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
                    <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">{col.label}</h4>
                    <div className="space-y-2 mb-2">
                      {activeRetro.notes.filter(n => n.columnKey === col.key).map(n => (
                        <div key={n.id} className="bg-neutral-50 dark:bg-neutral-700 rounded-md p-2">
                          <p className="text-xs text-neutral-800 dark:text-neutral-100">{n.content}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => voteRetroNote(n.id)} className="text-[11px] text-brand-navy hover:underline" aria-label="Upvote"><ChevronUp className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> {n.votes}</button>
                            {!n.convertedActionItemId && <button onClick={() => convertRetroNote(n.id)} className="text-[11px] text-semantic-success hover:underline" aria-label="Convert to action item"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />Action</button>}
                            {n.convertedActionItemId && <span className="text-xs text-neutral-600 dark:text-neutral-400"><Check className="inline-block h-3 w-3 align-text-bottom" aria-hidden="true" /> action</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeRetro.session.status !== 'COMPLETED' && (
                      <div className="flex gap-1">
                        <input className="input flex-1 text-xs" placeholder="Add…" value={retroNoteDraft[col.key] || ''} onChange={e => setRetroNoteDraft({ ...retroNoteDraft, [col.key]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addRetroNote(col.key); }} />
                        <button onClick={() => addRetroNote(col.key)} className="px-2 rounded-md bg-brand-navy text-white text-sm">+</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {smTab === 'review' && (
        <div>
          <div className="flex items-end gap-2 mb-4">
            <Field label="Sprint">
              <select className="input text-sm" value={reviewSprintId} onChange={e => setReviewSprintId(e.target.value)}>
                <option value="">Select sprint…</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Button variant="action" onClick={runReviewPrep}>Draft review</Button>
          </div>
          {!reviewResult ? <EmptyState icon={Megaphone} title="Sprint review prep" subtitle="Auto-drafts the summary, demo list and metrics for stakeholders." />
            : (
              <div className="space-y-4">
                <AiMetaBadge meta={reviewResult.meta} narrative={reviewResult.narrative} />
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Shipped" value={(reviewResult.shipped || []).length} sub={`${reviewResult.donePoints}/${reviewResult.totalPoints} pts`} color="text-semantic-success" icon={CheckCircle2} />
                  <StatCard label="Slipped" value={(reviewResult.slipped || []).length} sub="not done" color="text-semantic-warning" icon={Reply} />
                  <StatCard label="Completion" value={`${reviewResult.completionRate}%`} sub="of items" color="text-brand-navy" icon={BarChart2} />
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Demo list</h4>
                  {(reviewResult.demoList || []).map(i => <p key={i.id} className="text-sm text-neutral-700 dark:text-neutral-200 py-0.5">• {i.title}</p>)}
                  {(reviewResult.demoList || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">Nothing shipped yet.</p>}
                </div>
              </div>
            )}
        </div>
      )}

      {smTab === 'patterns' && (
        <div>
          <Button variant="action" onClick={runPatterns}>Detect patterns</Button>
          {!patternsResult ? <div className="mt-4"><EmptyState icon={Repeat} title="Cross-sprint patterns" subtitle="Recurring impediments, repeated estimation misses, and common scope-creep sources." /></div>
            : (
              <div className="mt-4 space-y-4">
                <AiMetaBadge meta={patternsResult.meta} narrative={patternsResult.narrative} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Recurring impediments</h4>
                    {(patternsResult.recurringImpediments || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.category} · {r.count}×</p>)}
                    {(patternsResult.recurringImpediments || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Estimation misses</h4>
                    {(patternsResult.estimationMisses || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.sprintName}: −{r.missedBy} pts</p>)}
                    {(patternsResult.estimationMisses || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Scope-creep sources</h4>
                    {(patternsResult.scopeCreepSources || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.actor || 'Unknown'} · {r.additions}×</p>)}
                    {(patternsResult.scopeCreepSources || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
      {confirmComplete && activeRetro?.session && (
        <div role="dialog" aria-modal="true" aria-labelledby="retro-confirm-title"
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-700">
            <h2 id="retro-confirm-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Complete retro?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
              Marking <span className="font-medium text-neutral-900 dark:text-neutral-100">"{activeRetro.session.title}"</span> as complete locks it for editing.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmComplete(false)}>Cancel</Button>
              <Button variant="action" onClick={() => { api.send(`/retros/${activeRetro.session.id}/complete`, { method: 'POST' }).then(() => { openRetro(activeRetro.session.id); setConfirmComplete(false); }); }}>Complete retro</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
