import { useState, Fragment } from 'react';
import { CornerDownRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { TypeBadge } from '@/components/works/work-item-type';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse, lapseProgress } from '@/lib/status-lapse';
import { WorkItemStatusTimeline } from '@/components/works/organisms/work-item-status-timeline';
import { AcceptanceCriteria } from '@/components/works/organisms/acceptance-criteria';
import { detailFieldsFor, orderByPrefs, SECTION_LABELS } from '@/lib/type-detail-fields';
import { aiClient, anyCapabilityEnabled } from '@/lib/ai';
import { onPressKey } from '@/lib/utils';
import { RichTextEditor } from './rich-text-editor';

export function DetailsTab({
  selectedItem, setSelectedItem, handleUpdateItem,
  tagInput, setTagInput, workItems, itemChildren, users,
  aiCapabilities, aiLoading, aiAction, activeWorkspaceId,
  fieldDefs, fieldValues, setFieldValues, saveFieldValue,
  statusMetrics, statusResolver,
  fieldPrefs, onToggleFieldPref,
}) {
  // "Configure fields" edit mode — reveals per-field visibility checkboxes.
  const [editFields, setEditFields] = useState(false);

  // Per-type status resolution + time-in-status lapse (S3/S4).
  const typeStatuses = statusResolver?.statusesForType?.(selectedItem.type) ?? [];
  const statusMeta   = statusResolver?.metaFor?.(selectedItem.type, selectedItem.status) ?? null;
  const statusCat    = statusResolver ? statusResolver.categoryOf(selectedItem.type, selectedItem.status) : statusToCategory(selectedItem.status);
  const lapse        = computeLapse(selectedItem.statusChangedAt, statusMeta);
  const isDoneCat    = statusCat === 'done';
  // Status names to offer in the dropdown — the type's workflow, plus the current value if it's
  // a legacy status not present in the workflow (so it still displays).
  const statusOptions = typeStatuses.length
    ? (typeStatuses.some(s => s.name === selectedItem.status)
        ? typeStatuses.map(s => s.name)
        : [selectedItem.status, ...typeStatuses.map(s => s.name)])
    : ['Todo', 'In Progress', 'Done'].includes(selectedItem.status)
      ? ['Todo', 'In Progress', 'Done']
      : [selectedItem.status, 'Todo', 'In Progress', 'Done'];

  return (
    <>
      <input className="w-full text-lg font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none border-b border-transparent focus:border-neutral-200 dark:focus:border-neutral-600 pb-1 bg-transparent"
        value={selectedItem.title}
        onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
        onBlur={() => handleUpdateItem(selectedItem)} />

      {/* Status + time-in-status lapse summary (S4/S5) */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 pl-2.5 pr-1 py-1">
            <span
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0${statusMeta?.color ? '' : ' bg-neutral-300'}`}
              style={statusMeta?.color ? { backgroundColor: statusMeta.color } : undefined}
              aria-hidden="true"
            />
            <select aria-label="Status" value={selectedItem.status}
              onChange={e => { const u = { ...selectedItem, status: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
              className="text-sm font-medium bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded cursor-pointer text-neutral-900 dark:text-neutral-100">
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </span>
          <StatusBadge category={statusCat}>{statusCat === 'in_progress' ? 'In Progress' : statusCat === 'done' ? 'Done' : 'To Do'}</StatusBadge>
          {!isDoneCat && <LapseBadge lapse={lapse} />}
          {isDoneCat && lapse.state !== 'none' && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Closed</span>
          )}
        </div>

        {/* Breach-budget progress (only when this status carries a lapse clock) */}
        {!isDoneCat && lapse.breachSec != null && (
          <div>
            <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${lapse.state === 'breached' ? 'bg-semantic-danger' : lapse.state === 'at_risk' ? 'bg-semantic-warning' : 'bg-semantic-success'}`}
                style={{ width: `${Math.round((lapseProgress(lapse) || 0) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{Math.round((lapseProgress(lapse) || 0) * 100)}% of breach budget elapsed</p>
          </div>
        )}

        {/* Time-in-each-status journey bar (reuses the projection from the event log) */}
        {statusMetrics?.durations?.length > 0 && (
          <WorkItemStatusTimeline metrics={statusMetrics} />
        )}
      </div>

      {/* Two-column body: content-first in the DOM (and on mobile), properties on the right
          on desktop — flex-col-reverse + md:flex-row-reverse keeps the content lead without
          moving it ahead of the metadata in source order. */}
      <div className="flex flex-col-reverse md:flex-row-reverse gap-5">
        <aside className="md:w-60 flex-shrink-0 space-y-3">

      {/* SLA mini-card — surfaces the existing SLA target/breach signal on the detail surface */}
      {selectedItem.slaTarget && (
        <div className={`rounded-lg border p-3 ${selectedItem.slaBreachFlag ? 'border-semantic-danger/40 bg-semantic-danger-surface' : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${selectedItem.slaBreachFlag ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'}`}>
              {selectedItem.slaBreachFlag ? 'SLA breached' : 'SLA target'}
            </span>
            <span className="text-xs text-neutral-700 dark:text-neutral-300">{new Date(selectedItem.slaTarget).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Properties</p>
        <div>
          <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Type</span>
          <div className="flex items-center gap-1.5" title="Type can't be changed after creation — its fields vary by type">
            <TypeBadge type={selectedItem.type} />
          </div>
        </div>
        <div>
          <label htmlFor="detail-priority" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Priority</label>
          <select id="detail-priority" value={selectedItem.priority || 'MEDIUM'}
            onChange={e => { const u = { ...selectedItem, priority: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
            className="input">
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="detail-assignee" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Assignee</label>
          <select id="detail-assignee" value={selectedItem.assigneeId || ''}
            onChange={e => { const u = { ...selectedItem, assigneeId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
            className="input">
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="detail-reporter" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Reporter</label>
          <select id="detail-reporter" value={selectedItem.reporterId || ''}
            onChange={e => { const u = { ...selectedItem, reporterId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
            className="input">
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="detail-due-date" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Due Date</label>
          <input id="detail-due-date" type="date" value={selectedItem.dueDate || ''}
            onChange={e => { const u = { ...selectedItem, dueDate: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
            className="input" />
        </div>
        <div>
          <label htmlFor="detail-story-points" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Story Points</label>
          <input id="detail-story-points" type="number" min={0} max={100} value={selectedItem.storyPoints || 0}
            onChange={e => { const u = { ...selectedItem, storyPoints: parseInt(e.target.value) || 0 }; setSelectedItem(u); handleUpdateItem(u); }}
            className="input" />
        </div>
      </div>

      {/* Parent shown read-only here; set/clear it (and children) in the Links tab. */}
      {selectedItem.parentId && (() => {
        const parent = workItems.find(i => i.id === selectedItem.parentId);
        return (
          <div>
            <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Parent</span>
            {parent ? (
              <button type="button" onClick={() => setSelectedItem(parent)}
                className="flex items-center gap-1.5 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded min-w-0"
                aria-label={`Navigate to parent: ${parent.title}`}>
                <TypeBadge type={parent.type} compact /><span className="truncate">{parent.autoId || parent.id} · {parent.title}</span>
              </button>
            ) : <span className="text-xs text-neutral-500 font-mono">{selectedItem.parentId}</span>}
          </div>
        );
      })()}

      {/* sub-items rendered in the main content column below */}

      <div>
        <label htmlFor="detail-tags" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Tags</label>
        <input id="detail-tags" type="text" value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onBlur={() => {
            const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
            const updated = { ...selectedItem, tags };
            setSelectedItem(updated);
            handleUpdateItem(updated);
          }}
          placeholder="frontend, urgent, api"
          className="input" />
      </div>

        </aside>

        {/* MAIN content column */}
        <div className="flex-1 min-w-0 space-y-4">
      <div>
        <label htmlFor="detail-description" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Description</label>
        <RichTextEditor
          id="detail-description"
          value={selectedItem.description || ''}
          onChange={val => setSelectedItem({ ...selectedItem, description: val })}
          onBlur={() => handleUpdateItem(selectedItem)}
          placeholder="Add a description... (supports **bold**, *italic*, `code`, - bullets)"
        />
      </div>

      <div>
        <AcceptanceCriteria
          value={selectedItem.acceptanceCriteria || ''}
          onSave={val => { const u = { ...selectedItem, acceptanceCriteria: val }; setSelectedItem(u); handleUpdateItem(u); }}
        />
      </div>

      {/* TYPE-SPECIFIC FIELDS */}
      {(() => {
        const t = (selectedItem.type || '').toUpperCase();
        const TYPE_SPECIFIC = new Set(['BUG','RISK','ISSUE','ASSUMPTION','DEPENDENCY','INCIDENT','HR_SERVICE_REQUEST','IT_SERVICE_REQUEST']);
        if (!TYPE_SPECIFIC.has(t)) return null;

        const upd = patch => { const u = { ...selectedItem, ...patch }; setSelectedItem(u); handleUpdateItem(u); };
        const vis = (fk) => !fieldPrefs || fieldPrefs.isVisible(t, fk);
        // Wrap a field: hide when toggled off (unless in "Configure fields" mode, where each
        // field gets a visibility checkbox).
        const field = (fk, node) => {
          const visible = vis(fk);
          if (!visible && !editFields) return null;
          if (!editFields) return node;
          return (
            <div key={fk} className="col-span-2 flex items-start gap-2">
              <input type="checkbox" checked={visible} aria-label={`Show ${fk}`}
                onChange={() => onToggleFieldPref?.(t, fk, !visible)} className="mt-2 accent-brand-navy flex-shrink-0" />
              <div className={`flex-1 min-w-0 ${visible ? '' : 'opacity-50'}`}>{node}</div>
            </div>
          );
        };
        const tf = (label, fk, rows = 2) => field(fk, (
          <div className="col-span-2">
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
            <textarea rows={rows} className="input resize-none"
              value={selectedItem[fk] || ''}
              onChange={e => setSelectedItem({ ...selectedItem, [fk]: e.target.value })}
              onBlur={e => { const u = { ...selectedItem, [fk]: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }} />
          </div>
        ));
        const sf = (label, fk, opts) => field(fk, (
          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
            <select className="input" value={selectedItem[fk] || ''} onChange={e => upd({ [fk]: e.target.value || null })}>
              <option value="">— select —</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ));
        const nf = (label, fk, placeholder = '') => field(fk, (
          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
            <input type="text" className="input" placeholder={placeholder}
              value={selectedItem[fk] || ''}
              onChange={e => setSelectedItem({ ...selectedItem, [fk]: e.target.value })}
              onBlur={e => { const u = { ...selectedItem, [fk]: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }} />
          </div>
        ));
        const df = (label, fk) => field(fk, (
          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
            <input type="date" className="input" value={selectedItem[fk] || ''} onChange={e => upd({ [fk]: e.target.value || null })} />
          </div>
        ));
        const uf = (label, fk) => field(fk, (
          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
            <select className="input" value={selectedItem[fk] || ''} onChange={e => upd({ [fk]: e.target.value || null })}>
              <option value="">— unassigned —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        ));

        // Render the type's fields from the registry, ordered by saved prefs, gated by the
        // helpers (visibility + edit-mode checkbox). Replaces the old hardcoded per-type JSX.
        const descriptors = orderByPrefs(detailFieldsFor(t), fieldPrefs?.prefsMapForType?.(t));
        const renderDescriptor = (d) => {
          if (d.kind === 'select')   return sf(d.label, d.key, d.options || []);
          if (d.kind === 'textarea') return tf(d.label, d.key, d.rows || 2);
          if (d.kind === 'text')     return nf(d.label, d.key, d.placeholder || '');
          if (d.kind === 'date')     return df(d.label, d.key);
          if (d.kind === 'user')     return uf(d.label, d.key);
          if (d.kind === 'readonly') {
            if (selectedItem[d.key] == null) return null;
            return field(d.key, (
              <div>
                <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{d.label}</span>
                <p className="input bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-center font-mono font-semibold">{selectedItem[d.key]}</p>
              </div>
            ));
          }
          return null;
        };

        return (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{SECTION_LABELS[t]}</p>
              {onToggleFieldPref && (
                <button type="button" onClick={() => setEditFields(v => !v)}
                  className="text-xs flex items-center gap-1 text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-1">
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />{editFields ? 'Done' : 'Configure fields'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {descriptors.map(d => <Fragment key={d.key}>{renderDescriptor(d)}</Fragment>)}
            </div>
          </div>
        );
      })()}

      {/* Custom fields — inline (the dedicated tab was removed); per-type visibility + edit mode */}
      {fieldDefs.length > 0 && (() => {
        const ct = (selectedItem.type || '').toUpperCase();
        const cvis = (fd) => !fieldPrefs || fieldPrefs.isVisible(ct, `cf_${fd.id}`);
        const shown = fieldDefs.filter(fd => editFields || cvis(fd));
        if (shown.length === 0 && !editFields) return null;
        return (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Custom fields</p>
              {onToggleFieldPref && (
                <button type="button" onClick={() => setEditFields(v => !v)}
                  className="text-xs flex items-center gap-1 text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-1">
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />{editFields ? 'Done' : 'Configure fields'}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {shown.map(fd => {
                const visible = cvis(fd);
                return (
                <div key={fd.id} className={`flex items-center gap-2 ${visible ? '' : 'opacity-50'}`}>
                  {editFields && (
                    <input type="checkbox" checked={visible} onChange={() => onToggleFieldPref?.(ct, `cf_${fd.id}`, !visible)}
                      className="accent-brand-navy flex-shrink-0" aria-label={`Show ${fd.name}`} />
                  )}
                  <label htmlFor={`cf-${fd.id}`} className="text-xs text-neutral-500 w-32 flex-shrink-0">{fd.name}{fd.required && <span className="text-semantic-danger ml-0.5">*</span>}</label>
                  {(fd.fieldType === 'TEXT' || fd.fieldType === 'EMAIL' || fd.fieldType === 'URL' || fd.fieldType === 'PHONE') && (
                    <input id={`cf-${fd.id}`} type={fd.fieldType === 'EMAIL' ? 'email' : fd.fieldType === 'URL' ? 'url' : 'text'}
                      className="input flex-1 text-sm py-1" value={fieldValues[fd.id] || ''}
                      onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                      onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} placeholder={fd.description || fd.name} />
                  )}
                  {fd.fieldType === 'TEXTAREA' && (
                    <textarea id={`cf-${fd.id}`} rows={2} className="input flex-1 text-sm resize-none" value={fieldValues[fd.id] || ''}
                      onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                      onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} placeholder={fd.description || fd.name} />
                  )}
                  {fd.fieldType === 'NUMBER' && (
                    <input id={`cf-${fd.id}`} type="number" className="input flex-1 text-sm py-1" value={fieldValues[fd.id] || ''}
                      onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                      onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                  )}
                  {fd.fieldType === 'DATE' && (
                    <input id={`cf-${fd.id}`} type="date" className="input flex-1 text-sm py-1" value={fieldValues[fd.id] || ''}
                      onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }} />
                  )}
                  {fd.fieldType === 'CHECKBOX' && (
                    <input id={`cf-${fd.id}`} type="checkbox" className="w-4 h-4 accent-brand-navy"
                      checked={fieldValues[fd.id] === 'true' || fieldValues[fd.id] === true}
                      onChange={e => { const v = String(e.target.checked); setFieldValues(fv => ({ ...fv, [fd.id]: v })); saveFieldValue(selectedItem.id, fd.id, v); }} />
                  )}
                  {fd.fieldType === 'SELECT' && (
                    <select id={`cf-${fd.id}`} className="input flex-1 text-sm py-1" value={fieldValues[fd.id] || ''}
                      onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                      <option value="">— Select —</option>
                      {(fd.options || fd.config?.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {fd.fieldType === 'USER' && (
                    <select id={`cf-${fd.id}`} className="input flex-1 text-sm py-1" value={fieldValues[fd.id] || ''}
                      onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                      <option value="">— Select user —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  )}
                  {fd.fieldType === 'RATING' && (
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => { setFieldValues(v => ({ ...v, [fd.id]: String(n) })); saveFieldValue(selectedItem.id, fd.id, String(n)); }}
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${Number(fieldValues[fd.id]) >= n ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>{n}</button>
                      ))}
                    </div>
                  )}
                  {fd.fieldType === 'PROGRESS' && (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="range" min={0} max={100} className="flex-1" value={fieldValues[fd.id] || 0}
                        onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                        onMouseUp={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                      <span className="text-xs text-neutral-500 w-8">{fieldValues[fd.id] || 0}%</span>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {anyCapabilityEnabled(aiCapabilities) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            variant="secondary"
            disabled={!!aiLoading['ac-gen']}
            onClick={() => aiAction(
              'ac-gen',
              () => aiClient.generate(activeWorkspaceId, 'acceptance_criteria', { item: selectedItem }),
              res => {
                const ac = res?.draft || '';
                if (ac) { const u = { ...selectedItem, acceptanceCriteria: ac }; setSelectedItem(u); handleUpdateItem(u); }
              },
              'Enable AI to generate acceptance criteria',
            )}
          >
            {aiLoading['ac-gen'] ? 'Generating…' : '✦ Generate AC'}
          </Button>
          <Button
            variant="secondary"
            disabled={!!aiLoading['triage']}
            onClick={() => aiAction(
              'triage',
              () => aiClient.triage(activeWorkspaceId, { itemId: selectedItem.id, title: selectedItem.title, description: selectedItem.description }),
              res => {
                const suggestion = res?.suggestedPriority || res?.priority;
                if (suggestion) { /* showToast forwarded via aiAction */ }
                if (res?.meta?.fallback) { /* fallback noted */ }
              },
              'Enable AI to triage this item',
            )}
          >
            {aiLoading['triage'] ? 'Triaging…' : '✦ AI Triage'}
          </Button>
        </div>
      )}

      {itemChildren.length > 0 && (
        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Sub-items ({itemChildren.length})</label>
          <div className="space-y-1">
            {itemChildren.map(child => (
              <div key={child.id} onClick={() => setSelectedItem(child)} role="button" tabIndex={0} onKeyDown={onPressKey}
                className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-brand-navy/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                <span className="text-neutral-300"><CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <TypeBadge type={child.type} compact />
                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{child.autoId || child.id}</span>
                <span className="flex-1 text-xs text-neutral-900 dark:text-neutral-100 truncate">{child.title}</span>
                <StatusBadge category={statusResolver ? statusResolver.categoryOf(child.type, child.status) : statusToCategory(child.status)}>{child.status}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}

        </div>{/* /main content column */}
      </div>{/* /two-column body */}
    </>
  );
}
