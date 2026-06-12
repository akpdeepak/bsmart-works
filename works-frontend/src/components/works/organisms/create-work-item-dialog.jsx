import * as React from 'react';
import { ArrowLeft, Check, Package, Paperclip } from 'lucide-react';
import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { cn } from '@/lib/utils';
import { ALL_TYPES, CATEGORIES, TYPES_BY_KEY, resolveTypeIcon } from '@/lib/work-item-types';
import { getEffectiveSchema, defaultFormData } from '@/lib/type-field-schemas';

// ── Helpers ───────────────────────────────────────────────────────────────────

function typesByCategory(cat) {
  return ALL_TYPES.filter(t => t.category === cat);
}

// ── Step 1 — Category Picker ─────────────────────────────────────────────────

function CategoryStep({ onSelect }) {
  const cats = Object.entries(CATEGORIES);
  const catTypeCount = Object.fromEntries(
    Object.keys(CATEGORIES).map(k => [k, ALL_TYPES.filter(t => t.category === k).length])
  );

  const catIcons = {
    DELIVERY: '🏗',
    RAID: '⚠️',
    SERVICE: '🛠',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Select the category that best describes what you are creating.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {cats.map(([key, cat]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              'group flex flex-col items-start gap-2 rounded-xl border-2 border-neutral-200 p-5',
              'text-left transition-all duration-fast',
              'hover:border-brand-navy hover:bg-neutral-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2'
            )}
          >
            <span className="text-2xl" aria-hidden="true">{catIcons[key]}</span>
            <div>
              <p className="font-semibold text-neutral-900 group-hover:text-brand-navy">
                {cat.label}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {catTypeCount[key]} type{catTypeCount[key] !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {cat.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2 — Type Picker ─────────────────────────────────────────────────────

function TypeStep({ category, onSelect, onBack }) {
  const types = typesByCategory(category);
  const cat = CATEGORIES[category];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to categories"
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="text-sm text-neutral-500">
          {cat.label} — choose a type
        </span>
      </div>

      <div className={cn(
        'grid gap-3',
        category === 'DELIVERY' ? 'grid-cols-3' : 'grid-cols-2'
      )}>
        {types.map(t => {
          const Icon = resolveTypeIcon(t.icon) ?? Package;
          return (
            <button
              key={t.typeKey}
              type="button"
              onClick={() => onSelect(t.typeKey)}
              className={cn(
                'group flex items-start gap-3 rounded-lg border border-neutral-200 p-4 text-left',
                'transition-all duration-fast',
                'hover:border-brand-navy hover:bg-neutral-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2'
              )}
            >
              <span className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white',
                t.color
              )}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-sm text-neutral-900 group-hover:text-brand-navy">
                  {t.label}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                  {t.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3 — Form ─────────────────────────────────────────────────────────────

function FormField({ field, value, onChange, users, workItems }) {
  const handleChange = v => onChange(field.key, v);

  if (field.type === 'text') {
    return (
      <Field label={field.required ? `${field.label} *` : field.label}>
        <input
          type="text"
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input"
          placeholder={field.placeholder ?? ''}
          required={field.required}
        />
      </Field>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Field label={field.label}>
        <textarea
          rows={3}
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input resize-none"
          placeholder={field.placeholder ?? ''}
        />
      </Field>
    );
  }

  if (field.type === 'select') {
    return (
      <Field label={field.required ? `${field.label} *` : field.label}>
        <select
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input"
          required={field.required}
        >
          {!field.required && <option value="">— select —</option>}
          {(field.options ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === 'user') {
    return (
      <Field label={field.required ? `${field.label} *` : field.label}>
        <select
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input"
        >
          <option value="">— unassigned —</option>
          {(users ?? []).map(u => (
            <option key={u.id} value={u.id}>{u.fullName ?? u.name ?? u.email}</option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === 'date') {
    return (
      <Field label={field.label}>
        <input
          type="date"
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input"
        />
      </Field>
    );
  }

  if (field.type === 'number') {
    return (
      <Field label={field.label}>
        <input
          type="number"
          min={0}
          value={value ?? ''}
          onChange={e => handleChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="input"
          placeholder="0"
        />
      </Field>
    );
  }

  if (field.type === 'item-picker') {
    // Filter work items by validParents if specified; null means all items
    const eligible = field.validParents == null
      ? (workItems ?? [])
      : (workItems ?? []).filter(i => field.validParents.includes(i.type));
    return (
      <Field label={field.required ? `${field.label} *` : field.label}>
        <select
          value={value ?? ''}
          onChange={e => handleChange(e.target.value || null)}
          className="input"
        >
          <option value="">— none —</option>
          {eligible.map(i => (
            <option key={i.id} value={i.id}>
              {i.autoId ? `${i.autoId} — ` : ''}{i.title}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === 'tags') {
    return (
      <Field label="Tags">
        <input
          type="text"
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          className="input"
          placeholder="frontend, urgent (comma separated)"
        />
      </Field>
    );
  }

  return null;
}

const RAID_TYPES = ['RISK', 'ISSUE', 'ASSUMPTION', 'DEPENDENCY'];

function FormStep({ typeKey, formData, onChange, onBack, onSubmit, projects, users, workItems, error }) {
  const typeDef = TYPES_BY_KEY[typeKey];
  const schema = getEffectiveSchema(typeKey);
  const isRaid = RAID_TYPES.includes(typeKey);

  // Split fields into two columns for readability (text/select → 2-col grid;
  // textarea → always full width)
  const colFields  = schema.filter(f => !['textarea'].includes(f.type));
  const wideFields = schema.filter(f =>  ['textarea'].includes(f.type));

  const isValid = schema
    .filter(f => f.required)
    .every(f => {
      const v = formData[f.key];
      return v !== undefined && v !== null && v !== '';
    });

  return (
    <div className="space-y-4">
      {/* Type header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to type selection"
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-white',
          typeDef?.color ?? 'bg-neutral-600'
        )}>
          {React.createElement(resolveTypeIcon(typeDef?.icon) ?? Package, { 'aria-hidden': 'true', className: 'h-3.5 w-3.5' })}
        </span>
        <span className="font-semibold text-neutral-900">{typeDef?.label}</span>
        <span className="ml-auto text-xs text-neutral-400">{typeDef?.autoIdPrefix}-XXXX</span>
      </div>

      {error && (
        <div className="rounded-md bg-semantic-danger-surface px-3 py-2 text-sm text-semantic-danger">
          {error}
        </div>
      )}

      {/* Container / product / team selector — type-aware
           INCIDENT        → Affected Product (required, no team)
           IT_SR           → Related Product only (optional, no team)
           HR_SR           → nothing (no team, no product)
           RAID types      → Affected Team (optional, fills projectId)
           Delivery types  → Team (required)                              */}
      {typeKey === 'INCIDENT' ? (
        <Field label="Affected Product *">
          <select
            value={formData.productId ?? ''}
            onChange={e => onChange('productId', e.target.value)}
            className="input"
            required
          >
            <option value="">— select product —</option>
            {(workItems ?? []).filter(i => i.type === 'PRODUCT').map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
      ) : typeKey === 'IT_SERVICE_REQUEST' ? (
        <Field label="Related Product">
          <select
            value={formData.productId ?? ''}
            onChange={e => onChange('productId', e.target.value)}
            className="input"
          >
            <option value="">— none —</option>
            {(workItems ?? []).filter(i => i.type === 'PRODUCT').map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
      ) : typeKey !== 'HR_SERVICE_REQUEST' && (
        <Field label={isRaid ? 'Affected Team' : 'Team *'}>
          <select
            value={formData.projectId ?? ''}
            onChange={e => onChange('projectId', e.target.value)}
            className="input"
            required={!isRaid}
          >
            <option value="">— select team —</option>
            {(projects ?? []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Two-column grid for compact fields */}
      <div className="grid grid-cols-2 gap-3">
        {colFields.map(field => (
          <div
            key={field.key}
            className={field.key === 'title' ? 'col-span-2' : 'col-span-1'}
          >
            <FormField
              field={field}
              value={formData[field.key]}
              onChange={onChange}
              users={users}
              workItems={workItems}
            />
          </div>
        ))}
      </div>

      {/* Full-width textarea fields */}
      {wideFields.map(field => (
        <FormField
          key={field.key}
          field={field}
          value={formData[field.key]}
          onChange={onChange}
          users={users}
          workItems={workItems}
        />
      ))}

      {/* Attachments — universal across all types */}
      <div>
        <p className="mb-1 text-xs font-medium text-neutral-600">Attachments</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 p-3 text-sm text-neutral-500 transition-colors duration-fast hover:border-brand-navy hover:text-brand-navy">
          <Paperclip aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Click to attach files</span>
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={e => onChange('attachments', Array.from(e.target.files))}
          />
        </label>
        {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {formData.attachments.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                <Paperclip aria-hidden="true" className="h-3 w-3 shrink-0" />
                {f.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          variant="action"
          onClick={onSubmit}
          disabled={!isValid}
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Create {typeDef?.label}
        </Button>
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
// Two-layer design: the outer shell renders nothing when closed (so inner state
// resets automatically on re-open — no useEffect + setState needed).

function CreateWorkItemDialogInner({ onClose, onSubmit, projects, users, workItems }) {
  const [step, setStep] = React.useState(1);
  const [category, setCategory] = React.useState(null);
  const [typeKey, setTypeKey] = React.useState(null);
  const [formData, setFormData] = React.useState({});
  const [error, setError] = React.useState('');
  // No reset useEffect needed — the outer shell unmounts this component when isOpen
  // goes false, so all state resets naturally when it remounts on next open.

  const handleCategorySelect = cat => {
    setCategory(cat);
    setStep(2);
  };

  const handleTypeSelect = key => {
    setTypeKey(key);
    setFormData(defaultFormData(key));
    setStep(3);
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const schema = getEffectiveSchema(typeKey);
    const missing = schema.filter(f => f.required && !formData[f.key]);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setError('');

    // Convert comma-separated tags string to array
    const tags = typeof formData.tags === 'string'
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (formData.tags ?? []);

    onSubmit({
      ...formData,
      type: typeKey,
      tags,
      priority: formData.priority ?? 'MEDIUM',
      projectId: formData.projectId ?? (projects?.[0]?.id ?? 'PROJ-001'),
    });
    onClose();
  };

  const stepTitles = {
    1: 'Create Work Item',
    2: 'Create Work Item',
    3: 'New ' + (typeKey ? (TYPES_BY_KEY[typeKey]?.label ?? 'Work Item') : 'Work Item'),
  };

  return (
    <Modal
      title={stepTitles[step]}
      onClose={onClose}
      size="xl"
    >
      {step === 1 && (
        <CategoryStep onSelect={handleCategorySelect} />
      )}
      {step === 2 && category && (
        <TypeStep
          category={category}
          onSelect={handleTypeSelect}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && typeKey && (
        <FormStep
          typeKey={typeKey}
          formData={formData}
          onChange={handleFieldChange}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          projects={projects}
          users={users}
          workItems={workItems}
          error={error}
        />
      )}
    </Modal>
  );
}

/** Public export — renders nothing when closed so inner state resets on each open. */
export function CreateWorkItemDialog({ isOpen, ...rest }) {
  if (!isOpen) return null;
  return <CreateWorkItemDialogInner {...rest} />;
}
