import { Star, X, CornerDownRight, Link2, Bot, CalendarClock, Code2, ShieldCheck } from 'lucide-react';
import { TypeBadge } from '@/components/works/work-item-type';
import { WatchButton } from '@/components/works/organisms/watch-button';
import { SaveToKnowButton } from '@/components/knowledge/SaveToKnowButton';
import { buildWorkItemExecutionBrief } from '@/lib/work-item-execution-brief';
import { DetailsTab } from './work-item-detail/details-tab';
import { CommentsTab } from './work-item-detail/comments-tab';
import { LinksTab } from './work-item-detail/links-tab';
import { AttachmentsTab } from './work-item-detail/attachments-tab';
import { ActivityTab } from './work-item-detail/activity-tab';

// Right-panel detail view for a single work item. This file is the panel chrome (header + close
// scrim, action buttons, tab strip) and a tab router: each section (Details / Comments / Links /
// Files / Activity) lives in its own component under ./work-item-detail and receives only the props
// it needs. The public export + import path is unchanged; App.jsx's prop contract is preserved and
// simply forwarded down per section.
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
  links, newLink, setNewLink, handleDeleteLink,
  handleCreateLink, handleSetParent, handleAddChild, handleRemoveChild,
  // attachments
  attachments, fileInputRef, handleUploadFile, handleAttachLink, handleDeleteAttachment, maxUploadMb,
  // activity
  activity, statusMetrics, activityEventFilter, setActivityEventFilter, setActivity, reportError,
  // per-type status configuration + lapse
  statusResolver,
  // per-type field visibility
  fieldPrefs, onToggleFieldPref,
}) {
  const executionBrief = buildWorkItemExecutionBrief({
    item: selectedItem,
    users,
    comments,
    links,
    attachments,
    activity,
    children: itemChildren,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close details"
        onClick={() => setSelectedItem(null)}
        className="fixed inset-0 z-panel cursor-default bg-brand-navy/20 md:bg-transparent"
      />
      <div className="fixed right-0 top-0 bottom-0 z-panel w-panel-wide max-w-[92vw] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden shadow-xl">
        <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 min-w-0">
            <TypeBadge type={selectedItem.type} compact />
            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{selectedItem.displayKey || selectedItem.autoId || selectedItem.id}</span>
            {selectedItem.parentId && (() => {
              const parent = workItems.find(i => i.id === selectedItem.parentId);
              return parent ? (
                <button type="button" onClick={() => setSelectedItem(parent)}
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2 py-0.5 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 min-w-0"
                  title={`Parent: ${parent.title}`}>
                  <CornerDownRight className="h-3 w-3 flex-shrink-0 rotate-180" aria-hidden="true" />
                  <span className="truncate max-w-40">{parent.displayKey || parent.autoId || parent.id} · {parent.title}</span>
                </button>
              ) : null;
            })()}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              title="Copy link to this item"
              aria-label="Copy link to this item"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/items/${selectedItem.id}`)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            ><Link2 className="h-4 w-4" aria-hidden="true" /></button>
            <WatchButton itemId={selectedItem.id} />
            <button onClick={() => toggleStar(selectedItem)}
              title={selectedItem.starred ? 'Unstar' : 'Star this item'}
              className={`text-sm px-2 py-1 rounded transition-colors ${selectedItem.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
              <Star className={`h-4 w-4 ${selectedItem.starred ? 'fill-current text-brand-orange' : ''}`} aria-hidden="true" />
            </button>
            <button onClick={() => setIsWorklogOpen(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600">⏱ Log Work</button>
            {activeWorkspaceId && (
              <SaveToKnowButton
                workspaceId={activeWorkspaceId}
                defaultTitle={selectedItem.title || ''}
                linkWorkItemId={selectedItem.id}
                getContent={() => [
                  `# ${selectedItem.title || selectedItem.id}`,
                  '',
                  `**Item:** ${selectedItem.id} · **Type:** ${selectedItem.type || '—'} · **Status:** ${selectedItem.status || '—'} · **Priority:** ${selectedItem.priority || '—'}`,
                  '',
                  selectedItem.description || '_No description._',
                ].join('\n')}
              />
            )}
            {can('delete_items') && (
              <button onClick={() => handleDelete(selectedItem.id)}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Delete</button>
            )}
            <button onClick={() => setSelectedItem(null)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" aria-label="Close detail panel"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>

        <section className="border-b border-neutral-200 bg-neutral-50/80 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="Work item execution brief">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Bot className="h-3.5 w-3.5 text-brand-navy dark:text-brand-navy-tint" aria-hidden="true" />
                Execution brief
              </p>
              <div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 flex-wrap">
                <span>{executionBrief.key} is</span>
                <select 
                  className="bg-transparent border-none p-0 cursor-pointer text-brand-navy underline decoration-brand-navy/30 underline-offset-4 focus:ring-0 appearance-none font-semibold"
                  value={selectedItem.status || ''}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { status: e.target.value })}
                >
                  <option value="Backlog">Backlog</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Done">Done</option>
                  <option value="Closed">Closed</option>
                </select>
                <span>with</span>
                <select 
                  className="bg-transparent border-none p-0 cursor-pointer text-brand-navy underline decoration-brand-navy/30 underline-offset-4 focus:ring-0 appearance-none font-semibold"
                  value={selectedItem.priority || ''}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                <span>priority, owned by</span>
                <select 
                  className="bg-transparent border-none p-0 cursor-pointer text-brand-navy underline decoration-brand-navy/30 underline-offset-4 focus:ring-0 appearance-none font-semibold max-w-[150px] truncate"
                  value={selectedItem.assigneeId || ''}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { assigneeId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                  ))}
                </select>
                <span>, due {executionBrief.dueDate}.</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Sources: {executionBrief.citations.join(', ')}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Due
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{executionBrief.dueDate}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Visibility
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{executionBrief.visibility}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                  DevSync
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{executionBrief.devSync}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 border-l-2 border-l-semantic-warning">
                <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-semantic-warning" aria-hidden="true" />
                  SLA (Epic 18)
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{executionBrief.sla}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-5">
          {[
            { key: 'details',       label: 'Details' },
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
          {detailTab === 'details' && (
            <DetailsTab
              selectedItem={selectedItem} setSelectedItem={setSelectedItem} handleUpdateItem={handleUpdateItem}
              tagInput={tagInput} setTagInput={setTagInput} workItems={workItems} itemChildren={itemChildren} users={users}
              aiCapabilities={aiCapabilities} aiLoading={aiLoading} aiAction={aiAction} activeWorkspaceId={activeWorkspaceId}
              fieldDefs={fieldDefs} fieldValues={fieldValues} setFieldValues={setFieldValues} saveFieldValue={saveFieldValue}
              statusMetrics={statusMetrics} statusResolver={statusResolver}
              fieldPrefs={fieldPrefs} onToggleFieldPref={onToggleFieldPref}
            />
          )}

          {detailTab === 'comments' && (
            <CommentsTab
              selectedItem={selectedItem} users={users} currentUser={currentUser}
              comments={comments} aiCapabilities={aiCapabilities} activeWorkspaceId={activeWorkspaceId}
              newComment={newComment} handleCommentInput={handleCommentInput} handleAddComment={handleAddComment}
              commentInternal={commentInternal} setCommentInternal={setCommentInternal}
              replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyBody={replyBody} setReplyBody={setReplyBody} addReply={addReply}
              mentionOpen={mentionOpen} mentionQuery={mentionQuery} insertMention={insertMention}
            />
          )}

          {detailTab === 'links' && (
            <LinksTab
              selectedItem={selectedItem} setSelectedItem={setSelectedItem} workItems={workItems} itemChildren={itemChildren}
              links={links} newLink={newLink} setNewLink={setNewLink} handleDeleteLink={handleDeleteLink} handleCreateLink={handleCreateLink}
              handleSetParent={handleSetParent} handleAddChild={handleAddChild} handleRemoveChild={handleRemoveChild}
              statusResolver={statusResolver}
            />
          )}

          {detailTab === 'attachments' && (
            <AttachmentsTab
              selectedItem={selectedItem} attachments={attachments} fileInputRef={fileInputRef}
              handleUploadFile={handleUploadFile} handleAttachLink={handleAttachLink} handleDeleteAttachment={handleDeleteAttachment} maxUploadMb={maxUploadMb}
            />
          )}

          {detailTab === 'activity' && (
            <ActivityTab
              selectedItem={selectedItem} activity={activity} setActivity={setActivity}
              statusMetrics={statusMetrics} activityEventFilter={activityEventFilter} setActivityEventFilter={setActivityEventFilter} reportError={reportError}
              activeWorkspaceId={activeWorkspaceId} currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </>
  );
}
