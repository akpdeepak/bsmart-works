import { useState, useEffect, useId } from 'react';
import {
  GripVertical, X, ChevronDown, ChevronUp, Eye, EyeOff,
  Type, AlignLeft, Hash, Calendar, List, CheckSquare,
  Paperclip, Heading, Plus, Trash2, Save,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { api } from '@/lib/apiClient';

// ── Field type palette definitions ────────────────────────────────────────────
const FIELD_TYPES = [
  { type: 'text',     label: 'Text',          Icon: Type },
  { type: 'textarea', label: 'Long text',      Icon: AlignLeft },
  { type: 'number',   label: 'Number',         Icon: Hash },
  { type: 'date',     label: 'Date',           Icon: Calendar },
  { type: 'dropdown', label: 'Dropdown',       Icon: List },
  { type: 'checkbox', label: 'Checkbox',       Icon: CheckSquare },
  { type: 'file',     label: 'File upload',    Icon: Paperclip },
  { type: 'heading',  label: 'Section heading', Icon: Heading },
];

// Generates a stable-enough local id for new fields before they hit the server.
function newId() {
  return `field-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyField(type) {
  return {
    id: newId(),
    type,
    label: FIELD_TYPES.find((t) => t.type === type)?.label ?? 'Field',
    placeholder: '',
    required: false,
    helpText: '',
    options: type === 'dropdown' ? ['Option 1'] : [],
    showIf: null,
  };
}

// ── Palette (left panel) ───────────────────────────────────────────────────────
function FieldPalette({ onAdd }) {
  return (
    <aside
      aria-label="Field type palette"
      className="w-52 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4 flex flex-col gap-2"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
        Field types
      </p>
      {FIELD_TYPES.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onAdd(type)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors text-left"
        >
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        </button>
      ))}
    </aside>
  );
}

// ── Property editor (right panel) ─────────────────────────────────────────────
function PropertyEditor({ field, allFields, onChange }) {
  const labelId = useId();

  if (!field) {
    return (
      <aside className="w-72 shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-6 flex items-center justify-center">
        <p className="text-sm text-neutral-400">Select a field to edit its properties.</p>
      </aside>
    );
  }

  const update = (patch) => onChange({ ...field, ...patch });

  return (
    <aside
      aria-label="Field properties"
      className="w-72 shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-5 overflow-y-auto"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-4">
        Field properties
      </p>

      <div className="space-y-4">
        {/* Label */}
        {field.type !== 'heading' && (
          <div>
            <label htmlFor={`${labelId}-label`} className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Label
            </label>
            <input
              id={`${labelId}-label`}
              type="text"
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          </div>
        )}

        {/* Heading text */}
        {field.type === 'heading' && (
          <div>
            <label htmlFor={`${labelId}-heading`} className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Heading text
            </label>
            <input
              id={`${labelId}-heading`}
              type="text"
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          </div>
        )}

        {/* Placeholder */}
        {['text', 'textarea', 'number'].includes(field.type) && (
          <div>
            <label htmlFor={`${labelId}-placeholder`} className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Placeholder
            </label>
            <input
              id={`${labelId}-placeholder`}
              type="text"
              value={field.placeholder}
              onChange={(e) => update({ placeholder: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          </div>
        )}

        {/* Help text */}
        {field.type !== 'heading' && (
          <div>
            <label htmlFor={`${labelId}-help`} className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Help text
            </label>
            <input
              id={`${labelId}-help`}
              type="text"
              value={field.helpText}
              onChange={(e) => update({ helpText: e.target.value })}
              placeholder="Shown beneath the field"
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          </div>
        )}

        {/* Required toggle */}
        {!['heading'].includes(field.type) && (
          <div className="flex items-center gap-3">
            <input
              id={`${labelId}-required`}
              type="checkbox"
              checked={field.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="w-4 h-4 accent-brand-navy"
            />
            <label htmlFor={`${labelId}-required`} className="text-sm text-neutral-700 dark:text-neutral-200">
              Required field
            </label>
          </div>
        )}

        {/* Dropdown options */}
        {field.type === 'dropdown' && (
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Options
            </p>
            <div className="space-y-1.5">
              {field.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    aria-label={`Option ${i + 1}`}
                    onChange={(e) => {
                      const next = [...field.options];
                      next[i] = e.target.value;
                      update({ options: next });
                    }}
                    className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  />
                  <button
                    type="button"
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => update({ options: field.options.filter((_, j) => j !== i) })}
                    className="text-neutral-400 hover:text-semantic-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update({ options: [...field.options, `Option ${field.options.length + 1}`] })}
                className="flex items-center gap-1.5 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add option
              </button>
            </div>
          </div>
        )}

        {/* Conditional logic (Show if) */}
        {field.type !== 'heading' && allFields.filter((f) => f.id !== field.id && f.type === 'dropdown').length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Show if
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id={`${labelId}-showif-toggle`}
                  type="checkbox"
                  checked={!!field.showIf}
                  onChange={(e) =>
                    update({ showIf: e.target.checked ? { fieldId: '', value: '' } : null })
                  }
                  className="w-4 h-4 accent-brand-navy"
                />
                <label htmlFor={`${labelId}-showif-toggle`} className="text-sm text-neutral-700 dark:text-neutral-200">
                  Enable conditional display
                </label>
              </div>
              {field.showIf && (
                <>
                  <div>
                    <label htmlFor={`${labelId}-showif-field`} className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      When field
                    </label>
                    <select
                      id={`${labelId}-showif-field`}
                      value={field.showIf.fieldId}
                      onChange={(e) => update({ showIf: { ...field.showIf, fieldId: e.target.value } })}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                    >
                      <option value="">— pick a field —</option>
                      {allFields
                        .filter((f) => f.id !== field.id && f.type === 'dropdown')
                        .map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${labelId}-showif-value`} className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Equals
                    </label>
                    {(() => {
                      const src = allFields.find((f) => f.id === field.showIf.fieldId);
                      return src?.options?.length > 0 ? (
                        <select
                          id={`${labelId}-showif-value`}
                          value={field.showIf.value}
                          onChange={(e) => update({ showIf: { ...field.showIf, value: e.target.value } })}
                          className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        >
                          <option value="">— pick a value —</option>
                          {src.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          id={`${labelId}-showif-value`}
                          type="text"
                          value={field.showIf.value}
                          onChange={(e) => update({ showIf: { ...field.showIf, value: e.target.value } })}
                          placeholder="e.g. Yes"
                          className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        />
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Preview renderer ──────────────────────────────────────────────────────────
function FormPreview({ fields }) {
  // Values are tracked so dropdown changes drive conditional-field visibility in preview.
  const [values, setValues] = useState({});

  const isVisible = (f) => {
    if (!f.showIf || !f.showIf.fieldId) return true;
    return values[f.showIf.fieldId] === f.showIf.value;
  };

  return (
    <div
      role="region"
      aria-label="Form preview"
      className="max-w-xl mx-auto space-y-5 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-6">
        Preview — read-only
      </p>
      {fields.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-8">No fields added yet.</p>
      )}
      {fields.filter(isVisible).map((f) => (
        <div key={f.id}>
          {f.type === 'heading' ? (
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-2">
              {f.label}
            </h3>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                {f.label}
                {f.required && <span className="ml-1 text-semantic-danger" aria-hidden="true">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  disabled
                  rows={3}
                  placeholder={f.placeholder}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 p-3 text-sm text-neutral-400 dark:text-neutral-500"
                />
              ) : f.type === 'dropdown' ? (
                /* Dropdowns are interactive in preview so conditional-field logic works */
                <select
                  value={values[f.id] || ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  className="w-full h-10 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 text-sm text-neutral-700 dark:text-neutral-200"
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <span className="text-sm text-neutral-400 dark:text-neutral-500">{f.label}</span>
                </div>
              ) : f.type === 'file' ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700">
                  <Paperclip className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  <span className="text-sm text-neutral-400 dark:text-neutral-500">Choose file…</span>
                </div>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  disabled
                  placeholder={f.placeholder}
                  className="w-full h-10 rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 px-3 text-sm text-neutral-400 dark:text-neutral-500"
                />
              )}
              {f.helpText && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{f.helpText}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Canvas field card ──────────────────────────────────────────────────────────
function FieldCard({ field, index, total, isSelected, onSelect, onRemove, onMoveUp, onMoveDown, dragHandleProps }) {
  const typeInfo = FIELD_TYPES.find((t) => t.type === field.type);
  const Icon = typeInfo?.Icon ?? Type;

  return (
    <article
      aria-label={`Field: ${field.label}`}
      className={`group flex items-center gap-3 bg-white dark:bg-neutral-800 border rounded-xl px-4 py-3 transition-colors ${
        isSelected
          ? 'border-brand-navy ring-2 ring-brand-navy/20'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-brand-navy/40'
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        className="text-neutral-300 dark:text-neutral-600 cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Clickable label area — selection lives here (article itself is non-interactive) */}
      <button
        type="button"
        aria-label={`Select field ${field.label}`}
        onClick={onSelect}
        className="flex items-center gap-2 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
      >
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{field.label}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{field.type}{field.required ? ' · required' : ''}</p>
        </div>
      </button>

      {/* Reorder buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label="Move field up"
          disabled={index === 0}
          onClick={onMoveUp}
          className="p-1 text-neutral-400 hover:text-brand-navy disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded transition-colors"
        >
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Move field down"
          disabled={index === total - 1}
          onClick={onMoveDown}
          className="p-1 text-neutral-400 hover:text-brand-navy disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Remove */}
        <button
          type="button"
          aria-label="Remove field"
          onClick={onRemove}
          className="p-1 text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
/**
 * PortalFormDesigner — visual drag-and-drop form designer for workspace admins.
 *
 * Props:
 *   requestTypeId  string  — the ID of the RequestType whose form_schema is being designed
 *   onClose        fn      — called when the designer should be dismissed (e.g. close modal)
 *   onSaved        fn?     — called after a successful save with the new schema
 */
export function PortalFormDesigner({ requestTypeId, onClose, onSaved }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [saveError, setSaveError] = useState('');

  // HTML5 drag-and-drop state — both drive the opacity highlight so both are useState.
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Load existing schema on mount. `loading` is initialised to true so no setState needed here.
  useEffect(() => {
    api.send(`/service/request-types/${requestTypeId}`)
      .then((data) => {
        const raw = data.formSchema ?? data.form_schema;
        let parsed = [];
        if (Array.isArray(raw)) parsed = raw;
        else if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw); } catch { parsed = []; }
        }
        // Ensure each field has a stable id
        setFields(parsed.map((f) => ({ ...f, id: f.id || newId() })));
      })
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [requestTypeId]);

  // ── Field operations ─────────────────────────────────────────────────────────

  function addField(type) {
    const f = emptyField(type);
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
  }

  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateField(updated) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function moveField(from, to) {
    if (to < 0 || to >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setFields(next);
  }

  // ── HTML5 drag-and-drop handlers ─────────────────────────────────────────────

  function handleDragStart(e, index) {
    setDragIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(index);
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault();
    // Use the dataTransfer value as source of truth since state updates may be async
    const fromStr = e.dataTransfer.getData('text/plain');
    const from = fromStr !== '' ? Number(fromStr) : dragIdx;
    if (from == null || from === dropIndex) { setDragIdx(null); setDragOverIdx(null); return; }
    moveField(from, dropIndex);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      // Produce clean schema (strip internal-only ids that the backend already knows)
      const schema = fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        helpText: f.helpText,
        options: f.options,
        showIf: f.showIf,
      }));
      await api.send(`/service/request-types/${requestTypeId}`, {
        method: 'PUT',
        body: { formSchema: schema },
      });
      onSaved?.(schema);
      onClose?.();
    } catch (err) {
      setSaveError(err.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      role="region"
      aria-label="Portal form designer"
      className="flex flex-col h-full"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0">
        <div>
          <p className="text-sm font-bold text-brand-navy dark:text-white">Form Designer</p>
          <p className="text-xs text-neutral-500">{fields.length} field{fields.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-navy dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-2 py-1.5 transition-colors"
            aria-pressed={mode === 'preview'}
          >
            {mode === 'preview'
              ? <><EyeOff className="h-4 w-4" aria-hidden="true" /> Edit</>
              : <><Eye className="h-4 w-4" aria-hidden="true" /> Preview</>
            }
          </button>

          {mode === 'edit' && (
            <Button
              variant="action"
              size="sm"
              loading={saving}
              onClick={handleSave}
              leftIcon={!saving && <Save className="h-4 w-4" aria-hidden="true" />}
            >
              Save
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close designer</span>
          </Button>
        </div>
      </div>

      {saveError && (
        <div role="alert" className="px-5 py-2.5 text-sm text-semantic-danger bg-semantic-danger-surface border-b border-semantic-danger/20">
          {saveError}
        </div>
      )}

      {loading ? (
        /* Skeleton while schema loads */
        <div role="region" className="flex-1 p-6 space-y-3" aria-busy="true" aria-label="Loading form schema">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : mode === 'preview' ? (
        /* Preview mode */
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-900">
          <FormPreview fields={fields} />
        </div>
      ) : (
        /* Edit mode — three-panel layout */
        <div className="flex flex-1 overflow-hidden">
          {/* Left: palette */}
          <FieldPalette onAdd={addField} />

          {/* Center: canvas */}
          <div
            role="list"
            aria-label="Form canvas"
            className="flex-1 overflow-y-auto p-5 space-y-2 bg-neutral-50 dark:bg-neutral-900"
          >
            {fields.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                <p className="text-sm font-medium text-neutral-500">No fields yet</p>
                <p className="text-xs text-neutral-400 mt-1">Pick a field type from the left panel to get started.</p>
              </div>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                role="listitem"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                data-testid={`canvas-field-${field.id}`}
                className={`transition-opacity ${
                  dragOverIdx === index && dragIdx !== index
                    ? 'opacity-50'
                    : 'opacity-100'
                }`}
              >
                <FieldCard
                  field={field}
                  index={index}
                  total={fields.length}
                  isSelected={selectedId === field.id}
                  onSelect={() => setSelectedId((id) => (id === field.id ? null : field.id))}
                  onRemove={() => removeField(field.id)}
                  onMoveUp={() => moveField(index, index - 1)}
                  onMoveDown={() => moveField(index, index + 1)}
                  dragHandleProps={{
                    onDragStart: (e) => handleDragStart(e, index),
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right: property editor */}
          <PropertyEditor
            field={selectedField}
            allFields={fields}
            onChange={updateField}
          />
        </div>
      )}
    </div>
  );
}

export default PortalFormDesigner;
