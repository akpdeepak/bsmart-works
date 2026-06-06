import { KeyRound } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/works/button';
import { Avatar } from '@/components/works/atoms/avatar';
import { RoleBadge } from '@/components/works/role-badge';

// Workspace Settings view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-
// preserving: the parent owns members/branding/MFA/notification state and all the handlers.
export default function WorkspaceView({
  workspaceMembers, currentUser, userRole, inviteEmail, inviteMsg, notifPrefs,
  mfaSetup, mfaSetupCode, mfaSetupMsg, brandingColor, brandingDesc, projects,
  selectedProjectId, projectMembers, projectMemberEmail, projectMemberMsg,
  setInviteEmail, setMfaSetup, setMfaSetupCode, setBrandingColor, setBrandingDesc,
  setProjectMemberEmail, handleRemoveMember, handleInvite, saveNotifPrefs,
  handleMfaEnroll, handleMfaConfirm, saveBranding, fetchProjectMembers,
  addProjectMember, can, showToast,
}) {
  return (
            <div className="p-8 max-w-3xl">
              <h1 className="text-2xl font-bold text-brand-navy mb-1">Workspace Settings</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">BCITS Master Workspace</p>
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
                          <button onClick={() => handleRemoveMember(m.id)}
                            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger transition-colors">Remove</button>
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

              {/* Notification Preferences */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Notification Preferences</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Control what notifies you</p>
                {[
                  { key: 'notifyAssign',  label: 'Assigned to a work item' },
                  { key: 'notifyComment', label: 'New comment on my items' },
                  { key: 'notifyMention', label: '@mentioned in a comment' },
                  { key: 'emailDigest',   label: 'Daily email digest' },
                ].map(pref => (
                  <label key={pref.key} className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0 cursor-pointer">
                    <span className="text-sm text-neutral-700">{pref.label}</span>
                    <input type="checkbox" checked={notifPrefs[pref.key]}
                      onChange={e => { const updated = { ...notifPrefs, [pref.key]: e.target.checked }; saveNotifPrefs(updated); }}
                      className="w-4 h-4 accent-brand-navy" />
                  </label>
                ))}
              </div>

              {/* MFA / Two-Factor Authentication */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mt-6">
                <h2 className="font-semibold text-neutral-900 mb-1">Two-Factor Authentication (TOTP)</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Secure your account with an authenticator app (Google Authenticator, Authy, etc.)</p>
                {!mfaSetup ? (
                  <Button variant="secondary" onClick={handleMfaEnroll}>
                    <KeyRound className="inline-block h-4 w-4 mr-1.5 align-text-bottom" aria-hidden="true" />Set up authenticator app
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                      <p className="text-xs font-semibold text-neutral-600 mb-2">1. Scan this QR code with your authenticator app</p>
                      <div className="bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded p-3 text-center mb-3">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(mfaSetup.otpAuthUri)}&size=160x160`}
                          alt="TOTP QR Code" className="mx-auto w-40 h-40" />
                      </div>
                      <p className="text-xs text-neutral-600 mb-1">Or enter this secret manually:</p>
                      <code className="text-xs bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 px-2 py-1 rounded font-mono break-all">{mfaSetup.secret}</code>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-600 mb-2">2. Enter the 6-digit code to confirm</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                          value={mfaSetupCode} onChange={e => setMfaSetupCode(e.target.value.replace(/\D/g,''))}
                          className="input w-32 text-center tracking-widest text-lg font-mono" />
                        <Button variant="action" onClick={handleMfaConfirm} disabled={mfaSetupCode.length !== 6}>
                          Activate MFA
                        </Button>
                        <Button variant="secondary" onClick={() => { setMfaSetup(null); setMfaSetupCode(''); }}>
                          Cancel
                        </Button>
                      </div>
                      {mfaSetupMsg && <p className="text-xs text-semantic-danger mt-2">{mfaSetupMsg}</p>}
                    </div>
                  </div>
                )}
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
                                  body: JSON.stringify({ roleId: e.target.value })
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
                          className="input w-32 font-mono text-sm" placeholder="#E94E1B" />
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
                    <button key={p.id} onClick={() => fetchProjectMembers(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedProjectId === p.id ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-navy'}`}>
                      {p.name}
                    </button>
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
            </div>
  );
}
