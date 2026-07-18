import { Map as MapIcon, Lightbulb, Send, Target, FileText, Megaphone, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { IconButton } from '@/components/works/atoms/icon-button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import { PageLayout } from '@/components/works/templates/page-layout';

// Product Owner Workspace — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-
// preserving: the parent owns all roadmap/idea/feedback/OKR/release-note state and handlers; this
// renders the six-tab cockpit.
export default function PoWorkspaceView({
  loading = false,
  i15ProjectId, projects, poTab, roadmapThemes, newTheme, ideas, newIdea, feedbackItems,
  feedbackClusters, newFeedback, objectives, activeObjective, newObjective, newKr,
  releaseNotesName, releaseNotesResult, setI15ProjectId, setPoTab, setNewTheme, setNewIdea,
  setNewFeedback, setNewObjective, setNewKr, setReleaseNotesName, setView, setPmProjectId,
  updateThemeStatus, createTheme, deleteTheme, voteIdea, promoteIdea, createIdea, clusterFeedback,
  createFeedback, openObjective, updateKrProgress, addKeyResult, createObjective,
  runReleaseNotes, fetchStakeholders,
}) {
  if (loading && projects.length === 0) {
    return (
      <PageLayout header={null}>
        <ListSkeleton rows={4} />
      </PageLayout>
    );
  }

  const STATUS_BADGE = {
    PLANNED:     'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    IN_PROGRESS: 'bg-brand-navy/10 text-brand-navy dark:text-brand-navy-tint',
    SHIPPED:     'bg-semantic-success/10 text-semantic-success',
    ON_HOLD:     'bg-semantic-warning/10 text-semantic-warning',
  };

  function groupByQuarter(themes) {
    const map = {};
    themes.forEach(t => {
      const key = t.quarter || 'Unscheduled';
      (map[key] = map[key] || []).push(t);
    });
    return Object.keys(map)
      .sort((a, b) => {
        if (a === 'Unscheduled') return 1;
        if (b === 'Unscheduled') return -1;
        return a.localeCompare(b);
      })
      .map(q => ({ quarter: q, themes: map[q] }));
  }

  return (
            <PageLayout header={null} className="flex h-full flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Product Owner Workspace</h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Roadmap, customer voice, OKRs and release planning in one strategic surface.</p>
                </div>
                <select className="input text-sm py-1.5" value={i15ProjectId} onChange={e => setI15ProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-5">
                {[['roadmap', 'Roadmap'], ['ideas', 'Idea inbox'], ['feedback', 'Customer feedback'], ['okr', 'OKRs'], ['releasenotes', 'Release notes'], ['stakeholders', 'Stakeholders']].map(([k, label]) => (
                  // Tab bar — separate migration (works-view tab primitive not yet available)
                  // eslint-disable-next-line works-view/no-raw-button
                  <button key={k} onClick={() => setPoTab(k)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${poTab === k ? 'border-brand-navy text-brand-navy dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {poTab === 'roadmap' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    {roadmapThemes.length === 0 ? (
                      <EmptyState icon={MapIcon} title="No themes yet" subtitle="Lay out strategic themes across quarters — status, scope and dates per theme." />
                    ) : groupByQuarter(roadmapThemes).map(({ quarter, themes }) => (
                      <section key={quarter} className="mb-6" aria-label={`Quarter: ${quarter}`}>
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-2">{quarter}</h2>
                        <div className="space-y-2">
                          {themes.map(t => (
                            <div key={t.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  {t.color && (
                                    <span
                                      className="mt-0.5 h-3.5 w-3.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: t.color }}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{t.name}</span>
                                    {t.description && (
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t.description}</p>
                                    )}
                                    {(t.startDate || t.targetDate) && (
                                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                                        {t.startDate && <span>{t.startDate}</span>}
                                        {t.startDate && t.targetDate && <span aria-hidden="true"> → </span>}
                                        {t.targetDate && <span>{t.targetDate}</span>}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[t.status] || STATUS_BADGE.PLANNED}`}>
                                    {t.status.replace('_', ' ')}
                                  </span>
                                  <select
                                    className="input text-xs py-1"
                                    value={t.status}
                                    onChange={e => updateThemeStatus(t, e.target.value)}
                                    aria-label={`Change status for ${t.name}`}
                                  >
                                    {['PLANNED', 'IN_PROGRESS', 'SHIPPED', 'ON_HOLD'].map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <IconButton
                                    variant="danger"
                                    size="xs"
                                    onClick={() => deleteTheme(t.id)}
                                    aria-label={`Delete ${t.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </IconButton>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                    <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">Add theme</h3>
                    <div className="space-y-3">
                      <Field label="Name"><input className="input w-full text-sm" value={newTheme.name} onChange={e => setNewTheme({ ...newTheme, name: e.target.value })} /></Field>
                      <Field label="Quarter"><input className="input w-full text-sm" placeholder="2026-Q3" value={newTheme.quarter} onChange={e => setNewTheme({ ...newTheme, quarter: e.target.value })} /></Field>
                      <Field label="Description"><textarea className="input w-full text-sm" rows={2} value={newTheme.description} onChange={e => setNewTheme({ ...newTheme, description: e.target.value })} /></Field>
                      <Button variant="action" fullWidth onClick={createTheme}>Add to roadmap</Button>
                    </div>
                  </div>
                </div>
              )}

              {poTab === 'ideas' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-2">
                    {ideas.length === 0
                      ? <EmptyState icon={Lightbulb} title="Empty inbox" subtitle="Capture ideas fast — they're auto-classified by area and promotable to a story." />
                      : ideas.map(i => (
                        <div key={i.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-brand-navy/10 text-brand-navy">{i.area}</span>
                                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                              </div>
                              {i.description && <p className="text-xs text-neutral-500 mt-1">{i.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button variant="link" size="sm" onClick={() => voteIdea(i.id)} aria-label="Upvote"><ChevronUp className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> {i.votes}</Button>
                              {i.status === 'PROMOTED' ? <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-semantic-success text-white">PROMOTED</span>
                                : <Button variant="link" size="sm" onClick={() => promoteIdea(i.id)} className="text-semantic-success">Promote</Button>}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                    <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">Capture idea</h3>
                    <div className="space-y-3">
                      <Field label="Title"><input className="input w-full text-sm" value={newIdea.title} onChange={e => setNewIdea({ ...newIdea, title: e.target.value })} /></Field>
                      <Field label="Detail"><textarea className="input w-full text-sm" rows={3} value={newIdea.description} onChange={e => setNewIdea({ ...newIdea, description: e.target.value })} /></Field>
                      <Button variant="action" fullWidth onClick={createIdea}>Add to inbox</Button>
                    </div>
                  </div>
                </div>
              )}

              {poTab === 'feedback' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Feedback ({feedbackItems.length})</h3>
                      <Button variant="secondary" onClick={clusterFeedback}>Cluster into themes</Button>
                    </div>
                    {feedbackClusters && (
                      <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4">
                        <AiMetaBadge meta={feedbackClusters.meta} narrative={feedbackClusters.narrative} />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(feedbackClusters.clusters || []).map((c, idx) => (
                            <div key={idx} className="bg-white dark:bg-neutral-800 rounded-md p-2 border border-neutral-200 dark:border-neutral-700">
                              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{c.theme}</span><span className="text-xs text-brand-navy font-bold">{c.count}</span></div>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400">+{c.positive} / ~{c.neutral} / −{c.negative}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {feedbackItems.length === 0
                      ? <EmptyState icon={Send} title="No feedback yet" subtitle="Aggregate customer voice from portal, email and interviews, then cluster into themes." />
                      : feedbackItems.map(f => (
                        <div key={f.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{f.source}</span>
                            {f.customer && <span className="text-xs text-neutral-500">· {f.customer}</span>}
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${f.sentiment === 'POSITIVE' ? 'bg-semantic-success text-white' : f.sentiment === 'NEGATIVE' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{f.sentiment}</span>
                            {f.theme && <span className="text-xs text-brand-navy">#{f.theme}</span>}
                          </div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-200">{f.content}</p>
                        </div>
                      ))}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                    <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">Log feedback</h3>
                    <div className="space-y-3">
                      <Field label="Customer"><input className="input w-full text-sm" value={newFeedback.customer} onChange={e => setNewFeedback({ ...newFeedback, customer: e.target.value })} /></Field>
                      <Field label="Source">
                        <select className="input w-full text-sm" value={newFeedback.source} onChange={e => setNewFeedback({ ...newFeedback, source: e.target.value })}>
                          {['PORTAL', 'EMAIL', 'COMMENT', 'INTERVIEW'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Feedback"><textarea className="input w-full text-sm" rows={3} value={newFeedback.content} onChange={e => setNewFeedback({ ...newFeedback, content: e.target.value })} /></Field>
                      <Button variant="action" fullWidth onClick={createFeedback}>Log feedback</Button>
                    </div>
                  </div>
                </div>
              )}

              {poTab === 'okr' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Objectives</h3>
                    {objectives.map(o => (
                      // bespoke: full-width selectable list-card with custom active border/bg — not a DS Button shape
                      // eslint-disable-next-line works-view/no-raw-button
                      <button key={o.id} onClick={() => openObjective(o.id)} className={`w-full text-left rounded-xl p-3 border ${activeObjective?.objective?.id === o.id ? 'border-brand-navy bg-brand-navy/5' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}>
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{o.title}</span>
                        <span className="ml-1 text-xs text-neutral-600 dark:text-neutral-400">{o.level} {o.quarter}</span>
                      </button>
                    ))}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 mt-2">
                      <input className="input w-full text-sm mb-2" placeholder="New objective…" value={newObjective.title} onChange={e => setNewObjective({ ...newObjective, title: e.target.value })} />
                      <input className="input w-full text-sm mb-2" placeholder="Quarter (2026-Q3)" value={newObjective.quarter} onChange={e => setNewObjective({ ...newObjective, quarter: e.target.value })} />
                      <Button variant="action" fullWidth onClick={createObjective}>Add objective</Button>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    {!activeObjective ? <EmptyState icon={Target} title="Select an objective" subtitle="Add key results and link work items; progress rolls up from the key results." />
                      : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{activeObjective.objective.title}</h3>
                            <span className="text-lg font-bold text-brand-navy dark:text-white">{activeObjective.progressPercent}%</span>
                          </div>
                          <div className="space-y-2 mb-4">
                            {(activeObjective.keyResults || []).map(kr => (
                              <div key={kr.id} className="border border-neutral-100 dark:border-neutral-700 rounded-md p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-neutral-800 dark:text-neutral-100 truncate">{kr.title}</span>
                                  <input type="number" className="input text-xs w-20" defaultValue={kr.currentValue} onBlur={e => updateKrProgress(kr, e.target.value)} />
                                </div>
                                <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                                  <div className="h-full bg-semantic-success rounded-full" style={{ width: `${kr.targetValue !== kr.startValue ? Math.max(0, Math.min(100, Math.round((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue) * 100))) : 0}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <input className="input flex-1 text-sm" placeholder="New key result…" value={newKr.title} onChange={e => setNewKr({ ...newKr, title: e.target.value })} />
                            <Button variant="primary" size="sm" onClick={addKeyResult}>Add</Button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {poTab === 'releasenotes' && (
                <div>
                  <div className="flex items-end gap-2 mb-4">
                    <Field label="Release name"><input className="input text-sm" placeholder="Portal v4.2.0" value={releaseNotesName} onChange={e => setReleaseNotesName(e.target.value)} /></Field>
                    <Button variant="action" onClick={runReleaseNotes}>Draft notes</Button>
                  </div>
                  {!releaseNotesResult ? <EmptyState icon={FileText} title="Release notes auto-draft" subtitle="AI drafts user-facing release notes from completed items — you edit and publish." />
                    : (
                      <div className="space-y-3">
                        <AiMetaBadge meta={releaseNotesResult.meta} narrative={releaseNotesResult.narrative} />
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <pre className="text-sm text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap font-mono">{releaseNotesResult.markdown}</pre>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {poTab === 'stakeholders' && (
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">Stakeholders are mapped by influence × interest in{' '}
                    {/* bespoke: inline prose link — a DS Button's size forces a fixed height that breaks inline text flow */}
                    {/* eslint-disable-next-line works-view/no-raw-button */}
                    <button onClick={() => { setView('pm'); if (projects.length) { const pid = projects[0].id; setPmProjectId(pid); fetchStakeholders(pid); } }} className="text-brand-navy hover:underline">PM Artifacts → Stakeholders</button>. Targeted release communication uses that map rather than blast email.</p>
                  <EmptyState icon={Megaphone} title="Targeted communication" subtitle="Send release/status updates to the stakeholders who care — built on the stakeholder map (I15-S14)." />
                </div>
              )}
            </PageLayout>
  );
}
