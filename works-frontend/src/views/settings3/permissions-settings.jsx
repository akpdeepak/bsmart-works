import { Table } from '@/components/works/atoms/table';
import { Check, Lock } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';

/**
 * PermissionsSettings — the "Permissions" sub-tab: roles & permissions matrix
 * (create custom roles, toggle per-role permissions).
 * Pure rendering shell — all data + handlers come from props.
 */
export default function PermissionsSettings({
  permMatrix,
  showRoleForm,
  newRoleForm,
  setShowRoleForm,
  setNewRoleForm,
  togglePermission,
  createRole,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Roles &amp; Permissions Matrix</h2>
        <Button variant="action" onClick={() => setShowRoleForm(f => !f)}>
          {showRoleForm ? 'Cancel' : '+ New Role'}
        </Button>
      </div>

      {/* Inline add role form */}
      {showRoleForm && (
        <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">New Custom Role</p>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label htmlFor="new-role-name" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Role Name *</label>
              <input id="new-role-name" className="input text-sm w-44" placeholder="e.g. Support Agent" value={newRoleForm.name}
                onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="new-role-tier" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Tier (1-5)</label>
              <select id="new-role-tier" className="input text-sm" value={newRoleForm.tier}
                onChange={e => setNewRoleForm(f => ({ ...f, tier: Number(e.target.value) }))}>
                {[1,2,3,4,5].map(t => <option key={t} value={t}>Tier {t} — {['Viewer','Member','Lead','Admin','Owner'][t-1]}</option>)}
              </select>
            </div>
            <Button variant="action" onClick={createRole}>Create Role</Button>
            <Button variant="ghost" onClick={() => setShowRoleForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {!permMatrix
        ? (
          <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading permissions matrix">
            <div className="h-4 w-40 bg-neutral-100 dark:bg-neutral-700 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-700 rounded" />
                {[...Array(6)].map((_, j) => <div key={j} className="h-3 w-8 bg-neutral-100 dark:bg-neutral-700 rounded" />)}
              </div>
            ))}
          </div>
        )
        : (
          <>
            {/* System roles legend */}
            <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">System Roles</p>
              <div className="flex flex-wrap gap-3">
                {[{id:'VIEWER',tier:1},{id:'MEMBER',tier:2},{id:'LEAD',tier:3},{id:'ADMIN',tier:4},{id:'OWNER',tier:5}].map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{r.id}</span>
                    <span className="text-neutral-600 dark:text-neutral-400">Tier {r.tier}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">System roles are tier-based. A role can do anything its tier permits. A check = permitted, — = not permitted.</p>
            </div>
            {permMatrix.matrix.length === 0
              ? <EmptyState icon={Lock} title="No custom roles" subtitle="Create roles to define fine-grained access control for your team." />
              : <div className="overflow-x-auto">
                  <Table className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden dark:text-neutral-300">
                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 sticky left-0 bg-neutral-50 dark:bg-neutral-900">Permission</th>
                        {permMatrix.roles.map(r => (
                          <th key={r.id} className="px-3 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 text-center min-w-24">
                            <div>{r.name}</div>
                            <div className="font-normal text-neutral-600 dark:text-neutral-400">Tier {r.tier}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                      {permMatrix.allPermissions.map(perm => (
                        <tr key={perm} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="px-4 py-2 font-mono sticky left-0 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">{perm}</td>
                          {permMatrix.matrix.map(row => (
                            <td key={row.role.id} className="px-3 py-2 text-center">
                              <Button unstyled onClick={() => togglePermission(row.role.id, perm, row.permissions[perm])}
                                className={`w-7 h-7 rounded transition-colors text-sm font-bold ${row.permissions[perm] ? 'bg-semantic-success text-white hover:opacity-80' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-brand-navy/10'}`}
                                title={row.permissions[perm] ? 'Click to revoke' : 'Click to grant'}>
                                {row.permissions[perm] ? <Check className="inline-block h-4 w-4 text-semantic-success" aria-label="Permitted" /> : <span aria-label="Not permitted">—</span>}
                              </Button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
            }
          </>
        )
      }
    </div>
  );
}
