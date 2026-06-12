import { useRef, useState, useLayoutEffect } from 'react';
import {
  Settings, Check, Eye, Lock, X, ChevronRight, ArrowRight, LayoutDashboard, FileText,
  GripVertical, ChevronDown, Pencil, EyeOff, Trash2,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge, TypeIcon } from '@/components/works/work-item-type';
import { TYPES, TYPE_ICON_SET, TYPE_ICON_KEYS, ALL_TYPES, CATEGORIES, resolveTypeIcon } from '@/lib/work-item-types';
import { onPressKey, cn } from '@/lib/utils';
import { FIELD_SCHEMAS, loadFieldConfig, saveFieldConfig } from '@/lib/type-field-schemas';
import { BRAND_NAVY } from '@/lib/brand-tokens';
import StatusManagementTab from '@/components/works/organisms/status-management-tab';
import FieldConfigEditor from '@/components/works/organisms/field-config-editor';

// ── Field type display colours (badge behind the type name) ──────────────────
const FIELD_TYPE_COLORS = {
  text:           'bg-brand-navy/10 text-brand-navy',
  textarea:       'bg-brand-navy/10 text-brand-navy',
  select:         'bg-semantic-warning/10 text-semantic-warning',
  user:           'bg-semantic-success/10 text-semantic-success',
  date:           'bg-neutral-200 text-neutral-600',
  number:         'bg-neutral-200 text-neutral-600',
  'item-picker':  'bg-neutral-200 text-neutral-600',
  tags:           'bg-neutral-200 text-neutral-600',
};

// ── TypeFieldsTab ─────────────────────────────────────────────────────────────
// Self-contained: manages its own fieldConfig state with localStorage persistence.
// System fields (from FIELD_SCHEMAS baseline) can be renamed or hidden.
// Custom fields can be added, renamed, toggled required, or removed.

function TypeFieldsTab() {
  const [fieldConfig, setFieldConfig] = useState(() => loadFieldConfig());
  const [selectedTypeKey, setSelectedTypeKey] = useState(ALL_TYPES[0]?.typeKey ?? null);
  const [editingKey, setEditingKey]           = useState(null);
  const [editLabel, setEditLabel]             = useState('');
  const editInputRef = useRef(null);
  useLayoutEffect(() => { if (editingKey) editInputRef.current?.focus(); }, [editingKey]);
  const [showAddForm, setShowAddForm]         = useState(false);
  const [addForm, setAddForm] = useState({ label: '', type: 'text', required: false, options: '' });

  const persist = (next) => { setFieldConfig(next); saveFieldConfig(next); };

  const typeCfg = (k) => fieldConfig[k] ?? {};

  const effectiveFields = (k) => {
    const cfg = typeCfg(k);
    const base = (FIELD_SCHEMAS[k] ?? [])
      .filter(f => !(cfg.hidden ?? []).includes(f.key))
      .map(f => ({ ...f, ...(cfg.overrides?.[f.key] ?? {}), _system: true }));
    return [...base, ...(cfg.custom ?? []).map(f => ({ ...f, _system: false }))];
  };

  const fields = selectedTypeKey ? effectiveFields(selectedTypeKey) : [];

  const startEdit = (f) => { setEditingKey(f.key); setEditLabel(f.label); };
  const saveEdit  = () => {
    if (!selectedTypeKey || !editingKey) return;
    const cfg = typeCfg(selectedTypeKey);
    persist({
      ...fieldConfig,
      [selectedTypeKey]: {
        ...cfg,
        overrides: { ...(cfg.overrides ?? {}), [editingKey]: { ...(cfg.overrides?.[editingKey] ?? {}), label: editLabel } },
      },
    });
    setEditingKey(null);
  };

  const toggleRequired = (f) => {
    const cfg = typeCfg(selectedTypeKey);
    if (f._system) {
      persist({
        ...fieldConfig,
        [selectedTypeKey]: {
          ...cfg,
          overrides: { ...(cfg.overrides ?? {}), [f.key]: { ...(cfg.overrides?.[f.key] ?? {}), required: !f.required } },
        },
      });
    } else {
      persist({
        ...fieldConfig,
        [selectedTypeKey]: {
          ...cfg,
          custom: (cfg.custom ?? []).map(c => c.key === f.key ? { ...c, required: !c.required } : c),
        },
      });
    }
  };

  const hideField = (f) => {
    const cfg = typeCfg(selectedTypeKey);
    persist({ ...fieldConfig, [selectedTypeKey]: { ...cfg, hidden: [...(cfg.hidden ?? []), f.key] } });
  };

  const removeCustom = (key) => {
    const cfg = typeCfg(selectedTypeKey);
    persist({ ...fieldConfig, [selectedTypeKey]: { ...cfg, custom: (cfg.custom ?? []).filter(f => f.key !== key) } });
  };

  const addField = () => {
    if (!addForm.label.trim()) return;
    const key = `custom_${addForm.label.toLowerCase().replace(/\W+/g, '_')}_${Date.now()}`;
    const opts = addForm.type === 'select' && addForm.options
      ? addForm.options.split(',').map(o => o.trim()).filter(Boolean).map(o => ({ value: o.toUpperCase().replace(/\s+/g, '_'), label: o }))
      : undefined;
    const cfg = typeCfg(selectedTypeKey);
    persist({
      ...fieldConfig,
      [selectedTypeKey]: {
        ...cfg,
        custom: [...(cfg.custom ?? []), { key, label: addForm.label.trim(), type: addForm.type, required: addForm.required, ...(opts ? { options: opts } : {}) }],
      },
    });
    setAddForm({ label: '', type: 'text', required: false, options: '' });
    setShowAddForm(false);
  };

  return (
    <div className="flex gap-6" style={{ minHeight: '520px' }}>
      {/* Left — type list */}
      <div className="w-52 flex-shrink-0 space-y-5">
        {Object.entries(CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-2">{cat.label}</p>
            <div className="space-y-0.5">
              {ALL_TYPES.filter(t => t.category === catKey).map(t => {
                const Icon = resolveTypeIcon(t.icon);
                const sel  = selectedTypeKey === t.typeKey;
                return (
                  <button key={t.typeKey}
                    onClick={() => { setSelectedTypeKey(t.typeKey); setShowAddForm(false); setEditingKey(null); }}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      sel ? 'bg-brand-navy text-white' : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    )}
                  >
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-white', t.color)}>
                      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
                    </span>
                    <span className="flex-1 truncate">{t.label}</span>
                    <span className={cn('text-xs tabular-nums', sel ? 'text-white/60' : 'text-neutral-400')}>
                      {effectiveFields(t.typeKey).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Right — field list */}
      <div className="flex-1 min-w-0">
        {selectedTypeKey ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {ALL_TYPES.find(t => t.typeKey === selectedTypeKey)?.label} — Fields
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {fields.length} field{fields.length !== 1 ? 's' : ''} ·
                  System fields can be renamed or hidden · Custom fields are fully removable
                </p>
              </div>
              {!showAddForm && (
                <Button variant="ghost" onClick={() => setShowAddForm(true)}>+ Add field</Button>
              )}
            </div>

            <div className="space-y-1.5">
              {fields.map(f => (
                <div key={f.key}
                  className="flex items-center gap-3 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5">
                  {/* Label / inline editor */}
                  <div className="flex-1 min-w-0">
                    {editingKey === f.key ? (
                      <div className="flex items-center gap-2">
                        <input ref={editInputRef} value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingKey(null); }}
                          className="text-sm font-medium border-b border-brand-navy outline-none bg-transparent w-40"
                        />
                        <button onClick={saveEdit} className="text-xs text-semantic-success hover:underline">Save</button>
                        <button onClick={() => setEditingKey(null)} className="text-xs text-neutral-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{f.label}</span>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono shrink-0',
                    FIELD_TYPE_COLORS[f.type] ?? 'bg-neutral-100 text-neutral-600')}>
                    {f.type}
                  </span>

                  {/* Required toggle */}
                  <button onClick={() => toggleRequired(f)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0',
                      f.required
                        ? 'border-brand-orange text-brand-orange bg-brand-orange/10'
                        : 'border-neutral-200 text-neutral-400 hover:border-neutral-300'
                    )}>
                    {f.required ? 'required' : 'optional'}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => startEdit(f)} title="Rename"
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {f._system
                      ? (
                        <button onClick={() => hideField(f)} title="Hide this field"
                          className="p-1 text-neutral-300 hover:text-semantic-warning rounded transition-colors">
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button onClick={() => removeCustom(f.key)} title="Remove field"
                          className="p-1 text-neutral-300 hover:text-semantic-danger rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Add field form */}
            {showAddForm && (
              <div className="mt-4 rounded-lg border border-brand-navy/20 bg-neutral-50 dark:bg-neutral-900 p-4 space-y-3">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Add custom field</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="tf-add-field-name" className="block text-xs font-medium text-neutral-600 mb-1">Field name *</label>
                    <input id="tf-add-field-name" type="text" value={addForm.label}
                      onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))}
                      className="input text-sm" placeholder="e.g. Customer Name" />
                  </div>
                  <div>
                    <label htmlFor="tf-add-field-type" className="block text-xs font-medium text-neutral-600 mb-1">Field type *</label>
                    <select id="tf-add-field-type" value={addForm.type}
                      onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}
                      className="input text-sm">
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select (dropdown)</option>
                      <option value="user">User</option>
                      <option value="textarea">Text area</option>
                      <option value="tags">Tags</option>
                    </select>
                  </div>
                </div>
                {addForm.type === 'select' && (
                  <div>
                    <label htmlFor="tf-add-field-options" className="block text-xs font-medium text-neutral-600 mb-1">Options (comma-separated) *</label>
                    <input id="tf-add-field-options" type="text" value={addForm.options}
                      onChange={e => setAddForm(p => ({ ...p, options: e.target.value }))}
                      className="input text-sm" placeholder="e.g. Option A, Option B, Option C" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tf-add-req" checked={addForm.required}
                    onChange={e => setAddForm(p => ({ ...p, required: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300" />
                  <label htmlFor="tf-add-req" className="text-sm text-neutral-700 dark:text-neutral-300">Required field</label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowAddForm(false); setAddForm({ label: '', type: 'text', required: false, options: '' }); }}>
                    Cancel
                  </Button>
                  <Button variant="action" onClick={addField} disabled={!addForm.label.trim()}>
                    Add field
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-neutral-400">
            Select a type on the left to manage its fields.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Settings3View — workspace configuration: workflows, custom fields, field layout,
 * field visibility, permissions matrix, and work item types.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function Settings3View({
  settings3Tab,
  fieldPrefs,
  customFieldDefs,
  onSaveFieldPrefs,
  workflows,
  expandedWorkflowId,
  workflowDetail,
  newStatusForm,
  newTransitionForm,
  fieldDefs,
  showFieldForm,
  newFieldForm,
  fieldLayouts,
  fieldVisibility,
  newFieldVisForm,
  roles,
  permMatrix,
  showRoleForm,
  newRoleForm,
  workItemTypes,
  showTypeForm,
  newTypeForm,
  activeWorkspaceId,
  setSettings3Tab,
  setExpandedWorkflowId,
  setNewStatusForm,
  setNewTransitionForm,
  setShowFieldForm,
  setNewFieldForm,
  setNewFieldVisForm,
  setShowRoleForm,
  setNewRoleForm,
  setShowTypeForm,
  setNewTypeForm,
  fetchWorkflows,
  fetchFieldDefs,
  fetchFieldLayouts,
  fetchRoles,
  fetchFieldVisibility,
  fetchPermMatrix,
  fetchWorkItemTypes,
  expandWorkflow,
  addStatus,
  deleteStatus,
  addTransition,
  deleteTransition,
  createFieldDef,
  saveFieldVisibility,
  togglePermission,
  createRole,
  createWorkItemType,
  reportError,
  showToast,
  api,
}) {
  // Local drag state — useRef avoids re-renders during drag gesture.
  const statusDragId   = useRef(null);
  const fieldDragIdx   = useRef(null);
  // Per-type field layout order (local, persisted on "Save Layout").
  const [layoutOrders, setLayoutOrders] = useState({});
  // Expanded transition ID for viewing/editing conditions/validators/post-functions.
  const [expandedTransId, setExpandedTransId] = useState(null);
  // "Add rule" form state (one active form at a time per section).
  const [addRuleForm, setAddRuleForm] = useState({ transId: null, section: null, type: '', fieldKey: '', value: '', tier: 3 });

  // Helper: get the display order for a given item type's layout.
  const getLayoutOrder = (itemType) =>
    layoutOrders[itemType] ?? fieldDefs.map(fd => fd.id);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white mb-1">Workflows &amp; Fields</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">Configure workflows, custom fields, permissions, and work item types</p>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
        {[
          { key: 'workflows',   label: 'Workflows' },
          { key: 'statuses',    label: 'Status Management' },
          { key: 'fields',      label: 'Custom Fields' },
          { key: 'layout',      label: 'Field Layout' },
          { key: 'visibility',  label: 'Field Visibility' },
          { key: 'permissions', label: 'Permissions' },
          { key: 'types',       label: 'Item Types' },
          { key: 'type-fields', label: 'Fields' },
          { key: 'detail-fields', label: 'Detail Fields' },
        ].map(t => (
          <button key={t.key} onClick={() => {
            setSettings3Tab(t.key);
            if (t.key === 'permissions') fetchPermMatrix();
            if (t.key === 'layout') { fetchFieldDefs(); fetchFieldLayouts(); }
            if (t.key === 'visibility') { fetchFieldDefs(); fetchRoles(); fetchFieldVisibility(); }
          }}
            className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${settings3Tab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATUS MANAGEMENT TAB */}
      {settings3Tab === 'statuses' && (
        <StatusManagementTab api={api} workspaceId={activeWorkspaceId} showToast={showToast} reportError={reportError} />
      )}

      {/* DETAIL FIELDS TAB — per-type visibility + order on the work item detail surface */}
      {settings3Tab === 'detail-fields' && (
        <FieldConfigEditor fieldPrefs={fieldPrefs} customFieldDefs={customFieldDefs || []} onSave={onSaveFieldPrefs} />
      )}

      {/* WORKFLOWS TAB */}
      {settings3Tab === 'workflows' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Workflow Definitions</h2>
            <Button variant="action" onClick={() => {
              const name = 'New Workflow ' + (workflows.length + 1);
              api.raw(`/workflows`, { method: 'POST', body: JSON.stringify({ name, workspaceId: activeWorkspaceId, isDefault: false }) })
                .then(r => r.json()).then(() => fetchWorkflows());
            }}>+ New Workflow</Button>
          </div>
          {workflows.length === 0
            ? <EmptyState icon={Settings} title="No workflows yet" subtitle="Create a workflow to define statuses and transitions for your work items."
                action={<Button variant="action" onClick={() => {
                  api.raw(`/workflows`, { method: 'POST', body: JSON.stringify({ name: 'Default Workflow', workspaceId: activeWorkspaceId, isDefault: true }) })
                    .then(r => r.json()).then(() => fetchWorkflows());
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
                          <button onClick={() => api.raw(`/workflows/${wf.id}`, { method: 'DELETE' }).then(() => { fetchWorkflows(); if (expandedWorkflowId === wf.id) setExpandedWorkflowId(null); })}
                            className="text-xs text-semantic-danger hover:underline">Delete</button>
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
                                        api.raw(`/workflows/${wf.id}/statuses/reorder`, {
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
                                      <button onClick={() => deleteStatus(wf.id, s.id)} className="text-neutral-300 hover:text-semantic-danger ml-1 text-xs" aria-label="Delete status"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
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
                                        api.raw(`/workflows/${wf.id}/transitions/${t.id}`, {
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
                                            <button
                                              onClick={() => setExpandedTransId(isExpTrans ? null : t.id)}
                                              className="ml-auto flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy dark:hover:text-white transition-colors"
                                              aria-expanded={isExpTrans} aria-label="Toggle transition rules">
                                              {totalRules > 0 && <span className="bg-brand-navy text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{totalRules}</span>}
                                              <span className="hidden sm:inline">Rules</span>
                                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpTrans ? 'rotate-180' : ''}`} aria-hidden="true" />
                                            </button>
                                            <button onClick={() => deleteTransition(wf.id, t.id)} className="text-neutral-300 hover:text-semantic-danger text-xs" aria-label="Delete transition"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
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
                                                      <button onClick={() => saveRules(conditions.filter((_,j)=>j!==i), validators, postFunctions)} className="hover:text-semantic-danger" aria-label="Remove condition"><X className="h-3 w-3" aria-hidden="true" /></button>
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
                                                  <button className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'conditions', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add condition</button>
                                                )}
                                              </div>
                                              {/* Validators */}
                                              <div>
                                                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Validators <span className="font-normal normal-case">(required before transition)</span></p>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                  {validators.map((v, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-semantic-warning/10 text-semantic-warning px-2 py-0.5 rounded-full">
                                                      {v.type}{v.fieldKey ? ` ${v.fieldKey}` : ''}
                                                      <button onClick={() => saveRules(conditions, validators.filter((_,j)=>j!==i), postFunctions)} className="hover:text-semantic-danger" aria-label="Remove validator"><X className="h-3 w-3" aria-hidden="true" /></button>
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
                                                  <button className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'validators', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add validator</button>
                                                )}
                                              </div>
                                              {/* Post-functions */}
                                              <div>
                                                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Post-functions <span className="font-normal normal-case">(run after transition)</span></p>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                  {postFunctions.map((pf, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-semantic-success/10 text-semantic-success px-2 py-0.5 rounded-full">
                                                      {pf.type}{pf.fieldKey ? ` ${pf.fieldKey}=${pf.value}` : ''}
                                                      <button onClick={() => saveRules(conditions, validators, postFunctions.filter((_,j)=>j!==i))} className="hover:text-semantic-danger" aria-label="Remove post-function"><X className="h-3 w-3" aria-hidden="true" /></button>
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
                                                  <button className="text-xs text-brand-navy hover:underline" onClick={() => setAddRuleForm({ transId: t.id, section: 'postFunctions', type: '', fieldKey: '', value: '', tier: 3 })}>+ Add post-function</button>
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
      )}

      {/* CUSTOM FIELDS TAB */}
      {settings3Tab === 'fields' && (
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
                <table className="w-full text-sm">
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
                          <button onClick={() => api.raw(`/field-defs/${fd.id}`, { method: 'DELETE' }).then(() => fetchFieldDefs())}
                            className="text-xs text-semantic-danger hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* FIELD LAYOUT TAB */}
      {settings3Tab === 'layout' && (
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
                        api.send(`/field-layouts`, { method: 'PUT', body: JSON.stringify({ itemType, layout, workspaceId: activeWorkspaceId }) })
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
                            <input type="checkbox" checked={visible} className="w-4 h-4 accent-brand-navy"
                              onChange={() => showToast('Toggle field visibility in Field Visibility tab')}
                              title="Toggle visibility" />
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
      )}

      {/* FIELD VISIBILITY TAB */}
      {settings3Tab === 'visibility' && (
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
              <table className="w-full text-sm">
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
                        <button onClick={() => api.send(`/field-visibility/${fv.id}`, { method: 'DELETE' }).then(() => { showToast('Rule deleted'); fetchFieldVisibility(); }).catch(reportError)}
                          className="text-xs text-semantic-danger hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PERMISSIONS MATRIX TAB */}
      {settings3Tab === 'permissions' && (
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
                      <table className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden dark:text-neutral-300">
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
                                  <button onClick={() => togglePermission(row.role.id, perm, row.permissions[perm])}
                                    className={`w-7 h-7 rounded transition-colors text-sm font-bold ${row.permissions[perm] ? 'bg-semantic-success text-white hover:opacity-80' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-brand-navy/10'}`}
                                    title={row.permissions[perm] ? 'Click to revoke' : 'Click to grant'}>
                                    {row.permissions[perm] ? <Check className="inline-block h-4 w-4 text-semantic-success" aria-label="Permitted" /> : <span aria-label="Not permitted">—</span>}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                }
              </>
            )
          }
        </div>
      )}

      {/* ITEM TYPES TAB */}
      {/* TYPE FIELDS TAB */}
      {settings3Tab === 'type-fields' && (
        <div>
          <div className="mb-5">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Type Fields</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Manage the fields for each work item type. Rename or hide system fields; add, edit, and remove custom fields.
              Changes are saved to this workspace and reflected in the create dialog and detail panel.
            </p>
          </div>
          <TypeFieldsTab />
        </div>
      )}

      {settings3Tab === 'types' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Work Item Types</h2>
            <Button variant="action" onClick={() => setShowTypeForm(f => !f)}>
              {showTypeForm ? 'Cancel' : '+ Custom Type'}
            </Button>
          </div>

          {/* Inline add type form */}
          {showTypeForm && (
            <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">New Custom Type</p>
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <label htmlFor="new-type-label" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Label *</label>
                  <input id="new-type-label" className="input text-sm w-44" placeholder="e.g. Meter Rollout" value={newTypeForm.label}
                    onChange={e => setNewTypeForm(f => ({ ...f, label: e.target.value, typeKey: e.target.value.toUpperCase().replace(/\s+/g,'_') }))} />
                </div>
                <div>
                  <label htmlFor="new-type-key" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Key</label>
                  <input id="new-type-key" className="input text-sm w-36 font-mono" placeholder="METER_ROLLOUT" value={newTypeForm.typeKey}
                    onChange={e => setNewTypeForm(f => ({ ...f, typeKey: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1" id="new-type-icon-label">Icon</span>
                  <div className="flex flex-wrap gap-1 max-w-60" role="group" aria-labelledby="new-type-icon-label">
                    {TYPE_ICON_KEYS.map(key => {
                      const Ic = TYPE_ICON_SET[key];
                      const sel = newTypeForm.icon === key;
                      return (
                        <button key={key} type="button" onClick={() => setNewTypeForm(f => ({ ...f, icon: key }))}
                          aria-label={key} aria-pressed={sel}
                          className={`p-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${sel ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy/40'}`}>
                          <Ic className="h-4 w-4" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button variant="action" onClick={createWorkItemType}>Create Type</Button>
                <Button variant="ghost" onClick={() => setShowTypeForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Built-in types grouped by category */}
            {Object.entries(CATEGORIES).map(([catKey, cat]) => {
              const catTypes = ALL_TYPES.filter(t => t.category === catKey);
              return (
                <div key={catKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{cat.label}</p>
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">{catTypes.length}</span>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 hidden md:block">— {cat.description}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {catTypes.map(t => {
                      const Icon = resolveTypeIcon(t.icon);
                      return (
                        <div key={t.typeKey} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white ${t.color}`}>
                            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate">{t.label}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{t.autoIdPrefix}-####</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {(workItemTypes.custom || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Custom Types</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(workItemTypes.custom || []).map(t => (
                    <div key={t.id} className="bg-white dark:bg-neutral-800 border border-brand-navy/20 dark:border-brand-navy/30 rounded-xl p-4 flex items-center gap-3 relative group">
                      <TypeIcon value={t.icon} className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{t.label}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">{t.typeKey}</p>
                      </div>
                      <button onClick={() => api.raw(`/work-item-types/${t.id}`, { method: 'DELETE' }).then(() => fetchWorkItemTypes())}
                        className="opacity-0 group-hover:opacity-100 text-semantic-danger text-xs transition-opacity absolute top-2 right-2" aria-label="Remove"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(workItemTypes.custom || []).length === 0 && !showTypeForm && (
              <p className="text-sm text-neutral-600 italic">No custom types yet. Create utility-domain types like Meter Rollout, Tariff Change, or Substation Commission.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
