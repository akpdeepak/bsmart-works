import { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Plus, ChevronDown, RotateCcw, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/apiClient';

// ── Field catalogue ────────────────────────────────────────────────────────────
// These are built-in WorkItem fields that are not shown by default but can be
// added to the card. Grouped for the picker panel.

const ALWAYS_VISIBLE = [
  { key: 'idType', label: 'ID & type' },
  { key: 'title',  label: 'Title' },
];

const DEFAULT_TOGGLES = [
  { key: 'status',   label: 'Status',   icon: '◉' },
  { key: 'priority', label: 'Priority', icon: '⚑' },
  { key: 'assignee', label: 'Assignee', icon: '◎' },
  { key: 'dueDate',  label: 'Due date', icon: '⊙' },
];

const ADDABLE_FIELDS = [
  // General
  { key: 'storyPoints',   label: 'Story points',    type: 'Number', group: 'General' },
  { key: 'tags',          label: 'Tags',            type: 'Tags',   group: 'General' },
  { key: 'description',   label: 'Description',     type: 'Text',   group: 'General' },
  { key: 'startDate',     label: 'Start date',      type: 'Date',   group: 'General' },
  { key: 'reporter',      label: 'Reporter',        type: 'User',   group: 'General' },
  { key: 'createdBy',     label: 'Created by',      type: 'User',   group: 'General' },
  // Bug
  { key: 'severity',      label: 'Severity',        type: 'Select', group: 'Bug' },
  { key: 'environment',   label: 'Environment',     type: 'Text',   group: 'Bug' },
  { key: 'fixedInVersion',label: 'Fixed in version',type: 'Text',   group: 'Bug' },
  { key: 'regressionRisk',label: 'Regression risk', type: 'Select', group: 'Bug' },
  // Incident
  { key: 'slaTarget',     label: 'SLA target',      type: 'Date',   group: 'Incident' },
  { key: 'slaBreachFlag', label: 'SLA breached',    type: 'Boolean',group: 'Incident' },
  { key: 'businessImpact',label: 'Business impact', type: 'Select', group: 'Incident' },
  { key: 'responseSpeed', label: 'Response speed',  type: 'Select', group: 'Incident' },
];

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT'];

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * CardFieldsPopover — inline popover for customising which fields appear on
 * work item cards. Renders as a button + absolutely-positioned panel.
 *
 * Props:
 *   cardPrefs      – { prefs, isVisible, toggleField, addField, removeField, resetPrefs }
 *   workspaceId    – string, required for custom field creation + listing
 *   customFieldDefs – array of custom field definition objects from the backend
 *   onCustomFieldCreated – callback(newDef) when a new def is saved to the API
 */
export function CardFieldsPopover({ cardPrefs, workspaceId, customFieldDefs = [], onCustomFieldCreated }) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState('existing');
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('TEXT');
  const [newOptions, setNewOptions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const { isVisible, toggleField, addField, removeField, resetPrefs } = cardPrefs;

  // Fields already visible on the card (default toggles + any added)
  const addedBuiltin = ADDABLE_FIELDS.filter(f => isVisible(f.key));
  const addedCustom  = customFieldDefs.filter(d => isVisible(`fd_${d.id}`));

  // Picker: built-in fields not yet visible
  const availableBuiltin = ADDABLE_FIELDS.filter(f => !isVisible(f.key));
  const filteredBuiltin = search
    ? availableBuiltin.filter(f => f.label.toLowerCase().includes(search.toLowerCase()))
    : availableBuiltin;

  // Group built-in available fields
  const groups = [...new Set(filteredBuiltin.map(f => f.group))];

  async function createCustomField(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      // Unified onto field_def (Option B): card custom fields are now field_def rows, so their
      // values are entered in the detail panel and shown on cards from the same store.
      const opts = newType === 'SELECT' && newOptions.trim()
        ? newOptions.split(',').map(s => s.trim()).filter(Boolean) : null;
      const payload = {
        workspaceId,
        name: newName.trim(),
        fieldType: newType,
        fieldKey: `card_${newName.trim().toLowerCase().replace(/\W+/g, '_').slice(0, 40)}_${Date.now()}`,
        config: opts ? JSON.stringify({ options: opts }) : '{}',
        required: false,
      };
      const def = await api.send('/field-defs', { method: 'POST', body: payload });
      addField(`fd_${def.id}`);
      onCustomFieldCreated?.(def);
      setNewName('');
      setNewOptions('');
      setNewType('TEXT');
      setTab('existing');
    } catch (err) {
      setSaveError(err.message || 'Failed to create field');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          open
            ? 'bg-brand-navy text-white'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        )}
        aria-label="Customise card fields"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        Fields
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Card fields</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Choose what shows on each card</p>
            </div>
            <button onClick={resetPrefs} title="Reset to defaults"
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-brand-navy dark:hover:text-neutral-200 flex items-center gap-1">
              <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
            </button>
          </div>

          {/* Always-on fields */}
          <div className="px-4 pt-1 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2">Always shown</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALWAYS_VISIBLE.map(f => (
                <div key={f.key}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 opacity-60">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">{f.label}</span>
                  <span className="w-7 h-4 rounded-full bg-brand-navy opacity-50 flex-shrink-0" aria-label="always on" />
                </div>
              ))}
            </div>
          </div>

          {/* Toggleable fields */}
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2">Optional fields</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEFAULT_TOGGLES.map(f => (
                <FieldToggle key={f.key} label={f.label} on={isVisible(f.key)} onChange={() => toggleField(f.key)} />
              ))}
              {addedBuiltin.map(f => (
                <FieldToggle key={f.key} label={f.label} on removable onRemove={() => removeField(f.key)} onChange={() => toggleField(f.key)} />
              ))}
              {addedCustom.map(d => (
                <FieldToggle key={d.id} label={d.name} on removable
                  onRemove={() => removeField(`fd_${d.id}`)}
                  onChange={() => toggleField(`fd_${d.id}`)} />
              ))}
            </div>
          </div>

          {/* Add field button */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setAddOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy dark:hover:border-brand-navy-tint dark:hover:text-brand-navy-tint transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add field
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', addOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </div>

          {/* Add field panel */}
          {addOpen && (
            <div className="border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                {[['existing', 'From work item'], ['custom', 'Create custom']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={cn(
                      'flex-1 text-xs py-1.5 rounded-md font-medium transition-colors',
                      tab === key
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm border border-neutral-200 dark:border-neutral-600'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    )}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'existing' && (
                <>
                  {/* Search */}
                  <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 mb-2">
                    <Search className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                    <input
                      type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search fields…"
                      className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none"
                    />
                  </div>
                  {/* Field list */}
                  <div className="max-h-44 overflow-y-auto space-y-0.5">
                    {filteredBuiltin.length === 0 && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-3">
                        {availableBuiltin.length === 0 ? 'All available fields added' : 'No fields match'}
                      </p>
                    )}
                    {groups.map(group => (
                      <div key={group}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 px-1 pt-2 pb-1">{group}</p>
                        {filteredBuiltin.filter(f => f.group === group).map(f => (
                          <button key={f.key}
                            onClick={() => { addField(f.key); setSearch(''); }}
                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors text-left group">
                            <div>
                              <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{f.label}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">{f.type}</p>
                            </div>
                            <span className="text-xs font-medium text-brand-navy dark:text-brand-navy-tint opacity-0 group-hover:opacity-100 transition-opacity">Add</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === 'custom' && (
                <form onSubmit={createCustomField} className="space-y-2.5">
                  <div>
                    <label htmlFor="cfd-new-name" className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Field name</label>
                    <input
                      id="cfd-new-name"
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Customer name, Region"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:ring-1 focus:ring-brand-navy-tint/50"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Field type</span>
                    <div className="grid grid-cols-4 gap-1" role="group" aria-label="Field type">
                      {FIELD_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => setNewType(t)}
                          className={cn(
                            'py-1.5 rounded-md text-xs font-medium transition-colors border',
                            newType === t
                              ? 'bg-brand-navy text-white border-brand-navy'
                              : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                          )}>
                          {t[0] + t.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {newType === 'SELECT' && (
                    <div>
                      <label htmlFor="cfd-new-options" className="text-xs text-neutral-600 dark:text-neutral-400 block mb-1">Options <span className="text-neutral-400">(comma-separated)</span></label>
                      <input id="cfd-new-options" type="text" value={newOptions} onChange={e => setNewOptions(e.target.value)}
                        placeholder="Option A, Option B, Option C"
                        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:ring-1 focus:ring-brand-navy-tint/50"
                      />
                    </div>
                  )}
                  {saveError && <p className="text-xs text-semantic-danger">{saveError}</p>}
                  <button type="submit" disabled={saving || !newName.trim()}
                    className="w-full py-1.5 rounded-md text-xs font-medium bg-brand-navy text-white hover:bg-brand-navy-tint disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {saving ? 'Creating…' : 'Create & add to card'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
            <span>Saved for your account · applies to all views</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────

function FieldToggle({ label, on, onChange, removable, onRemove }) {
  return (
    <div className={cn(
      'flex items-center justify-between px-2.5 py-1.5 rounded-md border transition-colors',
      'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600',
      'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-500'
    )}
      onClick={onChange}
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange()}
    >
      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate mr-1">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {removable && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="text-neutral-400 hover:text-semantic-danger p-0.5 rounded"
            aria-label={`Remove ${label} field`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
        <div className={cn('w-7 h-4 rounded-full transition-colors flex-shrink-0 relative', on ? 'bg-brand-navy' : 'bg-neutral-300 dark:bg-neutral-600')}>
          <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', on ? 'left-3.5' : 'left-0.5')} />
        </div>
      </div>
    </div>
  );
}
