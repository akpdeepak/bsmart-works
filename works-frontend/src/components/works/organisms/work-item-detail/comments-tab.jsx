import { useState } from 'react';
import { X, Reply, Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Avatar } from '@/components/works/atoms/avatar';
import { anyCapabilityEnabled } from '@/lib/ai';
import { renderMd } from '@/lib/utils';
import { api } from '@/lib/apiClient';

export function CommentsTab({
  selectedItem, users, currentUser,
  comments, aiCapabilities, activeWorkspaceId,
  newComment, handleCommentInput, handleAddComment,
  commentInternal, setCommentInternal,
  replyingTo, setReplyingTo, replyBody, setReplyBody, addReply,
  mentionOpen, mentionQuery, insertMention,
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

  return (
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
  );
}
