import { useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { ALL_TYPES, CATEGORIES, resolveTypeIcon } from '@/lib/work-item-types';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { detailFieldsFor, orderByPrefs } from '@/lib/type-detail-fields';
import { cn } from '@/lib/utils';

/**
 * Per-type field configuration for the work item detail surface: toggle visibility and reorder the
 * fields shown for each work-item type. Server-persisted via type_field_prefs (the bulk save replaces
 * a type's prefs). Configurable fields = the type's built-in fields (registry) + workspace custom
 * fields. Used in Settings → Detail Fields.
 */
export default function FieldConfigEditor({ fieldPrefs, customFieldDefs = [], onSave }) {
  const [typeKey, setTypeKey] = useState(ALL_TYPES[0]?.typeKey ?? null);

  const baseFields = [
    ...detailFieldsFor(typeKey),
    ...customFieldDefs.map((fd) => ({ key: `cf_${fd.id}`, label: fd.name, custom: true })),
  ];
  const prefsMap = fieldPrefs?.prefsMapForType?.(typeKey) ?? new Map();
  const ordered = orderByPrefs(baseFields, prefsMap);
  const isVisible = (key) => { const p = prefsMap.get(key); return p ? p.visible !== false : true; };

  // Bulk-save the full ordered list (sortOrder = index, visible preserved unless toggled).
  const save = (list, toggledKey) =>
    onSave(typeKey, list.map((f, i) => ({
      fieldKey: f.key,
      visible: f.key === toggledKey ? !isVisible(f.key) : isVisible(f.key),
      sortOrder: i,
    })));
  const toggle = (key) => save(ordered, key);
  const move = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= ordered.length) return;
    const arr = [...ordered];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    save(arr, null);
  };

  const typeLabel = ALL_TYPES.find((t) => t.typeKey === typeKey)?.label ?? typeKey;

  return (
    <div className="flex gap-6" style={{ minHeight: '520px' }}>
      {/* Type list grouped by category */}
      <div className="w-52 flex-shrink-0 space-y-5">
        {Object.entries(CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-2">{cat.label}</p>
            <div className="space-y-0.5">
              {ALL_TYPES.filter((t) => t.category === catKey).map((t) => {
                const Icon = resolveTypeIcon(t.icon);
                const sel = typeKey === t.typeKey;
                return (
                  <button key={t.typeKey} onClick={() => setTypeKey(t.typeKey)}
                    className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                      sel ? 'bg-brand-navy text-white' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700')}>
                    {Icon && <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', sel ? 'text-white' : 'text-neutral-400')} aria-hidden="true" />}
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Field list for the selected type */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{typeLabel} — detail fields</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 mb-4">
          Toggle which fields appear on the work item detail surface for this type, and drag the order with the arrows.
        </p>
        {ordered.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} title="No configurable fields"
            subtitle="This type has no type-specific fields. Add workspace custom fields to configure them here." />
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-700 overflow-hidden">
            {ordered.map((f, idx) => {
              const visible = isVisible(f.key);
              return (
                <div key={f.key} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800">
                  <div className="flex flex-col -my-1">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up"
                      className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === ordered.length - 1} aria-label="Move down"
                      className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                  <span className={cn('flex-1 text-sm truncate', visible ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 line-through')}>
                    {f.label}
                    {f.custom && <span className="ml-1.5 text-xs bg-brand-navy/10 text-brand-navy dark:text-brand-navy-tint px-1.5 py-0.5 rounded">custom</span>}
                  </span>
                  <button onClick={() => toggle(f.key)} aria-label={visible ? `Hide ${f.label}` : `Show ${f.label}`}
                    className={cn('p-1', visible ? 'text-neutral-500 hover:text-brand-navy' : 'text-neutral-300 hover:text-neutral-500')}>
                    {visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
