import { Table } from '@/components/works/atoms/table';
import {
  AlertTriangle, Lightbulb, AlertCircle, Link, Scale, Calendar, CheckCircle2,
  Users, BookOpen, Globe, Target, Heart, Clock, ArrowLeft, Ban, X, MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Modal } from '@/components/works/molecules/modal';
import { PageHeader } from '@/components/works/atoms/page-header';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { Field } from '@/components/works/field';
import { Avatar } from '@/components/works/atoms/avatar';
import { StatCard } from '@/components/works/stat-card';
import { PmArtifactList } from '@/components/works/organisms/pm-artifact-list';

/**
 * PmView — project management: RAID dashboard, risks, assumptions, PM issues,
 * dependencies, decisions, meetings, action items, stakeholders, lessons learned,
 * and cross-project dependencies.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function PmView({
  loading = false,
  pmProjectId,
  pmTab,
  raidDashboard,
  risks,
  assumptions,
  pmIssues,
  dependencies,
  decisions,
  meetings,
  actionItems,
  stakeholders,
  lessonsLearned,
  crossProjectDeps,
  selectedMeeting,
  meetingNotes,
  pmFormOpen,
  pmForm,
  isCrossProjOpen,
  crossProjForm,
  projects,
  users,
  setPmProjectId,
  setPmTab,
  setSelectedMeeting,
  setMeetingNotes,
  setPmFormOpen,
  setPmForm,
  setIsCrossProjOpen,
  setCrossProjForm,
  fetchRaidDashboard,
  fetchRisks,
  fetchAssumptions,
  fetchPmIssues,
  fetchDependencies,
  fetchDecisions,
  fetchMeetings,
  fetchActionItems,
  fetchStakeholders,
  fetchLessons,
  fetchCrossProjectDeps,
  pmDelete,
  pmCreate,
  createCrossProjectDep,
  reportError,
  showToast,
  api,
}) {
  // Per-section save status for meeting notes ('dirty' | 'saving' | 'saved' | 'error'), so an
  // autosave-on-blur is no longer silent — the user sees whether their notes persisted.
  const [noteStatus, setNoteStatus] = useState({});
  if (loading && projects.length === 0) {
    return (
      <PageLayout header={null}>
        <AsyncBoundary loading skeleton={<ListSkeleton rows={4} />} />
      </PageLayout>
    );
  }
  const saveMeetingNote = (section, content) => {
    setNoteStatus(s => ({ ...s, [section]: 'saving' }));
    api.raw(`/meetings/${selectedMeeting.id}/notes/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
      .then(() => setNoteStatus(s => ({ ...s, [section]: 'saved' })))
      .catch(err => { setNoteStatus(s => ({ ...s, [section]: 'error' })); reportError(err); });
  };
  const NOTE_STATUS_LABEL = { dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Save failed — retry' };
  const NOTE_STATUS_CLASS = {
    dirty: 'text-semantic-warning', saving: 'text-neutral-600 dark:text-neutral-400',
    saved: 'text-semantic-success', error: 'text-semantic-danger',
  };
  return (
    <PageLayout width="dashboard">
      <PageHeader
        title="Project Management"
        description="RAID logs, decisions, meetings, action items"
        actions={
          <select className="input text-sm w-48" value={pmProjectId} onChange={e => {
            const pid = e.target.value;
            setPmProjectId(pid);
            if (pid) { fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); }
          }}>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        }
        className="mb-4"
      />

      {!pmProjectId ? (
        <EmptyState icon={Target} title="Select a project" subtitle="Choose a project above to view its PM artifacts." />
      ) : (
        <Tabs
          value={pmTab !== 'meeting-detail' ? pmTab : ''}
          onValueChange={(val) => { setPmTab(val); if (val === 'cross-deps') fetchCrossProjectDeps(); }}
        >
          {/* Sub-tabs — hidden while in meeting-detail virtual screen */}
          {pmTab !== 'meeting-detail' && (
            <TabList aria-label="PM artifacts" className="mb-5 overflow-x-auto gap-1">
              {[
                { key: 'raid',         Icon: Target,        label: 'RAID Dashboard' },
                { key: 'risks',        Icon: AlertTriangle, label: `Risks (${risks.length})` },
                { key: 'assumptions',  Icon: Lightbulb,     label: `Assumptions (${assumptions.length})` },
                { key: 'issues',       Icon: AlertCircle,   label: `Issues (${pmIssues.length})` },
                { key: 'deps',         Icon: Link,          label: `Dependencies (${dependencies.length})` },
                { key: 'decisions',    Icon: Scale,         label: `Decisions (${decisions.length})` },
                { key: 'meetings',     Icon: Calendar,      label: `Meetings (${meetings.length})` },
                { key: 'actions',      Icon: CheckCircle2,  label: `Actions (${actionItems.length})` },
                { key: 'stakeholders', Icon: Users,         label: `Stakeholders (${stakeholders.length})` },
                { key: 'lessons',      Icon: BookOpen,      label: `Lessons (${lessonsLearned.length})` },
                { key: 'cross-deps',   Icon: Globe,         label: `Cross-Project (${crossProjectDeps.length})` },
              ].map(t => (
                <Tab key={t.key} value={t.key} className="text-xs px-3 py-2">
                  <t.Icon className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{t.label}
                </Tab>
              ))}
            </TabList>
          )}

          {/* RAID DASHBOARD */}
          <TabPanel value="raid">
          {raidDashboard && (
            <div>
              {/* Health score */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <StatCard label="Health Score" value={`${raidDashboard.healthScore}%`} sub="Overall project health" color={raidDashboard.healthScore > 70 ? 'text-semantic-success' : raidDashboard.healthScore > 40 ? 'text-semantic-warning' : 'text-semantic-danger'} icon={Heart} />
                <StatCard label="Open Risks" value={raidDashboard.riskSummary?.open || 0} sub={`${raidDashboard.riskSummary?.total || 0} total`} color="text-semantic-warning" icon={AlertTriangle} onClick={() => setPmTab('risks')} />
                <StatCard label="Open Issues" value={raidDashboard.issueSummary?.open || 0} sub={`${raidDashboard.issueSummary?.total || 0} total`} color="text-semantic-danger" icon={AlertCircle} onClick={() => setPmTab('issues')} />
                <StatCard label="Blockers" value={raidDashboard.dependencySummary?.blockers || 0} sub={`${raidDashboard.dependencySummary?.total || 0} deps`} color="text-brand-orange" icon={Link} onClick={() => setPmTab('deps')} />
                <StatCard label="Overdue Actions" value={raidDashboard.actionSummary?.overdue || 0} sub={`${raidDashboard.actionSummary?.open || 0} open`} color="text-semantic-danger" icon={Clock} onClick={() => setPmTab('actions')} />
              </div>

              {/* Risk heatmap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 mb-3">Risk Heat Matrix</h3>
                  {(() => {
                    const probs = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];
                    const impacts = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                    return (
                      <div>
                        <div className="flex gap-1 mb-1">
                          <div className="w-16 flex-shrink-0"></div>
                          {impacts.map(i => <div key={i} className="flex-1 text-xs text-neutral-600 dark:text-neutral-400 text-center uppercase">{i}</div>)}
                        </div>
                        {probs.map(p => (
                          <div key={p} className="flex gap-1 mb-1">
                            <div className="w-16 text-xs text-neutral-600 dark:text-neutral-400 flex items-center flex-shrink-0">{p}</div>
                            {impacts.map(imp => {
                              const count = (raidDashboard.risks || []).filter(r => r.probability === p && r.impact === imp && r.status === 'OPEN').length;
                              const heat = (probs.indexOf(p) + impacts.indexOf(imp));
                              const bg = count === 0 ? 'bg-neutral-100 dark:bg-neutral-700' : heat >= 5 ? 'bg-semantic-danger' : heat >= 3 ? 'bg-semantic-warning' : 'bg-semantic-success';
                              return (
                                <div key={imp} className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold ${bg} ${count > 0 ? 'text-white' : 'text-neutral-300'}`}>
                                  {count > 0 ? count : ''}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">Rows = Probability, Columns = Impact. Color = severity.</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Open action items */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 mb-3">Overdue &amp; High-Priority Actions</h3>
                  {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dueDate && new Date(a.dueDate) < new Date() ? 'bg-semantic-danger' : 'bg-semantic-warning'}`}></span>
                      <span className="flex-1 text-sm text-neutral-900 truncate">{a.title}</span>
                      {a.dueDate && <span className="text-xs text-neutral-600 dark:text-neutral-400">{a.dueDate}</span>}
                    </div>
                  ))}
                  {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No open action items</p>}
                </div>
              </div>
            </div>
          )}
          {!raidDashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse" aria-busy="true" aria-label="Loading RAID dashboard">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-700 rounded mb-2" />
                  <div className="h-7 w-10 bg-neutral-100 dark:bg-neutral-700 rounded" />
                </div>
              ))}
            </div>
          )}
          </TabPanel>

          {/* RISKS */}
          <TabPanel value="risks">
            <PmArtifactList
              title="Risks Register" icon={AlertTriangle}
              items={risks}
              columns={['Title', 'Category', 'Probability', 'Impact', 'Status', 'Owner']}
              renderRow={r => [r.title, r.category || '—', r.probability, r.impact, r.status, users.find(u => u.id === r.ownerId)?.fullName || '—']}
              onDelete={id => pmDelete('risk', id)}
              onAdd={() => { setPmFormOpen('risk'); setPmForm({ probability: 'MEDIUM', impact: 'MEDIUM', status: 'OPEN' }); }}
            />
          </TabPanel>

          {/* ASSUMPTIONS */}
          <TabPanel value="assumptions">
            <PmArtifactList
              title="Assumptions Log" icon={Lightbulb}
              items={assumptions}
              columns={['Title', 'Validation', 'Owner', 'Expiry']}
              renderRow={a => [a.title, a.validationStatus, users.find(u => u.id === a.ownerId)?.fullName || '—', a.expiryDate || '—']}
              onDelete={id => pmDelete('assumption', id)}
              onAdd={() => { setPmFormOpen('assumption'); setPmForm({ validationStatus: 'UNVALIDATED' }); }}
            />
          </TabPanel>

          {/* PM ISSUES */}
          <TabPanel value="issues">
            <PmArtifactList
              title="Issues Log" icon={AlertCircle}
              items={pmIssues}
              columns={['Title', 'Priority', 'Status', 'Owner']}
              renderRow={i => [i.title, i.priority, i.status, users.find(u => u.id === i.ownerId)?.fullName || '—']}
              onDelete={id => pmDelete('issue', id)}
              onAdd={() => { setPmFormOpen('issue'); setPmForm({ priority: 'MEDIUM', status: 'OPEN' }); }}
            />
          </TabPanel>

          {/* DEPENDENCIES */}
          <TabPanel value="deps">
            <PmArtifactList
              title="Dependencies Tracker" icon={Link}
              items={dependencies}
              columns={['Title', 'From', 'To', 'Status', 'Deadline', 'Blocker']}
              renderRow={d => [d.title, d.dependentTeam || '—', d.providingTeam || '—', d.status, d.deadline || '—', d.isBlocker ? <span className="inline-flex items-center gap-1 text-semantic-danger font-semibold"><Ban className="h-3.5 w-3.5" aria-hidden="true" />Yes</span> : 'No']}
              onDelete={id => pmDelete('dependency', id)}
              onAdd={() => { setPmFormOpen('dependency'); setPmForm({ status: 'PENDING', isBlocker: false }); }}
            />
          </TabPanel>

          {/* DECISIONS */}
          <TabPanel value="decisions">
            <PmArtifactList
              title="Decisions Register" icon={Scale}
              items={decisions}
              columns={['Title', 'Status', 'Decision Date', 'Owner']}
              renderRow={d => [d.title, d.status, d.decisionDate || '—', users.find(u => u.id === d.ownerId)?.fullName || '—']}
              onDelete={id => pmDelete('decision', id)}
              onAdd={() => { setPmFormOpen('decision'); setPmForm({ status: 'PROPOSED' }); }}
            />
          </TabPanel>

          {/* MEETINGS */}
          <TabPanel value="meetings">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-neutral-500" aria-hidden="true" /> Meeting Notes</h2>
                <Button variant="action" onClick={() => { setPmFormOpen('meeting'); setPmForm({ meetingType: 'GENERAL', status: 'SCHEDULED' }); }}>+ New Meeting</Button>
              </div>
              {meetings.length === 0
                ? <EmptyState icon={Calendar} title="No meetings yet" subtitle="Log meeting notes with structured agenda, notes, decisions, and action items." />
                : <div className="space-y-3">
                    {meetings.map(m => (
                      <Button unstyled type="button" key={m.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        onClick={() => { setSelectedMeeting(m); setPmTab('meeting-detail'); api.raw(`/meetings/${m.id}`).then(r => r.json()).then(d => setMeetingNotes(d.notes || [])); }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded font-medium">{m.meetingType}</span>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${m.status === 'COMPLETED' ? 'bg-semantic-success/10 text-semantic-success' : m.status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-600 dark:text-neutral-400' : 'bg-semantic-warning/10 text-semantic-warning'}`}>{m.status}</span>
                            </div>
                            <p className="font-semibold text-neutral-900">{m.title}</p>
                            {m.scheduledAt && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><Calendar className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{new Date(m.scheduledAt).toLocaleString()}{m.durationMins ? ` · ${m.durationMins}min` : ''}</p>}
                            {m.location && <p className="text-xs text-neutral-600 dark:text-neutral-400"><MapPin className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{m.location}</p>}
                          </div>
                          <Button unstyled onClick={e => { e.stopPropagation(); pmDelete('meeting', m.id); }} className="text-neutral-300 hover:text-semantic-danger text-xs ml-3" aria-label="Delete meeting"><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                        </div>
                      </Button>
                    ))}
                  </div>
              }
            </div>
          </TabPanel>

          {/* MEETING DETAIL */}
          {pmTab === 'meeting-detail' && selectedMeeting && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <Button unstyled onClick={() => { setPmTab('meetings'); setSelectedMeeting(null); }} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-sm" aria-label="Back"><ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back</Button>
                <h2 className="font-bold text-brand-navy text-lg">{selectedMeeting.title}</h2>
                <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded">{selectedMeeting.meetingType}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['AGENDA', 'NOTES', 'DECISIONS', 'ACTIONS'].map(section => {
                  const note = Array.isArray(meetingNotes) ? meetingNotes.find(n => n.section === section) : null;
                  const status = noteStatus[section];
                  return (
                    <div key={section} className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{section}</p>
                        {status && (
                          <span className={`text-xs ${NOTE_STATUS_CLASS[status]}`} role="status" aria-live="polite">
                            {NOTE_STATUS_LABEL[status]}
                          </span>
                        )}
                      </div>
                      <textarea
                        className="w-full text-sm text-neutral-900 dark:text-neutral-100 border-none outline-none resize-none min-h-24 bg-transparent"
                        placeholder={`Enter ${section.toLowerCase()}...`}
                        defaultValue={note?.content || ''}
                        onChange={() => setNoteStatus(s => (s[section] === 'dirty' ? s : { ...s, [section]: 'dirty' }))}
                        onBlur={e => {
                          // Only persist when the content actually changed from what was loaded.
                          if (e.target.value !== (note?.content || '')) saveMeetingNote(section, e.target.value);
                          else setNoteStatus(s => { const next = { ...s }; delete next[section]; return next; });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTION ITEMS */}
          <TabPanel value="actions">
            <PmArtifactList
              title="Action Items" icon={CheckCircle2}
              items={actionItems}
              columns={['Title', 'Owner', 'Due Date', 'Status', 'Priority']}
              renderRow={a => [a.title, users.find(u => u.id === a.ownerId)?.fullName || '—', a.dueDate || '—', a.status, a.priority]}
              onDelete={id => pmDelete('action', id)}
              onAdd={() => { setPmFormOpen('action'); setPmForm({ status: 'OPEN', priority: 'MEDIUM' }); }}
              statusColors={{ OPEN: 'text-semantic-warning', IN_PROGRESS: 'text-brand-navy', DONE: 'text-semantic-success', CANCELLED: 'text-neutral-600 dark:text-neutral-400' }}
            />
          </TabPanel>

          {/* STAKEHOLDERS */}
          <TabPanel value="stakeholders">
            <div>
              <PmArtifactList
                title="Stakeholder Register" icon={Users}
                items={stakeholders}
                columns={['Name', 'Role', 'Org', 'Influence', 'Interest', 'Strategy']}
                renderRow={s => [s.name, s.role || '—', s.organization || '—', s.influence || '—', s.interest || '—', s.engagementStrategy || '—']}
                onDelete={id => pmDelete('stakeholder', id)}
                onAdd={() => { setPmFormOpen('stakeholder'); setPmForm({ influence: 'MEDIUM', interest: 'MEDIUM', engagementStrategy: 'INFORM', communicationFreq: 'MONTHLY' }); }}
              />
              {stakeholders.length > 0 && (
                <div className="mt-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Influence / Interest Matrix</h3>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {[
                      { label: 'High Influence, High Interest', key: 'HH', desc: 'Manage Closely', color: 'bg-semantic-danger-surface border-semantic-danger/30' },
                      { label: 'High Influence, Low Interest', key: 'HL', desc: 'Keep Satisfied', color: 'bg-semantic-warning-surface border-semantic-warning/30' },
                      { label: 'Low Influence, High Interest', key: 'LH', desc: 'Keep Informed', color: 'bg-semantic-info-surface border-semantic-info/30' },
                      { label: 'Low Influence, Low Interest', key: 'LL', desc: 'Monitor', color: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700' },
                    ].map(q => {
                      const quadrantStakeholders = stakeholders.filter(s => {
                        const inf = (s.influence || '').toUpperCase();
                        const int = (s.interest || '').toUpperCase();
                        const highInf = inf === 'HIGH';
                        const highInt = int === 'HIGH';
                        if (q.key === 'HH') return highInf && highInt;
                        if (q.key === 'HL') return highInf && !highInt;
                        if (q.key === 'LH') return !highInf && highInt;
                        return !highInf && !highInt;
                      });
                      return (
                        <div key={q.key} className={`p-4 rounded-xl border ${q.color} min-h-[100px]`}>
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">{q.desc}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{q.label}</p>
                          <div className="space-y-1">
                            {quadrantStakeholders.length === 0 && <p className="text-xs text-neutral-300 italic">None</p>}
                            {quadrantStakeholders.map(s => (
                              <div key={s.id} className="flex items-center gap-1.5">
                                <Avatar name={s.name} size={5} />
                                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">{s.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">Based on Influence (HIGH/MEDIUM/LOW) and Interest (HIGH/MEDIUM/LOW) fields. HIGH means above MEDIUM.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* LESSONS LEARNED */}
          <TabPanel value="lessons">
            <PmArtifactList
              title="Lessons Learned" icon={BookOpen}
              items={lessonsLearned}
              columns={['Title', 'Category', 'Created']}
              renderRow={ll => [ll.title, ll.category || '—', ll.createdAt ? new Date(ll.createdAt).toLocaleDateString() : '—']}
              onDelete={id => pmDelete('lesson', id)}
              onAdd={() => { setPmFormOpen('lesson'); setPmForm({ category: 'PROCESS' }); }}
            />
          </TabPanel>

          <TabPanel value="cross-deps">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Cross-Project Dependencies</h2>
                <Button variant="action" onClick={() => setIsCrossProjOpen(true)}>+ Add Dependency</Button>
              </div>
              {crossProjectDeps.length === 0 ? (
                <EmptyState icon={Globe} title="No cross-project dependencies" subtitle="Track dependencies between this project and other projects or teams." />
              ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <Table className="w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        {['Title', 'Target Project', 'Deadline', 'Blocker', 'Status', ''].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                      {crossProjectDeps.map(dep => (
                        <tr key={dep.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                            {dep.title}
                            {dep.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{dep.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                            {projects.find(p => p.id === dep.targetProjectId)?.name || dep.targetProjectId || '—'}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                            {dep.deadline ? new Date(dep.deadline).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {dep.isBlocker ? (
                              <span className="text-xs font-bold text-semantic-danger bg-semantic-danger-surface px-2 py-0.5 rounded">BLOCKER</span>
                            ) : (
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dep.status === 'RESOLVED' ? 'bg-semantic-success-surface text-semantic-success' : dep.status === 'AT_RISK' ? 'bg-semantic-danger-surface text-semantic-danger' : 'bg-semantic-warning-surface text-semantic-warning'}`}>
                              {dep.status || 'OPEN'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button unstyled onClick={() => api.send(`/cross-project-dependencies/${dep.id}`, { method: 'DELETE' }).then(() => { showToast('Deleted'); fetchCrossProjectDeps(); }).catch(reportError)}
                              className="text-xs text-semantic-danger hover:underline">Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Create cross-project dep modal */}
              {isCrossProjOpen && (
                <Modal title="New Cross-Project Dependency" onClose={() => setIsCrossProjOpen(false)} size="lg">
                    <div className="space-y-3">
                      <Field label="Title *">
                        <input className="input" placeholder="What does this project depend on?" value={crossProjForm.title}
                          onChange={e => setCrossProjForm(f => ({ ...f, title: e.target.value }))} />
                      </Field>
                      <Field label="Description">
                        <textarea className="input" rows={2} placeholder="Details of the dependency..."
                          value={crossProjForm.description} onChange={e => setCrossProjForm(f => ({ ...f, description: e.target.value }))} />
                      </Field>
                      <Field label="Target Project">
                        <select className="input" value={crossProjForm.targetProjectId}
                          onChange={e => setCrossProjForm(f => ({ ...f, targetProjectId: e.target.value }))}>
                          <option value="">— Select project —</option>
                          {projects.filter(p => p.id !== pmProjectId).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Deadline">
                        <input type="date" className="input" value={crossProjForm.deadline}
                          onChange={e => setCrossProjForm(f => ({ ...f, deadline: e.target.value }))} />
                      </Field>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="blocker" className="w-4 h-4 accent-brand-navy"
                          checked={crossProjForm.isBlocker}
                          onChange={e => setCrossProjForm(f => ({ ...f, isBlocker: e.target.checked }))} />
                        <label htmlFor="blocker" className="text-sm text-neutral-700 dark:text-neutral-200">This is a blocker (blocks our delivery)</label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-5">
                      <Button variant="ghost" onClick={() => setIsCrossProjOpen(false)}>Cancel</Button>
                      <Button variant="action" onClick={createCrossProjectDep}>Create Dependency</Button>
                    </div>
                </Modal>
              )}
            </div>
          </TabPanel>
        </Tabs>
      )}

      {/* PM CREATE MODAL */}
      {pmFormOpen && (
        <Modal title={<span className="capitalize">New {pmFormOpen.replace('issue','PM Issue').replace('lesson','Lesson Learned').replace('action','Action Item').replace('dependency','Dependency')}</span>} onClose={() => { setPmFormOpen(null); setPmForm({}); }} size="lg">
            <div className="space-y-3">
              <Field label={pmFormOpen === 'stakeholder' ? 'Name' : 'Title'}>
                <input className="input" placeholder={pmFormOpen === 'stakeholder' ? 'Full name' : 'Brief title'} value={pmForm.title || ''} onChange={e => setPmForm(p => ({ ...p, title: e.target.value }))} />
              </Field>
              <Field label="Description">
                <textarea className="input" rows={2} placeholder="Details..." value={pmForm.description || ''} onChange={e => setPmForm(p => ({ ...p, description: e.target.value }))} />
              </Field>

              {pmFormOpen === 'risk' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Probability">
                    <select className="input" value={pmForm.probability || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, probability: e.target.value }))}>
                      {['LOW','MEDIUM','HIGH','VERY_HIGH'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Impact">
                    <select className="input" value={pmForm.impact || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))}>
                      {['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Mitigation Plan">
                  <textarea className="input" rows={2} placeholder="How will you mitigate this risk?" value={pmForm.mitigationPlan || ''} onChange={e => setPmForm(p => ({ ...p, mitigationPlan: e.target.value }))} />
                </Field>
                <Field label="Contingency Plan">
                  <textarea className="input" rows={2} placeholder="What will you do if the risk occurs?" value={pmForm.contingencyPlan || ''} onChange={e => setPmForm(p => ({ ...p, contingencyPlan: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                  <Field label="Review Date"><input type="date" className="input" value={pmForm.reviewDate || ''} onChange={e => setPmForm(p => ({ ...p, reviewDate: e.target.value || null }))} /></Field>
                </div>
              </>}

              {pmFormOpen === 'assumption' && <>
                <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this assumption made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validation Status">
                    <select className="input" value={pmForm.validationStatus || 'UNVALIDATED'} onChange={e => setPmForm(p => ({ ...p, validationStatus: e.target.value }))}>
                      {['UNVALIDATED','VALIDATED','INVALIDATED'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Expiry Date"><input type="date" className="input" value={pmForm.expiryDate || ''} onChange={e => setPmForm(p => ({ ...p, expiryDate: e.target.value || null }))} /></Field>
                </div>
                <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
              </>}

              {pmFormOpen === 'issue' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                </div>
                <Field label="Impact"><textarea className="input" rows={2} placeholder="Impact of this issue..." value={pmForm.impact || ''} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))} /></Field>
                <Field label="Resolution Path"><textarea className="input" rows={2} placeholder="How will this issue be resolved?" value={pmForm.resolutionPath || ''} onChange={e => setPmForm(p => ({ ...p, resolutionPath: e.target.value }))} /></Field>
              </>}

              {pmFormOpen === 'dependency' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dependent Team"><input className="input" placeholder="Team that needs this" value={pmForm.dependentTeam || ''} onChange={e => setPmForm(p => ({ ...p, dependentTeam: e.target.value }))} /></Field>
                  <Field label="Providing Team"><input className="input" placeholder="Team that provides this" value={pmForm.providingTeam || ''} onChange={e => setPmForm(p => ({ ...p, providingTeam: e.target.value }))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Deadline"><input type="date" className="input" value={pmForm.deadline || ''} onChange={e => setPmForm(p => ({ ...p, deadline: e.target.value || null }))} /></Field>
                  <Field label="Status"><select className="input" value={pmForm.status || 'PENDING'} onChange={e => setPmForm(p => ({ ...p, status: e.target.value }))}>{['PENDING','IN_PROGRESS','RESOLVED','BLOCKED'].map(v => <option key={v}>{v}</option>)}</select></Field>
                </div>
                <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={!!pmForm.isBlocker} onChange={e => setPmForm(p => ({ ...p, isBlocker: e.target.checked }))} /> <span>This is a blocker</span></label>
              </>}

              {pmFormOpen === 'decision' && <>
                <Field label="Alternatives Considered"><textarea className="input" rows={2} placeholder="What other options were considered?" value={pmForm.alternatives || ''} onChange={e => setPmForm(p => ({ ...p, alternatives: e.target.value }))} /></Field>
                <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this decision made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                  <Field label="Decision Date"><input type="date" className="input" value={pmForm.decisionDate || ''} onChange={e => setPmForm(p => ({ ...p, decisionDate: e.target.value || null }))} /></Field>
                </div>
                <Field label="Related Risk">
                  <select className="input" value={pmForm.relatedRiskId || ''} onChange={e => setPmForm(p => ({ ...p, relatedRiskId: e.target.value || null }))}>
                    <option value="">None</option>
                    {risks.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </Field>
                <Field label="Links (one per line)" hint="Paste relevant URLs, one per line">
                  <textarea className="input" rows={2} placeholder="https://..." value={(pmForm.linksText) || ''} onChange={e => {
                    const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                    setPmForm(p => ({ ...p, linksText: e.target.value, links: JSON.stringify(lines) }));
                  }} />
                </Field>
              </>}

              {pmFormOpen === 'meeting' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type"><select className="input" value={pmForm.meetingType || 'GENERAL'} onChange={e => setPmForm(p => ({ ...p, meetingType: e.target.value }))}>{['GENERAL','STANDUP','PLANNING','RETRO','REVIEW','STEERING'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Scheduled"><input type="datetime-local" className="input" value={pmForm.scheduledAt || ''} onChange={e => setPmForm(p => ({ ...p, scheduledAt: e.target.value || null }))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (min)"><input type="number" className="input" value={pmForm.durationMins || ''} onChange={e => setPmForm(p => ({ ...p, durationMins: parseInt(e.target.value) || null }))} /></Field>
                  <Field label="Location"><input className="input" placeholder="Room / URL" value={pmForm.location || ''} onChange={e => setPmForm(p => ({ ...p, location: e.target.value }))} /></Field>
                </div>
              </>}

              {pmFormOpen === 'action' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                  <Field label="Due Date"><input type="date" className="input" value={pmForm.dueDate || ''} onChange={e => setPmForm(p => ({ ...p, dueDate: e.target.value || null }))} /></Field>
                </div>
                <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
              </>}

              {pmFormOpen === 'stakeholder' && <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Role"><input className="input" placeholder="PM / Sponsor / Customer..." value={pmForm.role || ''} onChange={e => setPmForm(p => ({ ...p, role: e.target.value }))} /></Field>
                  <Field label="Organisation"><input className="input" placeholder="Company name" value={pmForm.organization || ''} onChange={e => setPmForm(p => ({ ...p, organization: e.target.value }))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Influence"><select className="input" value={pmForm.influence || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, influence: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Interest"><select className="input" value={pmForm.interest || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, interest: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                </div>
                <Field label="Strategy"><select className="input" value={pmForm.engagementStrategy || 'INFORM'} onChange={e => setPmForm(p => ({ ...p, engagementStrategy: e.target.value }))}>{['INFORM','CONSULT','INVOLVE','COLLABORATE','EMPOWER'].map(v => <option key={v}>{v}</option>)}</select></Field>
              </>}

              {pmFormOpen === 'lesson' && <>
                <Field label="Category"><select className="input" value={pmForm.category || 'PROCESS'} onChange={e => setPmForm(p => ({ ...p, category: e.target.value }))}>{['PROCESS','TECHNICAL','COMMUNICATION','RISK','OTHER'].map(v => <option key={v}>{v}</option>)}</select></Field>
                <Field label="What Worked"><textarea className="input" rows={2} value={pmForm.whatWorked || ''} onChange={e => setPmForm(p => ({ ...p, whatWorked: e.target.value }))} /></Field>
                <Field label="What Didn't Work"><textarea className="input" rows={2} value={pmForm.whatDidntWork || ''} onChange={e => setPmForm(p => ({ ...p, whatDidntWork: e.target.value }))} /></Field>
                <Field label="Recommendation"><textarea className="input" rows={2} value={pmForm.recommendation || ''} onChange={e => setPmForm(p => ({ ...p, recommendation: e.target.value }))} /></Field>
              </>}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="action" onClick={() => pmCreate(pmFormOpen, pmForm)} disabled={!pmForm.title}>Create</Button>
              <Button variant="secondary" onClick={() => { setPmFormOpen(null); setPmForm({}); }}>Cancel</Button>
            </div>
        </Modal>
      )}
    </PageLayout>
  );
}
