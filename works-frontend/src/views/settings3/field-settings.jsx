import { Table } from '@/components/works/atoms/table';
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, LayoutDashboard, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';
import { TYPES } from '@/lib/work-item-types';

/**
 * CustomFieldsSettings — the "Custom Fields" sub-tab: the custom field library
 * (create + delete field definitions).
 */
export function CustomFieldsSettings({
  fieldDefs,
  showFieldForm,
  newFieldForm,
  setShowFieldForm,
  setNewFieldForm,
  createFieldDef,
  fetchFieldDefs,
  api,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Custom Field Library</h2>
        <Button variant="action" onClick={() => setShowFieldForm(f => !f)}>
          {showFieldForm ? 'Cancel' : '+ New Field'}
        </Button>
      </div>

      {/* Inline add field form */}
      {showFieldForm && (
        <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5 space-y-4">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">New Custom Field</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-field-name" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Field Name *</label>
              <input id="new-field-name" className="input text-sm w-full" placeholder="e.g. Meter Serial Number" value={newFieldForm.name}
                onChange={e => setNewFieldForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="new-field-type" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Field Type *</label>
              <select id="new-field-type" className="input text-sm w-full" value={newFieldForm.fieldType}
                onChange={e => setNewFieldForm(f => ({ ...f, fieldType: e.target.value }))}>
                {['TEXT','NUMBER','CURRENCY','DATE','DATETIME','SELECT','MULTI_SELECT','USER','URL','CHECKBOX','FILE','JSON','TEXTAREA','EMAIL','PHONE','RATING','PROGRESS'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-field-desc" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Description</label>
              <input id="new-field-desc" className="input text-sm w-full" placeholder="What is this field for?" value={newFieldForm.description}
                onChange={e => setNewFieldForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="req" checked={newFieldForm.required}
                onChange={e => setNewFieldForm(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 accent-brand-navy" />
              <label htmlFor="req" className="text-sm text-neutral-700 dark:text-neutral-200">Required field</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="action" onClick={createFieldDef}>Create Field</Button>
            <Button variant="ghost" onClick={() => setShowFieldForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {fieldDefs.length === 0
        ? <EmptyState icon={FileText} title="No custom fields" subtitle="Create custom fields to capture domain-specific data on work items." />
        : <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <Table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  {['Field Name', 'Type', 'Key', 'Required', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {fieldDefs.map(fd => (
                  <tr key={fd.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {fd.name}
                      {fd.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{fd.description}</p>}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs bg-brand-navy/10 dark:bg-brand-navy/20 text-brand-navy dark:text-blue-300 px-2 py-0.5 rounded font-mono">{fd.fieldType}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">{fd.fieldKey}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${fd.required ? 'text-semantic-danger' : 'text-neutral-300'}`}>{fd.required ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Required</span> : 'Optional'}</span></td>
                    <td className="px-4 py-3">
                      <Button unstyled onClick={() => api.send(`/field-defs/${fd.id}`, { method: 'DELETE' }).then(() => fetchFieldDefs())}
                        className="text-xs text-semantic-danger hover:underline">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
      }
    </div>
  );
}

/**
 * FieldLayoutSettings — the "Field Layout" sub-tab: per-type custom-field order
 * (drag to reorder, save per type). Visibility is read-only here (owned by the
 * Field Visibility tab).
 */
export function FieldLayoutSettings({
  fieldDefs,
  fieldLayouts,
  activeWorkspaceId,
  fetchFieldLayouts,
  showToast,
  api,
}) {
  // Local drag state — useRef avoids re-renders during drag gesture.
  const fieldDragIdx = useRef(null);
  // Per-type field layout order (local, persisted on "Save Layout").
  const [layoutOrders, setLayoutOrders] = useState({});

  // Helper: get the display order for a given item type's layout.
  const getLayoutOrder = (itemType) =>
    layoutOrders[itemType] ?? fieldDefs.map(fd => fd.id);

  const moveField = (itemType, index, delta) => {
    const target = index + delta;
    const order = getLayoutOrder(itemType).slice();
    if (target < 0 || target >= order.length) return;
    const [moved] = order.splice(index, 1);
    order.splice(target, 0, moved);
    setLayoutOrders(prev => ({ ...prev, [itemType]: order }));
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Field Layout</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Control which custom fields appear on each work item type and in what order.</p>
        </div>
      </div>
      {fieldDefs.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No custom fields defined" subtitle="Go to Custom Fields tab and create fields first, then configure layout here." />
      ) : (
        <div className="space-y-4">
          {Object.keys(TYPES).map(itemType => {
            const layoutForType = fieldLayouts.find(fl => fl.itemType === itemType);
            const orderedFields = layoutForType?.layout || fieldDefs.map(fd => ({ fieldDefId: fd.id, visible: true }));
            return (
              <div key={itemType} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={itemType} compact />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{itemType}</span>
                  </div>
                  <Button variant="secondary" onClick={() => {
                    const order = getLayoutOrder(itemType);
                    const layout = order.map(fid => {
                      const entry = orderedFields.find(e => e.fieldDefId === fid);
                      return { fieldDefId: fid, visible: entry ? entry.visible !== false : true };
                    });
                    api.send(`/field-layouts/${itemType}?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, { method: 'PUT', body: JSON.stringify({ layoutJson: layout }) })
                      .then(() => { showToast('Layout saved'); fetchFieldLayouts(); }).catch(() => showToast('Failed', 'error'));
                  }}>Save Layout</Button>
                </div>
                <div className="space-y-1">
                  {getLayoutOrder(itemType).map((fid, idx) => {
                    const fd = fieldDefs.find(f => f.id === fid);
                    if (!fd) return null;
                    const entry = orderedFields.find(e => e.fieldDefId === fd.id);
                    const visible = entry ? entry.visible !== false : true;
                    return (
                      <div key={fd.id}
                        data-testid="field-layout-row"
                        draggable={true}
                        onDragStart={() => { fieldDragIdx.current = idx; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          const from = fieldDragIdx.current;
                          if (from === null || from === idx) return;
                          const order = getLayoutOrder(itemType).slice();
                          const [moved] = order.splice(from, 1);
                          order.splice(idx, 0, moved);
                          setLayoutOrders(prev => ({ ...prev, [itemType]: order }));
                          fieldDragIdx.current = null;
                        }}
                        className="flex items-center gap-3 py-2 px-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg cursor-grab active:opacity-60">
                        <GripVertical className="h-4 w-4 text-neutral-300 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{fd.name}</span>
                          <span className="ml-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">{fd.fieldType}</span>
                        </div>
                        {/* Visibility is owned by the Field Visibility tab, not editable here.
                            Show it as an honest read-only status instead of a checkbox that
                            looks toggleable but only fires a "go elsewhere" toast (dead control). */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${visible ? 'bg-semantic-success-surface text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'}`}>
                          {visible ? 'Visible' : 'Hidden'}
                        </span>
                        <Button
                          unstyled
                          type="button"
                          aria-label={`Move ${fd.name} up`}
                          disabled={idx === 0}
                          onClick={() => moveField(itemType, idx, -1)}
                          onKeyDown={e => { if (e.key === 'ArrowUp') moveField(itemType, idx, -1); }}
                          className="rounded p-1 text-neutral-600 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          unstyled
                          type="button"
                          aria-label={`Move ${fd.name} down`}
                          disabled={idx === getLayoutOrder(itemType).length - 1}
                          onClick={() => moveField(itemType, idx, 1)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'ArrowDown') moveField(itemType, idx, 1); }}
                          className="rounded p-1 text-neutral-600 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">#{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * FieldVisibilitySettings — the "Field Visibility" sub-tab: per-field, per-role
 * visibility rules (EDITABLE / READ_ONLY / HIDDEN).
 */
export function FieldVisibilitySettings({
  fieldDefs,
  fieldVisibility,
  newFieldVisForm,
  roles,
  setNewFieldVisForm,
  saveFieldVisibility,
  fetchFieldVisibility,
  showToast,
  reportError,
  api,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Field Visibility by Role</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Control who can see or edit each custom field. Default is EDITABLE for all roles.</p>
        </div>
      </div>

      {/* Add visibility rule */}
      <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Add Visibility Rule</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label htmlFor="vis-field-id" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Field</label>
            <select id="vis-field-id" className="input text-sm" value={newFieldVisForm.fieldDefId}
              onChange={e => setNewFieldVisForm(f => ({ ...f, fieldDefId: e.target.value }))}>
              <option value="">— Select field —</option>
              {fieldDefs.map(fd => <option key={fd.id} value={fd.id}>{fd.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="vis-role-id" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Role</label>
            <select id="vis-role-id" className="input text-sm" value={newFieldVisForm.roleId}
              onChange={e => setNewFieldVisForm(f => ({ ...f, roleId: e.target.value }))}>
              <option value="">— Select role —</option>
              {[{id:'VIEWER',name:'VIEWER'},{id:'MEMBER',name:'MEMBER'},{id:'LEAD',name:'LEAD'},{id:'ADMIN',name:'ADMIN'},{id:'OWNER',name:'OWNER'},...roles].map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vis-visibility" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Visibility</label>
            <select id="vis-visibility" className="input text-sm" value={newFieldVisForm.visibility}
              onChange={e => setNewFieldVisForm(f => ({ ...f, visibility: e.target.value }))}>
              <option value="EDITABLE">EDITABLE</option>
              <option value="READ_ONLY">READ ONLY</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </div>
          <Button variant="action" onClick={saveFieldVisibility}>Add Rule</Button>
        </div>
      </div>

      {fieldVisibility.length === 0 ? (
        <EmptyState icon={Eye} title="No visibility rules defined" subtitle="All fields are visible and editable by all roles by default. Add rules to restrict access." />
      ) : (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          <Table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                {['Field', 'Role', 'Visibility', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {fieldVisibility.map(fv => (
                <tr key={fv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {fieldDefs.find(fd => fd.id === fv.fieldDefId)?.name || fv.fieldDefId}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{fv.roleId}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${fv.visibility === 'HIDDEN' ? 'bg-semantic-danger-surface text-semantic-danger' : fv.visibility === 'READ_ONLY' ? 'bg-semantic-warning-surface text-semantic-warning' : 'bg-semantic-success-surface text-semantic-success'}`}>
                      {fv.visibility}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button unstyled onClick={() => api.send(`/permission-schemes/field-visibility/rules/${fv.id}`, { method: 'DELETE' }).then(() => { showToast('Rule deleted'); fetchFieldVisibility(); }).catch(reportError)}
                      className="text-xs text-semantic-danger hover:underline">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
