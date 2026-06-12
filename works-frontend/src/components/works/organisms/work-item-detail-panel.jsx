import { useRef, useEffect, useState } from 'react';
import {
  Star, X, ArrowUp, CornerDownRight, Reply, Sparkles,
  Upload, Image as ImageIcon, ShieldCheck, ArrowRight,
  ClipboardList, IndentIncrease, IndentDecrease,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse, lapseProgress } from '@/lib/status-lapse';
import { WorkItemStatusTimeline } from '@/components/works/organisms/work-item-status-timeline';
import { AcceptanceCriteria } from '@/components/works/organisms/acceptance-criteria';
import { TYPES } from '@/lib/work-item-types';
import { api } from '@/lib/apiClient';
import { aiClient, anyCapabilityEnabled } from '@/lib/ai';
import { renderMd, onPressKey } from '@/lib/utils';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function formatEventType(eventType) {
  const map = {
    WORK_ITEM_CREATED: 'created this item',
    WORK_ITEM_UPDATED: 'updated this item',
    WORK_ITEM_DELETED: 'deleted this item',
    COMMENT_ADDED:     'added a comment',
    STATUS_CHANGED:    'changed the status',
    ASSIGNED:          'changed the assignee',
    USER_LOGGED_IN:    'logged in',
    USER_SIGNED_UP:    'signed up',
  };
  return map[eventType] || (eventType || '').toLowerCase().replace(/_/g, ' ');
}

function RichTextEditor({ id, value, onChange, onBlur, placeholder }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, []); // mount-only; ongoing changes come from user input

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = () => {
    if (!isComposing.current) onChange(editorRef.current?.innerHTML || '');
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); exec('bold'); }
      if (e.key === 'i') { e.preventDefault(); exec('italic'); }
      if (e.key === 'u') { e.preventDefault(); exec('underline'); }
    }
  };

  const handleBlur = () => {
    onChange(editorRef.current?.innerHTML || '');
    onBlur?.();
  };

  const renderToolBtn = ({ cmd, arg, title, children, active }) => (
    <button key={`${cmd}-${arg || 'default'}`} type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors
        ${active ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors dark:bg-neutral-800">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap">
        {renderToolBtn({ cmd: 'bold',                title: 'Bold (Ctrl+B)',       children: <strong>B</strong> })}
        {renderToolBtn({ cmd: 'italic',              title: 'Italic (Ctrl+I)',     children: <em>I</em> })}
        {renderToolBtn({ cmd: 'underline',           title: 'Underline (Ctrl+U)',  children: <u>U</u> })}
        {renderToolBtn({ cmd: 'strikeThrough',       title: 'Strikethrough',       children: <s>S</s> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'formatBlock', arg: 'h2', title: 'Heading 2',   children: <span className="font-bold text-xs">H2</span> })}
        {renderToolBtn({ cmd: 'formatBlock', arg: 'h3', title: 'Heading 3',   children: <span className="font-bold text-xs">H3</span> })}
        {renderToolBtn({ cmd: 'formatBlock', arg: 'p',  title: 'Paragraph',   children: <span className="text-xs">¶</span> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'insertUnorderedList', title: 'Bullet list',  children: <span className="text-xs">{'• —'}</span> })}
        {renderToolBtn({ cmd: 'insertOrderedList',   title: 'Numbered list',children: <span className="text-xs">1.</span> })}
        {renderToolBtn({ cmd: 'indent',              title: 'Indent',       children: <IndentIncrease className="h-4 w-4" aria-hidden="true" /> })}
        {renderToolBtn({ cmd: 'outdent',             title: 'Outdent',      children: <IndentDecrease className="h-4 w-4" aria-hidden="true" /> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'removeFormat',        title: 'Clear formatting', children: <X className="h-4 w-4" aria-hidden="true" /> })}
        <span className="ml-auto text-xs text-neutral-300 pr-1">WYSIWYG</span>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        tabIndex={0}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        className="min-h-24 max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300"
      />
    </div>
  );
}

export function WorkItemDetailPanel({
  // item
  selectedItem, setSelectedItem,
  // panel actions
  toggleStar, handleDelete, can, handleUpdateItem, setIsWorklogOpen,
  // tabs
  detailTab, setDetailTab,
  // details tab
  tagInput, setTagInput, workItems, itemChildren, users,
  // ai
  aiCapabilities, aiLoading, aiAction, activeWorkspaceId,
  // custom fields
  fieldDefs, fieldValues, setFieldValues, saveFieldValue,
  // comments
  comments, currentUser,
  newComment, handleCommentInput, handleAddComment,
  commentInternal, setCommentInternal,
  replyingTo, setReplyingTo, replyBody, setReplyBody, addReply,
  mentionOpen, mentionQuery, insertMention,
  // links
  links, newLink, setNewLink, handleDeleteLink, handleAddLink,
  // attachments
  attachments, fileInputRef, handleUploadFile, handleDeleteAttachment, maxUploadMb,
  // activity
  activity, statusDurations, activityEventFilter, setActivityEventFilter, setActivity, reportError,
  // per-type status configuration + lapse
  statusResolver,
}) {
  // Iteration 10 Cap O — summarize comments (second AI surface)
  const [commentSummary, setCommentSummary] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  const summarizeComments = () => {
    if (!selectedItem?.id || !activeWorkspaceId) return;
    setSummaryBusy(true);
    setCommentSummary(null);
    api.send(`/ai/summarize?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
      method: 'POST',
      body: JSON.stringify({ kind: 'comments', subjectId: selectedItem.id }),
    })
      .then(d => setCommentSummary(d.summary || null))
      .catch(() => {})
      .finally(() => setSummaryBusy(false));
  };

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
      <button
        type="button"
        aria-label="Close details"
        onClick={() => setSelectedItem(null)}
        className="fixed inset-0 z-panel cursor-default bg-brand-navy/20 md:bg-transparent"
      />
      <div className="fixed right-0 top-0 bottom-0 z-panel w-panel max-w-[92vw] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden shadow-xl">
        <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <TypeBadge type={selectedItem.type} compact />
            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{selectedItem.id}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => toggleStar(selectedItem)}
              title={selectedItem.starred ? 'Unstar' : 'Star this item'}
              className={`text-sm px-2 py-1 rounded transition-colors ${selectedItem.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
              <Star className={`h-4 w-4 ${selectedItem.starred ? 'fill-current text-brand-orange' : ''}`} aria-hidden="true" />
            </button>
            <button onClick={() => setIsWorklogOpen(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600">⏱ Log Work</button>
            {can('delete_items') && (
              <button onClick={() => handleDelete(selectedItem.id)}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Delete</button>
            )}
            <button onClick={() => setSelectedItem(null)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" aria-label="Close detail panel"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>

        <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-5">
          {[
            { key: 'details',       label: 'Details' },
            { key: 'custom-fields', label: 'Custom Fields' },
            { key: 'comments',      label: `Comments ${comments.length > 0 ? `(${comments.length})` : ''}` },
            { key: 'links',         label: `Links ${links.length > 0 ? `(${links.length})` : ''}` },
            { key: 'attachments',   label: `Files ${attachments.length > 0 ? `(${attachments.length})` : ''}` },
            { key: 'activity',      label: 'Activity' },
          ].map(t => (
            <button key={t.key} onClick={() => setDetailTab(t.key)}
              className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${detailTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 dark:bg-neutral-900">
          {/* DETAILS TAB */}
          {detailTab === 'details' && <>
            <input className="w-full text-lg font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none border-b border-transparent focus:border-neutral-200 dark:focus:border-neutral-600 pb-1 bg-transparent"
              value={selectedItem.title}
              onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
              onBlur={() => handleUpdateItem(selectedItem)} />

            {/* Status + time-in-status lapse summary (S4/S5) */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusMeta?.color || '#94A3B8' }} aria-hidden="true" />
                  {selectedItem.status}
                </span>
                <StatusBadge category={statusCat}>{statusCat === 'in_progress' ? 'In Progress' : statusCat === 'done' ? 'Done' : 'To Do'}</StatusBadge>
                {!isDoneCat && <LapseBadge lapse={lapse} />}
                {isDoneCat && lapse.state !== 'none' && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Closed · {lapse.elapsedSec >= 0 ? 'in final status' : ''}</span>
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
              {statusDurations && statusDurations.length > 0 && (
                <WorkItemStatusTimeline durations={statusDurations} />
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="detail-status" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Status</label>
                <select id="detail-status" value={selectedItem.status}
                  onChange={e => { const u = { ...selectedItem, status: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="detail-type" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Type</label>
                <select id="detail-type" value={selectedItem.type}
                  onChange={e => { const u = { ...selectedItem, type: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
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

            <div>
              <label htmlFor="detail-parent-id" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Parent Item</label>
              <select id="detail-parent-id" value={selectedItem.parentId || ''}
                onChange={e => { const u = { ...selectedItem, parentId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                className="input">
                <option value="">No parent</option>
                {workItems.filter(i => i.id !== selectedItem.id && (i.type === 'EPIC' || i.type === 'STORY')).map(i => (
                  <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                ))}
              </select>
              {selectedItem.parentId && (() => {
                const parent = workItems.find(i => i.id === selectedItem.parentId);
                return parent ? (
                  <button type="button" className="mt-1.5 flex items-center gap-2 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                    onClick={() => setSelectedItem(parent)} aria-label={`Navigate to parent: ${parent.title}`}>
                    <span aria-hidden="true"><ArrowUp className="inline-block h-3.5 w-3.5 align-text-bottom" /></span><TypeBadge type={parent.type} compact /><span>{parent.title}</span>
                  </button>
                ) : null;
              })()}
            </div>

            {itemChildren.length > 0 && (
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Sub-items ({itemChildren.length})</label>
                <div className="space-y-1">
                  {itemChildren.map(child => (
                    <div key={child.id} onClick={() => setSelectedItem(child)} role="button" tabIndex={0} onKeyDown={onPressKey}
                      className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-brand-navy/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                      <span className="text-neutral-300"><CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                      <TypeBadge type={child.type} compact />
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{child.id}</span>
                      <span className="flex-1 text-xs text-neutral-900 truncate">{child.title}</span>
                      <StatusBadge category={statusToCategory(child.status)}>{child.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              const tf = (label, field, rows = 2) => (
                <div className="col-span-2">
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
                  <textarea rows={rows} className="input resize-none"
                    value={selectedItem[field] || ''}
                    onChange={e => setSelectedItem({ ...selectedItem, [field]: e.target.value })}
                    onBlur={e => { const u = { ...selectedItem, [field]: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }} />
                </div>
              );
              const sf = (label, field, opts) => (
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
                  <select className="input" value={selectedItem[field] || ''} onChange={e => upd({ [field]: e.target.value || null })}>
                    <option value="">— select —</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
              const nf = (label, field, placeholder = '') => (
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
                  <input type="text" className="input" placeholder={placeholder}
                    value={selectedItem[field] || ''}
                    onChange={e => setSelectedItem({ ...selectedItem, [field]: e.target.value })}
                    onBlur={e => { const u = { ...selectedItem, [field]: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }} />
                </div>
              );
              const df = (label, field) => (
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
                  <input type="date" className="input" value={selectedItem[field] || ''} onChange={e => upd({ [field]: e.target.value || null })} />
                </div>
              );
              const uf = (label, field) => (
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">{label}</label>
                  <select className="input" value={selectedItem[field] || ''} onChange={e => upd({ [field]: e.target.value || null })}>
                    <option value="">— unassigned —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                </div>
              );

              const sectionLabel = { BUG: 'Bug Details', RISK: 'Risk Details', ISSUE: 'Issue Details',
                ASSUMPTION: 'Assumption Details', DEPENDENCY: 'Dependency Details',
                INCIDENT: 'Incident Details', HR_SERVICE_REQUEST: 'HR Service Request Details',
                IT_SERVICE_REQUEST: 'IT Service Request Details' }[t];

              return (
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">{sectionLabel}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {t === 'BUG' && <>
                      {uf('Reporter', 'reporterId')}
                      {sf('Severity', 'severity', ['Critical','High','Medium','Low'])}
                      {sf('Environment', 'environmentDetail', ['Development','Staging','UAT','Production'])}
                      {sf('Regression Risk', 'regressionRisk', ['Yes','No','Not Assessed'])}
                      {tf('Steps to Reproduce', 'stepsToReproduce', 3)}
                      {tf('Expected Behavior', 'expectedBehavior')}
                      {tf('Actual Behavior', 'actualBehavior')}
                      {nf('Affected Version', 'affectedVersion')}
                      {nf('Fixed In Version', 'fixedInVersion')}
                    </>}
                    {t === 'RISK' && <>
                      {sf('Probability', 'probability', ['High','Medium','Low'])}
                      {sf('Impact Level', 'impactLevel', ['High','Medium','Low'])}
                      {selectedItem.riskScore != null && (
                        <div>
                          <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Risk Score</span>
                          <p className="input bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-center font-mono font-semibold">{selectedItem.riskScore}</p>
                        </div>
                      )}
                      {tf('Mitigation Plan', 'mitigationPlan', 3)}
                      {tf('Contingency Plan', 'contingencyPlan')}
                    </>}
                    {t === 'ISSUE' && <>
                      {sf('Impact Level', 'impactLevel', ['High','Medium','Low'])}
                      {tf('Root Cause', 'rootCause', 3)}
                      {tf('Resolution Summary', 'resolutionSummary')}
                    </>}
                    {t === 'ASSUMPTION' && <>
                      {tf('Basis / Rationale', 'basisRationale', 3)}
                      {df('Validation Date', 'validationDate')}
                      {tf('Risk if Wrong', 'riskIfWrong')}
                    </>}
                    {t === 'DEPENDENCY' && <>
                      {sf('Dependency Type', 'dependencyType', ['Internal','External'])}
                      {df('Expected Resolution', 'expectedResolutionDate')}
                      {tf('Impact if Delayed', 'impactIfDelayed')}
                    </>}
                    {t === 'INCIDENT' && <>
                      {uf('Reporter', 'reporterId')}
                      {sf('Response Speed', 'responseSpeed', ['Immediate','High','Normal','Planned'])}
                      {sf('Business Impact', 'businessImpact', ['Organisation-wide','Department','Team','Individual'])}
                      {sf('Severity', 'severity', ['Critical','High','Medium','Low'])}
                      {nf('Affected Area', 'itemCategory', 'e.g. Billing, Field Ops')}
                      {nf('Affected System', 'affectedSystem')}
                      {nf('Responding Team', 'respondingTeam')}
                      {tf('Root Cause', 'rootCause', 3)}
                      {tf('Resolution Summary', 'resolutionSummary')}
                    </>}
                    {(t === 'HR_SERVICE_REQUEST' || t === 'IT_SERVICE_REQUEST') && <>
                      {uf('Requested For', 'requestedForId')}
                      {uf('Approver', 'approverId')}
                      {t === 'HR_SERVICE_REQUEST' && nf('Department', 'department')}
                      {t === 'IT_SERVICE_REQUEST' && nf('Affected System', 'affectedSystem')}
                      {nf('Category', 'itemCategory', 'e.g. Access Request')}
                      {df('Needed By', 'neededByDate')}
                      {tf('Business Justification', 'businessJustification')}
                    </>}
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
                      const ac = res?.result || res?.text || '';
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
          </>}

          {/* CUSTOM FIELDS TAB */}
          {detailTab === 'custom-fields' && (
            <div>
              {fieldDefs.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No custom fields defined" subtitle="Go to Workflows & Fields settings to define custom fields for your work items." />
              ) : (
                <div className="space-y-3">
                  <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-2 font-medium uppercase tracking-wider">Custom Fields</span>
                  {fieldDefs.map(fd => (
                    <div key={fd.id} className="flex items-center gap-2">
                      <label htmlFor={`cf-${fd.id}`} className="text-xs text-neutral-500 w-32 flex-shrink-0">{fd.name}{fd.required && <span className="text-semantic-danger ml-0.5">*</span>}</label>
                      {(fd.fieldType === 'TEXT' || fd.fieldType === 'EMAIL' || fd.fieldType === 'URL' || fd.fieldType === 'PHONE') && (
                        <input id={`cf-${fd.id}`} type={fd.fieldType === 'EMAIL' ? 'email' : fd.fieldType === 'URL' ? 'url' : 'text'}
                          className="input flex-1 text-sm py-1"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                          onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)}
                          placeholder={fd.description || fd.name} />
                      )}
                      {fd.fieldType === 'TEXTAREA' && (
                        <textarea id={`cf-${fd.id}`} rows={2} className="input flex-1 text-sm resize-none"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                          onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)}
                          placeholder={fd.description || fd.name} />
                      )}
                      {fd.fieldType === 'NUMBER' && (
                        <input id={`cf-${fd.id}`} type="number" className="input flex-1 text-sm py-1"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                          onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                      )}
                      {fd.fieldType === 'DATE' && (
                        <input id={`cf-${fd.id}`} type="date" className="input flex-1 text-sm py-1"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }} />
                      )}
                      {fd.fieldType === 'CHECKBOX' && (
                        <input id={`cf-${fd.id}`} type="checkbox" className="w-4 h-4 accent-brand-navy"
                          checked={fieldValues[fd.id] === 'true' || fieldValues[fd.id] === true}
                          onChange={e => { const v = String(e.target.checked); setFieldValues(fv => ({ ...fv, [fd.id]: v })); saveFieldValue(selectedItem.id, fd.id, v); }} />
                      )}
                      {fd.fieldType === 'SELECT' && (
                        <select id={`cf-${fd.id}`} className="input flex-1 text-sm py-1"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                          <option value="">— Select —</option>
                          {(fd.options || fd.config?.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {fd.fieldType === 'USER' && (
                        <select id={`cf-${fd.id}`} className="input flex-1 text-sm py-1"
                          value={fieldValues[fd.id] || ''}
                          onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                          <option value="">— Select user —</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                      )}
                      {fd.fieldType === 'RATING' && (
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => { setFieldValues(v => ({ ...v, [fd.id]: String(n) })); saveFieldValue(selectedItem.id, fd.id, String(n)); }}
                              className={`w-6 h-6 rounded text-xs font-bold transition-colors ${Number(fieldValues[fd.id]) >= n ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      )}
                      {fd.fieldType === 'PROGRESS' && (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="range" min={0} max={100} className="flex-1"
                            value={fieldValues[fd.id] || 0}
                            onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                            onMouseUp={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                          <span className="text-xs text-neutral-500 w-8">{fieldValues[fd.id] || 0}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {detailTab === 'comments' && (
            <div>
              {/* Iteration 10 Cap O — AI comment summarization */}
              {comments.length >= 2 && anyCapabilityEnabled(aiCapabilities) && (
                <div className="mb-3">
                  {commentSummary ? (
                    <div className="flex gap-2 rounded-lg border border-brand-navy/20 bg-neutral-50 dark:bg-neutral-800 p-3 text-sm text-neutral-700 dark:text-neutral-200">
                      <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0 mt-0.5" />
                      <p className="flex-1">{commentSummary}</p>
                      <button onClick={() => setCommentSummary(null)} aria-label="Dismiss summary" className="text-neutral-400 hover:text-neutral-600"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={summarizeComments}
                      disabled={summaryBusy}
                      className="flex items-center gap-1.5 text-xs text-brand-navy hover:underline disabled:opacity-50">
                      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                      {summaryBusy ? 'Summarizing…' : 'Summarize comments'}
                    </button>
                  )}
                </div>
              )}
              {comments.length === 0 && (
                <p className="text-xs text-neutral-600 text-center py-6">No comments yet. Be the first to comment.</p>
              )}
              <div className="space-y-3 mb-4">
                {comments.map(c => (
                  <div key={c.id}>
                    <div className="flex gap-2.5">
                      <Avatar name={c.authorName || '?'} size={7} />
                      <div className={`flex-1 rounded-xl px-3 py-2.5 border ${c.isInternal ? 'bg-semantic-warning-surface border-semantic-warning/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-neutral-900">{c.authorName}</p>
                          {c.isInternal && <span className="text-xs bg-semantic-warning text-white px-1.5 py-0.5 rounded">Internal</span>}
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-auto">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                        </div>
                        <p className="text-sm text-neutral-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(c.body) }} />
                        <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy mt-1.5 transition-colors">
                          <Reply className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Reply {c.replies?.length > 0 && `(${c.replies.length})`}
                        </button>
                      </div>
                    </div>
                    {c.replies?.length > 0 && (
                      <div className="ml-9 mt-1.5 space-y-1.5 border-l-2 border-neutral-100 pl-3">
                        {c.replies.map(r => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar name={r.authorName || '?'} size={6} />
                            <div className="flex-1 bg-white dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-100 dark:border-neutral-700">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-semibold text-neutral-900">{r.authorName}</p>
                                <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-auto">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                              </div>
                              <p className="text-xs text-neutral-700" dangerouslySetInnerHTML={{ __html: renderMd(r.body) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {replyingTo === c.id && (
                      <div className="ml-9 mt-1.5 flex gap-2">
                        <Avatar name={currentUser.fullName} size={6} />
                        <div className="flex-1">
                          <textarea rows={2} value={replyBody} onChange={e => setReplyBody(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addReply(selectedItem.id, c.id))}
                            placeholder="Write a reply... (Enter to send)"
                            className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-navy resize-none" />
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" onClick={() => addReply(selectedItem.id, c.id)}>Reply</Button>
                            <button onClick={() => { setReplyingTo(null); setReplyBody(''); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="relative">
                <div className="flex gap-2.5">
                  <Avatar name={currentUser.fullName} size={7} />
                  <div className="flex-1">
                    <textarea rows={2} value={newComment} onChange={handleCommentInput}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                      placeholder="Write a comment... (@mention to notify, Enter to send)"
                      className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy resize-none" />
                    <div className="flex items-center justify-between mt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={commentInternal} onChange={e => setCommentInternal(e.target.checked)}
                          className="w-3 h-3 rounded accent-semantic-warning" />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Internal only</span>
                      </label>
                      <Button size="sm" onClick={handleAddComment}>Send</Button>
                    </div>
                  </div>
                </div>
                {mentionOpen && (
                  <div className="absolute bottom-full mb-1 left-9 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-40 overflow-y-auto">
                    {users.filter(u => !mentionQuery || u.fullName.toLowerCase().includes(mentionQuery)).map(u => (
                      <button key={u.id} onClick={() => insertMention(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-left">
                        <Avatar name={u.fullName} size={6} />
                        <span className="text-sm text-neutral-900">{u.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LINKS TAB */}
          {detailTab === 'links' && (
            <div>
              {links.length > 0 && (
                <div className="mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Link Graph</p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-brand-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm max-w-full truncate">
                      {selectedItem.id}
                    </div>
                    <div className="w-full space-y-1.5">
                      {links.map(l => {
                        const LINK_COLORS = {
                          BLOCKS:      'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                          BLOCKED_BY:  'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                          RELATES_TO:  'border-brand-navy-tint bg-brand-navy/5 text-brand-navy',
                          DUPLICATES:  'border-semantic-warning bg-semantic-warning-surface text-semantic-warning',
                          PARENT:      'border-neutral-300 bg-neutral-100 text-neutral-700',
                          CHILD:       'border-semantic-success bg-semantic-success/10 text-semantic-success',
                        };
                        const colorClass = LINK_COLORS[l.linkType] || LINK_COLORS.RELATES_TO;
                        return (
                          <div key={l.id} className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colorClass} flex-shrink-0`}>
                              {l.linkType?.replace('_', ' ')}
                            </span>
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                            <button type="button" className={`text-xs font-semibold px-2 py-1 rounded-lg border ${colorClass} cursor-pointer hover:opacity-80 truncate max-w-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40`}
                              onClick={() => { const t = workItems.find(i => i.id === l.targetId); if (t) setSelectedItem(t); }}
                              title={l.targetTitle || l.targetId} aria-label={`Navigate to ${l.targetId}`}>
                              {l.targetId}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {links.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No links yet.</p>}
              <div className="space-y-2 mb-4">
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
                    <span className="text-xs font-semibold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase">{l.linkType?.replace('_', ' ')}</span>
                    <span className="flex-1 text-sm text-neutral-900 font-mono">{l.targetId}</span>
                    {l.targetTitle && <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-24">{l.targetTitle}</span>}
                    <button onClick={() => handleDeleteLink(l.id)} className="text-neutral-300 hover:text-semantic-danger text-xs" aria-label="Remove link"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <select value={newLink.linkType} onChange={e => setNewLink(p => ({ ...p, linkType: e.target.value }))} className="input w-36">
                  {['BLOCKS','BLOCKED_BY','RELATES_TO','DUPLICATES','PARENT','CHILD'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <select value={newLink.targetId} onChange={e => setNewLink(p => ({ ...p, targetId: e.target.value }))} className="input flex-1">
                  <option value="">Select item...</option>
                  {workItems.filter(i => i.id !== selectedItem.id).map(i => (
                    <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddLink}>Link</Button>
              </div>
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {detailTab === 'attachments' && (
            <div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadFile} />
              <div className="flex items-center gap-3 mb-4">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Upload file
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Max {maxUploadMb} MB per file</span>
                  <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Virus scan active
                  </span>
                </div>
              </div>
              {attachments.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No files attached yet.</p>}
              <div className="space-y-2">
                {attachments.map(a => {
                  const mime = a.mime_type || a.mimeType || '';
                  const isImage = mime.startsWith('image/');
                  const fileName = a.file_name || a.fileName || '?';
                  const previewUrl = `${API}/work-items/${selectedItem.id}/attachments/${a.id}/content`;
                  const ext = fileName.split('.').pop().toUpperCase().slice(0, 3);
                  return (
                    <div key={a.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                      {isImage && (
                        <div className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center p-2 max-h-48 overflow-hidden">
                          <img src={previewUrl} alt={fileName}
                            className="max-h-44 max-w-full object-contain rounded"
                            onError={e => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${isImage ? 'bg-brand-navy/10 text-brand-navy' : 'bg-neutral-200 text-neutral-600'}`}>
                          {isImage ? <ImageIcon className="h-4 w-4" aria-hidden="true" /> : ext}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{fileName}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{a.uploaded_by_name || a.uploadedByName || 'You'} · {a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</p>
                        </div>
                        <a href={previewUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-brand-navy hover:underline flex-shrink-0 mr-2">View</a>
                        <button onClick={() => handleDeleteAttachment(a.id)} className="text-neutral-300 hover:text-semantic-danger text-xs flex-shrink-0" aria-label="Remove attachment"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {detailTab === 'activity' && (
            <div>
              {statusDurations.length > 0 && (
                <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
                  <WorkItemStatusTimeline durations={statusDurations} />
                </div>
              )}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {['', 'WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENT_ADDED', 'LINKED', 'ATTACHED'].map(et => (
                  <button key={et} onClick={() => {
                    setActivityEventFilter(et);
                    const url = `/work-items/${selectedItem.id}/activity${et ? `?eventType=${et}` : ''}`;
                    api.raw(url).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(reportError);
                  }}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${activityEventFilter === et ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                    {et ? et.replace(/_/g, ' ') : 'All'}
                  </button>
                ))}
              </div>
              {activity.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No activity recorded yet.</p>}
              <div className="space-y-3">
                {activity.map(a => (
                  <div key={a.id} className="flex gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      a.event_type === 'WORK_ITEM_CREATED' ? 'bg-semantic-success' :
                      a.event_type === 'STATUS_CHANGED' ? 'bg-brand-navy-tint' :
                      a.event_type === 'COMMENT_ADDED' ? 'bg-brand-orange' :
                      'bg-neutral-300'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-xs text-neutral-700">
                        <span className="font-semibold">{a.actor_name || 'System'}</span>
                        {' '}{formatEventType(a.event_type)}
                      </p>
                      {a.field_name && a.old_value !== null && a.new_value !== null && (
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium capitalize">{String(a.field_name).replace(/_/g,' ')}:</span>
                          {a.old_value && <span className="text-xs bg-semantic-danger-surface text-semantic-danger px-1.5 py-0.5 rounded line-through">{a.old_value}</span>}
                          <span className="text-xs text-neutral-600 dark:text-neutral-400"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
                          {a.new_value && <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded">{a.new_value}</span>}
                        </div>
                      )}
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{a.occurred_at ? new Date(a.occurred_at).toLocaleString() : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
