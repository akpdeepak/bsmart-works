import { Button } from '@/components/works/button';
import { StatCard } from '@/components/works/stat-card';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { Avatar } from '@/components/works/atoms/avatar';
import { onPressKey } from '@/lib/utils';
import {
  Pin, Zap, Timer, Ban, Heart, BarChart2, AlertTriangle, Rocket, FileText, Check,
  AlertCircle, ArrowRight, Folder, Users, Lock, ClipboardList,
} from 'lucide-react';

// Home dashboard — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent owns the per-role dashboard payloads (developer/SM/PO/exec/admin) and all the data
// fetchers + navigation; this renders the role tabs and the selected role's panels.
export default function DashboardView({
  currentUser,
  userRole,
  dashboardRole,
  dashLoading,
  developerDash,
  smDash,
  poDash,
  execDash,
  adminDash,
  workItems,
  selectedItem,
  setIsCreateOpen,
  setDashboardRole,
  fetchDashboard,
  setView,
  setSelectedItem,
  setIsWorklogOpen,
  showToast,
  fetchBacklog,
  fetchSprints,
  fetchMembers,
}) {
  return (
            <div className="p-6 max-w-7xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {currentUser?.fullName?.split(' ')[0]}
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">Here's your workspace at a glance</p>
                </div>
                <Button variant="action" onClick={() => setIsCreateOpen(true)}>+ New Item</Button>
              </div>

              {/* Role tabs */}
              <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
                {[
                  { key: 'developer',     label: 'Developer',     minTier: 1 },
                  { key: 'scrum-master',  label: 'Scrum Master',  minTier: 2 },
                  { key: 'product-owner', label: 'Product Owner', minTier: 2 },
                  { key: 'executive',     label: 'Executive',     minTier: 3 },
                  { key: 'admin',         label: 'Admin',          minTier: 4 },
                ].filter(t => userRole.tier >= t.minTier).map(t => (
                  <button key={t.key} onClick={() => { setDashboardRole(t.key); fetchDashboard(t.key); }}
                    className={`text-xs font-medium px-4 py-2 border-b-2 whitespace-nowrap transition-colors ${dashboardRole === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {dashLoading && <div className="text-center py-16 text-neutral-600 dark:text-neutral-400">Loading dashboard...</div>}

              {/* ── DEVELOPER ── */}
              {!dashLoading && dashboardRole === 'developer' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="My Open Items" value={developerDash?.myOpenItemCount ?? workItems.filter(i => i.assigneeId === currentUser?.id && i.status !== 'Done').length} sub="Assigned to me" color="text-brand-navy" icon={Pin} onClick={() => setView('myworks')} />
                    <StatCard label="In Active Sprint" value={developerDash?.mySprintItems?.length ?? '—'} sub={developerDash?.activeSprint?.name || 'No active sprint'} color="text-semantic-success" icon={Zap} onClick={() => setView('sprint')} />
                    <StatCard label="Hours This Week" value={developerDash?.weeklyMinutes ? `${Math.round(developerDash.weeklyMinutes / 60 * 10) / 10}h` : '0h'} sub="Time logged (7 days)" color="text-brand-amber" icon={Timer} />
                    <StatCard label="Blockers" value={developerDash?.blockers?.length ?? 0} sub="Items blocked on me" color={developerDash?.blockers?.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Ban} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">My Open Items</h3>
                      {(developerDash?.myOpenItems ?? workItems.filter(i => i.assigneeId === currentUser?.id && i.status !== 'Done')).slice(0, 7).map(item => (
                        <div key={item.id} onClick={() => setSelectedItem(item)} role="button" tabIndex={0} onKeyDown={onPressKey} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 -mx-2 px-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                          <TypeBadge type={item.type} compact />
                          <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
                          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                          {item.due_date && new Date(item.due_date) < new Date() && <span className="text-xs text-semantic-danger font-bold">OVERDUE</span>}
                        </div>
                      ))}
                      {(developerDash?.myOpenItemCount ?? 0) === 0 && (developerDash?.myOpenItems?.length ?? workItems.filter(i => i.assigneeId === currentUser?.id && i.status !== 'Done').length) === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">All caught up!</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Active Sprint</h3>
                      {developerDash?.activeSprint ? (
                        <div>
                          <p className="text-sm font-semibold text-brand-navy dark:text-blue-300 mb-1">{developerDash.activeSprint.name}</p>
                          {developerDash.activeSprint.goal && <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 italic">"{developerDash.activeSprint.goal}"</p>}
                          <div className="flex gap-4 mb-2 text-xs text-neutral-600 dark:text-neutral-300">
                            <span><strong>{developerDash.activeSprint.done_items}</strong>/{developerDash.activeSprint.total_items} items</span>
                            <span><strong>{developerDash.activeSprint.done_points}</strong>/{developerDash.activeSprint.total_points}pt</span>
                          </div>
                          {developerDash.activeSprint.total_items > 0 && (
                            <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden mb-1">
                              <div className="h-full bg-semantic-success rounded-full" style={{ width: `${Math.round(developerDash.activeSprint.done_items * 100 / developerDash.activeSprint.total_items)}%` }} />
                            </div>
                          )}
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">{developerDash.activeSprint.total_items > 0 ? Math.round(developerDash.activeSprint.done_items * 100 / developerDash.activeSprint.total_items) : 0}% complete</p>
                          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">My Sprint Items</h4>
                          {(developerDash.mySprintItems || []).map(i => (
                            <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                              <TypeBadge type={i.type} compact />
                              <span className="flex-1 text-xs text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                              <StatusBadge category={statusToCategory(i.status)}>{i.status}</StatusBadge>
                            </div>
                          ))}
                          {(developerDash.mySprintItems || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">No items assigned in this sprint.</p>}
                        </div>
                      ) : <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No active sprint right now.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Blockers</h3>
                      {(developerDash?.blockers || []).length === 0
                        ? <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No blockers — you're clear!</p>
                        : (developerDash.blockers || []).map(b => (
                            <div key={b.id} className="py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{b.title}</p>
                              <p className="text-xs text-semantic-danger mt-0.5">Blocked by: {b.blocking_title}</p>
                            </div>
                          ))}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">My Time Logs</h3>
                        <button onClick={() => selectedItem ? setIsWorklogOpen(true) : showToast('Open a work item first', 'error')} className="text-xs text-brand-navy hover:underline">+ Log Time</button>
                      </div>
                      {(developerDash?.recentWorklogs || []).slice(0, 5).map(wl => (
                        <div key={wl.id} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-xs font-bold text-brand-navy w-10">{Math.round((wl.time_spent_minutes || 0) / 60 * 10) / 10}h</span>
                          <span className="flex-1 text-xs text-neutral-900 dark:text-neutral-100 truncate">{wl.work_item_title || wl.work_item_id}</span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{wl.work_date}</span>
                        </div>
                      ))}
                      {(developerDash?.recentWorklogs || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No time logged this week.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SCRUM MASTER ── */}
              {!dashLoading && dashboardRole === 'scrum-master' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Sprint Health" value={`${smDash?.sprintHealth ?? 0}%`} sub={smDash?.activeSprints?.[0]?.name || 'No active sprint'} color={smDash?.sprintHealth >= 70 ? 'text-semantic-success' : smDash?.sprintHealth >= 40 ? 'text-semantic-warning' : 'text-semantic-danger'} icon={Heart} />
                    <StatCard label="Velocity" value={smDash?.activeSprints?.[0] ? `${smDash.activeSprints[0].done_points}pt` : '—'} sub="Points delivered" color="text-brand-navy" icon={Zap} />
                    <StatCard label="Capacity" value={smDash?.activeSprints?.[0]?.capacity ? `${smDash.activeSprints[0].capacity}pt` : '—'} sub="Sprint capacity" color="text-brand-amber" icon={BarChart2} />
                    <StatCard label="High Risk" value={smDash?.highRiskItems?.length ?? 0} sub="Critical or High priority" color={smDash?.highRiskItems?.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={AlertTriangle} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Velocity Trend</h3>
                      {[...(smDash?.velocityTrend || [])].reverse().map(s => (
                        <div key={s.id} className="mb-3">
                          <div className="flex justify-between text-xs mb-1 gap-2">
                            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate min-w-0">{s.name}</span>
                            <span className="text-neutral-500 flex-shrink-0">{s.done_points}/{s.total_points}pt</span>
                          </div>
                          <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-navy rounded-full" style={{ width: s.total_points > 0 ? `${Math.round(s.done_points * 100 / s.total_points)}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                      {(smDash?.velocityTrend || []).length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No sprint data yet.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Team Capacity (14 days)</h3>
                      {(smDash?.teamCapacity || []).slice(0, 8).map(m => (
                        <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <Avatar name={m.full_name} size={6} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{m.full_name}</p>
                            <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-brand-navy-tint rounded-full" style={{ width: `${Math.min(100, Math.round((m.logged_minutes || 0) / (8 * 60) * 100))}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500">{Math.round((m.logged_minutes || 0) / 60 * 10) / 10}h</span>
                        </div>
                      ))}
                      {(smDash?.teamCapacity || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No time logs found.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">High Risk Items</h3>
                      {(smDash?.highRiskItems || []).slice(0, 5).map(i => (
                        <div key={i.id} onClick={() => setSelectedItem(i)} role="button" tabIndex={0} onKeyDown={onPressKey} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 -mx-2 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                          <TypeBadge type={i.type} compact />
                          <span className="flex-1 text-xs text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${i.priority === 'CRITICAL' ? 'bg-semantic-danger text-white' : 'bg-semantic-warning-surface text-semantic-warning'}`}>{i.priority}</span>
                        </div>
                      ))}
                      {(smDash?.highRiskItems || []).length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No high-risk items — great!</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Scope Changes</h3>
                      {(smDash?.scopeChanges || []).slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-start gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-xs font-bold flex-shrink-0 mt-0.5 text-semantic-success">+</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-900 dark:text-neutral-100 truncate">{c.title}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{c.actor_name} · {c.occurred_at ? new Date(c.occurred_at).toLocaleDateString() : ''}</p>
                          </div>
                        </div>
                      ))}
                      {(smDash?.scopeChanges || []).length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No scope changes recorded.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRODUCT OWNER ── */}
              {!dashLoading && dashboardRole === 'product-owner' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Upcoming Releases" value={poDash?.upcomingReleases?.length ?? 0} sub="Planned or in progress" color="text-brand-navy" icon={Rocket} onClick={() => setView('releases')} />
                    <StatCard label="Ungroomed Items" value={poDash?.ungroomedCount ?? 0} sub="Not in any sprint" color="text-semantic-warning" icon={FileText} onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }} />
                    <StatCard label="Features Done" value={poDash?.featureStats ? `${poDash.featureStats.total > 0 ? Math.round(poDash.featureStats.done * 100 / poDash.featureStats.total) : 0}%` : '—'} sub="Stories complete" color="text-semantic-success" icon={Check} />
                    <StatCard label="Critical Priority" value={(poDash?.priorityDistribution || []).find(p => p.priority === 'CRITICAL')?.count ?? 0} sub="Needs immediate attention" color="text-semantic-danger" icon={AlertCircle} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Releases</h3>
                        <button onClick={() => setView('releases')} className="text-xs text-brand-navy hover:underline">View all <ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></button>
                      </div>
                      {(poDash?.releases || []).slice(0, 5).map(r => (
                        <div key={r.id} className="py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${r.status === 'RELEASED' ? 'bg-semantic-success text-white' : r.status === 'IN_PROGRESS' ? 'bg-brand-navy text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{r.status}</span>
                              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</span>
                              <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">v{r.version}</span>
                            </div>
                            {r.release_date && <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(r.release_date).toLocaleDateString()}</span>}
                          </div>
                          {r.total_items > 0 && (
                            <div>
                              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-semantic-success rounded-full" style={{ width: `${Math.round((r.done_items || 0) * 100 / r.total_items)}%` }} />
                              </div>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{r.done_items}/{r.total_items} items · {r.done_points}/{r.total_points}pt</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {(poDash?.releases || []).length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No releases defined yet.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Backlog Breakdown</h3>
                      {(poDash?.backlogByType || []).map(b => (
                        <div key={b.type} className="flex items-center gap-3 py-2">
                          <TypeBadge type={b.type} compact />
                          <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-navy rounded-full" style={{ width: `${poDash?.ungroomedCount > 0 ? Math.round(b.count * 100 / poDash.ungroomedCount) : 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 w-8 text-right">{b.count}</span>
                        </div>
                      ))}
                      {(poDash?.backlogByType || []).length === 0 && <p className="text-sm text-neutral-600 text-center py-4">Backlog is empty.</p>}
                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Priority</h4>
                        {(poDash?.priorityDistribution || []).map(p => (
                          <div key={p.priority} className="flex items-center justify-between text-xs py-1">
                            <span className={`font-medium ${p.priority === 'CRITICAL' ? 'text-semantic-danger' : p.priority === 'HIGH' ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-300'}`}>{p.priority}</span>
                            <span className="font-bold text-neutral-700 dark:text-neutral-200">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Ungroomed Backlog</h3>
                        <button onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }} className="text-xs text-brand-navy hover:underline">Open backlog <ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></button>
                      </div>
                      {(poDash?.ungroomedItems || []).map(i => (
                        <div key={i.id} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <TypeBadge type={i.type} compact />
                          <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${i.priority === 'CRITICAL' ? 'bg-semantic-danger text-white' : i.priority === 'HIGH' ? 'bg-semantic-warning-surface text-semantic-warning' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{i.priority}</span>
                          {i.story_points > 0 && <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.story_points}pt</span>}
                        </div>
                      ))}
                      {(poDash?.ungroomedItems || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">All items are in sprints.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── EXECUTIVE ── */}
              {!dashLoading && dashboardRole === 'executive' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Portfolio Health" value={`${execDash?.overallHealth ?? 0}%`} sub="Items completed" color={execDash?.overallHealth >= 70 ? 'text-semantic-success' : execDash?.overallHealth >= 40 ? 'text-semantic-warning' : 'text-semantic-danger'} icon={Heart} />
                    <StatCard label="Active Projects" value={execDash?.projectPortfolio?.length ?? 0} sub="Non-archived" color="text-brand-navy" icon={Folder} onClick={() => setView('projects')} />
                    <StatCard label="Upcoming Releases" value={(execDash?.releaseSchedule || []).filter(r => r.status !== 'RELEASED').length} sub="Planned or in progress" color="text-brand-amber" icon={Rocket} onClick={() => setView('releases')} />
                    <StatCard label="Overdue Actions" value={execDash?.overdueActions?.length ?? 0} sub="Past due date" color={execDash?.overdueActions?.length > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'} icon={Zap} onClick={() => setView('pm')} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Project Portfolio</h3>
                      {(execDash?.projectPortfolio || []).map(p => {
                        const pct = p.total_items > 0 ? Math.round(p.done_items * 100 / p.total_items) : 0;
                        return (
                          <div key={p.id} className="py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</span>
                              <div className="flex items-center gap-2">
                                {p.high_priority_open > 0 && <span className="text-xs text-semantic-danger font-bold">{p.high_priority_open} at risk</span>}
                                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 70 ? 'bg-semantic-success' : pct >= 40 ? 'bg-brand-amber' : 'bg-semantic-danger'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{p.done_items}/{p.total_items} items</p>
                          </div>
                        );
                      })}
                      {(execDash?.projectPortfolio || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No projects found.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Release Schedule</h3>
                      {(execDash?.releaseSchedule || []).map(r => (
                        <div key={r.id} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'RELEASED' ? 'bg-semantic-success' : r.status === 'IN_PROGRESS' ? 'bg-brand-navy' : 'bg-neutral-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{r.name} <span className="font-mono font-normal text-neutral-600 dark:text-neutral-400">v{r.version}</span></p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{r.project_name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-bold ${r.status === 'RELEASED' ? 'text-semantic-success' : r.status === 'IN_PROGRESS' ? 'text-brand-navy' : 'text-neutral-600 dark:text-neutral-400'}`}>{r.status}</p>
                            {r.release_date && <p className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(r.release_date).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      ))}
                      {(execDash?.releaseSchedule || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No releases defined.</p>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">RAID Summary</h3>
                      {(execDash?.raidSummary || []).map(r => (
                        <div key={r.type} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-sm text-neutral-700 dark:text-neutral-200 capitalize">{r.type}</span>
                          <div className="flex gap-3 text-xs">
                            <span className="text-neutral-500">{r.total} total</span>
                            <span className={`font-bold ${r.open > 0 ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'}`}>{r.open} open</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Team Utilization (30 days)</h3>
                      {(execDash?.teamUtilization || []).slice(0, 6).map(m => (
                        <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <Avatar name={m.full_name} size={6} />
                          <span className="flex-1 text-xs text-neutral-900 dark:text-neutral-100 truncate">{m.full_name}</span>
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{Math.round((m.logged_minutes || 0) / 60 * 10) / 10}h</span>
                        </div>
                      ))}
                      {(execDash?.teamUtilization || []).length === 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">No time logs found.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADMIN ── */}
              {!dashLoading && dashboardRole === 'admin' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Members" value={adminDash?.memberCount ?? 0} sub="Workspace members" color="text-brand-navy" icon={Users} />
                    <StatCard label="Events This Week" value={adminDash?.totalEventsWeek ?? 0} sub="All activity (7 days)" color="text-brand-amber" icon={BarChart2} />
                    <StatCard label="MFA Enabled" value={adminDash?.mfaStats ? `${Math.round((adminDash.mfaStats.mfa_enabled || 0) * 100 / Math.max(1, adminDash.mfaStats.total))}%` : '—'} sub="of active users" color="text-semantic-success" icon={Lock} />
                    <StatCard label="Audit Changes" value={adminDash?.recentAuditLog?.length ?? 0} sub="Permission changes" color="text-neutral-600" icon={ClipboardList} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Members</h3>
                        <button onClick={() => { setView('workspace'); fetchMembers(); }} className="text-xs text-brand-navy hover:underline">Manage <ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></button>
                      </div>
                      {(adminDash?.members || []).slice(0, 8).map(m => (
                        <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <Avatar name={m.full_name} size={7} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{m.full_name}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{m.email}</p>
                          </div>
                          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 px-2 py-0.5 rounded-full">{m.role}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Role Distribution</h3>
                      {(adminDash?.roleDistribution || []).map(r => (
                        <div key={r.role} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 w-20">{r.role}</span>
                          <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-navy rounded-full" style={{ width: `${adminDash?.memberCount > 0 ? Math.round(r.count * 100 / adminDash.memberCount) : 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{r.count}</span>
                        </div>
                      ))}
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-4 mb-2">Activity (7 days)</h4>
                      {(adminDash?.activityStats || []).slice(0, 5).map(a => (
                        <div key={a.event_type} className="flex items-center justify-between text-xs py-1">
                          <span className="text-neutral-600 dark:text-neutral-300 font-mono">{a.event_type}</span>
                          <span className="font-bold text-neutral-700 dark:text-neutral-200">{a.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Permission Audit Log</h3>
                      {(adminDash?.recentAuditLog || []).length === 0
                        ? <p className="text-sm text-neutral-600 text-center py-4">No permission changes recorded yet.</p>
                        : <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-neutral-500 border-b border-neutral-100 dark:border-neutral-700">
                                  {['When', 'Actor', 'Target', 'From', 'To', 'Action'].map(h => (
                                    <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {(adminDash.recentAuditLog).map(log => (
                                  <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                                    <td className="py-2 px-2 text-neutral-600 dark:text-neutral-400">{log.changed_at ? new Date(log.changed_at).toLocaleDateString() : '—'}</td>
                                    <td className="py-2 px-2 font-medium text-neutral-900 dark:text-neutral-100">{log.actor_name || '—'}</td>
                                    <td className="py-2 px-2 text-neutral-600 dark:text-neutral-300">{log.target_name || '—'}</td>
                                    <td className="py-2 px-2 text-neutral-600 dark:text-neutral-400">{log.old_role || '—'}</td>
                                    <td className="py-2 px-2 text-semantic-success font-semibold">{log.new_role || '—'}</td>
                                    <td className="py-2 px-2 text-neutral-600 dark:text-neutral-400">{log.action_type || 'CHANGED'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
  );
}
