import { BRAND_ORANGE } from '@/lib/brand-tokens';
import { PageLayout } from '@/components/works/templates/page-layout';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/works/button';
import { Avatar } from '@/components/works/atoms/avatar';
import { RoleBadge } from '@/components/works/role-badge';

// Workspace Settings view — workspace-scoped admin surface (tier ADMIN+). Personal settings
// (MFA, notifications, language) live in AccountView which all members can reach.
export default function WorkspaceView({
  workspaceMembers, currentUser, userRole, inviteEmail, inviteMsg, brandingColor, brandingDesc,
  projects, selectedProjectId, projectMembers, projectMemberEmail, projectMemberMsg,
  setInviteEmail, setBrandingColor, setBrandingDesc, setProjectMemberEmail,
  handleRemoveMember, handleInvite, saveBranding, fetchProjectMembers,
  addProjectMember, can, showToast,
}) {
  return (
            <PageLayout title="Workspace Settings" description="BCITS Master Workspace">
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Members</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">People who have access to this workspace</p>
                <div className="space-y-1 mb-5">
                  {workspaceMembers.length === 0
                    ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">Loading members...</p>
                    : workspaceMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                        <Avatar name={m.fullName} size={8} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{m.fullName}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{m.email}</p>
                        </div>
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">{m.role}</span>
                        {m.id !== currentUser.id && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMember(m.id)}
                            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger transition-colors">Remove</Button>
                        )}
                      </div>
                    ))
                  }
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">Invite a member</h3>
                  <div className="flex gap-2">
                    <input type="email" placeholder="colleague@bcits.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      className="input flex-1" />
                    <Button onClick={handleInvite}>Invite</Button>
                  </div>
                  {inviteMsg && <p className="text-xs text-semantic-success mt-2">{inviteMsg}</p>}
                </div>
              </div>

              {/* Role Management — ADMIN+ only */}
              {can('manage_roles') && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                  <h2 className="font-semibold text-neutral-900 mb-1">Role Management</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Control what each member can do</p>
                  <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs font-semibold text-neutral-600 mb-2">Tier Hierarchy</p>
                    {[
                      { role: 'VIEWER', tier: 1, desc: 'View only — no create/edit' },
                      { role: 'MEMBER', tier: 2, desc: 'Create & edit own items' },
                      { role: 'LEAD',   tier: 3, desc: 'Edit any item, manage sprints' },
                      { role: 'ADMIN',  tier: 4, desc: 'Full workspace management' },
                      { role: 'OWNER',  tier: 5, desc: 'Ownership + billing control' },
                    ].map(r => (
                      <div key={r.role} className="flex items-center gap-2 py-1">
                        <RoleBadge role={r.role} tier={r.tier} />
                        <span className="text-xs text-neutral-600">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {workspaceMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                        <Avatar name={m.fullName} size={7} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{m.fullName}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{m.email}</p>
                        </div>
                        {m.id === currentUser.id
                          ? <RoleBadge role={m.role || userRole.role} tier={userRole.tier} />
                          : <select defaultValue={m.role || 'MEMBER'}
                              onChange={e => {
                                api.raw(`/rbac/members/${m.id}/role`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ roleId: e.target.value, workspaceId })
                                }).then(r => r.json()).then(d => showToast(d.message || 'Role updated'))
                                  .catch(err => showToast(err.message, 'error'));
                              }}
                              className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-2 py-1 focus:outline-none text-neutral-700">
                              {['VIEWER','MEMBER','LEAD','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workspace Branding */}
              {can('manage_projects') && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mt-6">
                  <h2 className="font-semibold text-neutral-900 mb-1">Workspace Branding</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Customize your workspace appearance</p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="ws-branding-color" className="block text-sm font-medium text-neutral-700 mb-2">Primary Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" id="ws-branding-color" value={brandingColor}
                          onChange={e => setBrandingColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer" />
                        <input type="text" aria-label="Primary accent colour hex value" value={brandingColor}
                          onChange={e => setBrandingColor(e.target.value)}
                          className="input w-32 font-mono text-sm" placeholder={BRAND_ORANGE} />
                        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: brandingColor }}></div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Used for action buttons and accents</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ws-branding-desc" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Workspace Description</label>
                      <textarea id="ws-branding-desc" rows={2} value={brandingDesc} onChange={e => setBrandingDesc(e.target.value)}
                        className="input resize-none" placeholder="Describe your workspace..." />
                    </div>
                    <Button variant="action" onClick={saveBranding}>Save Branding</Button>
                  </div>
                </div>
              )}

              {/* Project Members */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mt-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Project Members</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Manage per-project team membership</p>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {projects.filter(p => !p.archived).map(p => (
                    <Button key={p.id} type="button" variant="secondary" size="sm" onClick={() => fetchProjectMembers(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedProjectId === p.id ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-navy'}`}>
                      {p.name}
                    </Button>
                  ))}
                </div>
                {selectedProjectId && (
                  <>
                    <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
                      {projectMembers.map(m => (
                        <div key={m.user_id || m.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <Avatar name={m.full_name || m.fullName} size={7} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900">{m.full_name || m.fullName}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{m.email}</p>
                          </div>
                          <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">{m.role}</span>
                        </div>
                      ))}
                      {projectMembers.length === 0 && <p className="text-sm text-neutral-600 py-2 text-center">No project-specific members yet.</p>}
                    </div>
                    <div className="flex gap-2">
                      <input type="email" placeholder="Email address"
                        value={projectMemberEmail} onChange={e => setProjectMemberEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addProjectMember(selectedProjectId)}
                        className="input flex-1 text-sm" />
                      <Button variant="secondary" onClick={() => addProjectMember(selectedProjectId)}>Add</Button>
                    </div>
                    {projectMemberMsg && <p className="text-xs text-semantic-success mt-2">{projectMemberMsg}</p>}
                  </>
                )}
              </div>

            </PageLayout>
  );
}
