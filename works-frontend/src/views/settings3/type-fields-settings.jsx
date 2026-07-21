import { useRef, useState, useLayoutEffect } from 'react';
import { Pencil, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { ALL_TYPES, CATEGORIES, resolveTypeIcon } from '@/lib/work-item-types';
import { cn } from '@/lib/utils';
import { FIELD_SCHEMAS, loadFieldConfig, saveFieldConfig } from '@/lib/type-field-schemas';

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
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5 px-2">{cat.label}</p>
            <div className="space-y-0.5">
              {ALL_TYPES.filter(t => t.category === catKey).map(t => {
                const Icon = resolveTypeIcon(t.icon);
                const sel  = selectedTypeKey === t.typeKey;
                return (
                  <Button unstyled key={t.typeKey}
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
                  </Button>
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
                        <Button unstyled onClick={saveEdit} className="text-xs text-semantic-success hover:underline">Save</Button>
                        <Button unstyled onClick={() => setEditingKey(null)} className="text-xs text-neutral-400 hover:underline">Cancel</Button>
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
                  <Button unstyled onClick={() => toggleRequired(f)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0',
                      f.required
                        ? 'border-brand-orange text-brand-orange bg-brand-orange/10'
                        : 'border-neutral-200 text-neutral-400 hover:border-neutral-300'
                    )}>
                    {f.required ? 'required' : 'optional'}
                  </Button>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button unstyled onClick={() => startEdit(f)} title="Rename"
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {f._system
                      ? (
                        <Button unstyled onClick={() => hideField(f)} title="Hide this field"
                          className="p-1 text-neutral-300 hover:text-semantic-warning rounded transition-colors">
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button unstyled onClick={() => removeCustom(f.key)} title="Remove field"
                          className="p-1 text-neutral-300 hover:text-semantic-danger rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
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
          <div className="flex items-center justify-center h-64 text-sm text-neutral-600">
            Select a type on the left to manage its fields.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TypeFieldsSettings — the "Fields" sub-tab: per-type system + custom fields.
 * Self-contained (localStorage-backed); takes no props.
 */
export default function TypeFieldsSettings() {
  return (
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
  );
}
