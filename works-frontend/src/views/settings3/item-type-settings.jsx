import { X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { TypeIcon } from '@/components/works/work-item-type';
import { TYPE_ICON_SET, TYPE_ICON_KEYS, ALL_TYPES, CATEGORIES, resolveTypeIcon } from '@/lib/work-item-types';

/**
 * ItemTypeSettings — the "Item Types" sub-tab: built-in work item types (grouped
 * by category) plus workspace custom types (create + delete).
 * Pure rendering shell — all data + handlers come from props.
 */
export default function ItemTypeSettings({
  workItemTypes,
  showTypeForm,
  newTypeForm,
  setShowTypeForm,
  setNewTypeForm,
  createWorkItemType,
  fetchWorkItemTypes,
  api,
}) {
  return (
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
                    <Button unstyled key={key} type="button" onClick={() => setNewTypeForm(f => ({ ...f, icon: key }))}
                      aria-label={key} aria-pressed={sel}
                      className={`p-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${sel ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy/40'}`}>
                      <Ic className="h-4 w-4" aria-hidden="true" />
                    </Button>
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
                  <Button unstyled onClick={() => api.send(`/work-item-types/${t.id}`, { method: 'DELETE' }).then(() => fetchWorkItemTypes())}
                    className="opacity-0 group-hover:opacity-100 text-semantic-danger text-xs transition-opacity absolute top-2 right-2" aria-label="Remove"><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
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
  );
}
