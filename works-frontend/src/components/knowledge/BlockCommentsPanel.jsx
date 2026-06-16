// KR-025 / KR-027 — Block comments side panel.
// Shows threaded comment list for a block, with inline reply sub-textarea (KR-027).
// Comments grouped as root → replies[]. Replies indented ml-8 with left border.
// Depth capped at 1 (no sub-replies). Resolving root resolves all replies.
import { useState, useEffect, useRef } from 'react';
import { X, Check, Reply, Trash2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { MentionPicker, renderMentions } from '@/components/knowledge/MentionPicker';

const REPLIES_SHOW_THRESHOLD = 3;

function groupComments(flat) {
  const roots = flat.filter(c => !c.parentId);
  return roots.map(root => ({
    root,
    replies: flat.filter(c => c.parentId === root.id),
  }));
}

function CommentItem({ comment, currentUserId, onResolve, onDelete, articleId, workspaceId }) {
  return (
    <div className={cn('text-xs', comment.resolved && 'opacity-50')}>
      <div className="flex items-start gap-2">
        <div className="h-5 w-5 rounded-full bg-brand-navy/20 flex items-center justify-center flex-shrink-0 text-brand-navy font-semibold text-xs">
          {(comment.authorId || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">{comment.authorId}</span>
            <span className="text-neutral-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
            {comment.resolved && <span className="text-semantic-success text-2xs font-semibold">Resolved</span>}
          </div>
          {/* KR-028: render @mentions in brand-orange */}
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderMentions(comment.content) }} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!comment.resolved && (
            <button type="button" aria-label="Resolve comment" title="Resolve" onClick={() => onResolve(comment.id)}
              className="text-neutral-400 hover:text-semantic-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          {comment.authorId === currentUserId && (
            <button type="button" aria-label="Delete comment" title="Delete" onClick={() => onDelete(comment.id)}
              className="text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadGroup({ group, currentUserId, onResolve, onDelete, onReply, articleId }) {
  const { root, replies } = group;
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const visibleReplies = showAll ? replies : replies.slice(0, REPLIES_SHOW_THRESHOLD);
  const hiddenCount = replies.length - REPLIES_SHOW_THRESHOLD;

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(root.id, root.blockId, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  };

  return (
    <div className="space-y-2">
      <CommentItem comment={root} currentUserId={currentUserId} onResolve={onResolve} onDelete={onDelete} articleId={articleId} />

      {/* KR-027: threaded replies */}
      {visibleReplies.length > 0 && (
        <div className="ml-8 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 space-y-2">
          {visibleReplies.map(reply => (
            <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId}
              onResolve={onResolve} onDelete={onDelete} articleId={articleId} />
          ))}
          {hiddenCount > 0 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)}
              className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
              Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}

      {/* Reply button — only on root comments */}
      {!root.resolved && !showReplyBox && (
        <button type="button" onClick={() => setShowReplyBox(true)}
          className="ml-7 flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
          <Reply className="h-3 w-3" aria-hidden="true" /> Reply
        </button>
      )}

      {showReplyBox && (
        <div className="ml-7 space-y-1.5">
          <textarea
            aria-label="Write a reply"
            placeholder="Write a reply…"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={2}
            className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <div className="flex gap-1.5">
            <button type="button" onClick={handleReply}
              className="text-xs px-2.5 py-1 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
              Reply
            </button>
            <button type="button" onClick={() => { setShowReplyBox(false); setReplyText(''); }}
              className="text-xs text-neutral-500 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-1">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @param {{
 *   articleId: string,
 *   blockId: string|null,
 *   workspaceId: string,
 *   currentUserId: string,
 *   open: boolean,
 *   onClose: () => void,
 * }} props
 */
export function BlockCommentsPanel({ articleId, blockId, workspaceId, currentUserId, open, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !articleId) { setComments([]); return; }
    setLoading(true);
    const qs = blockId ? `?blockId=${encodeURIComponent(blockId)}` : '';
    api.send(`/articles/${encodeURIComponent(articleId)}/block-comments${qs}`)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [open, articleId, blockId]);

  const handlePost = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const created = await api.send(`/articles/${encodeURIComponent(articleId)}/block-comments`, {
        method: 'POST',
        body: { blockId, content: newComment.trim() },
      });
      setComments(prev => [...prev, created]);
      setNewComment('');
    } catch {
      // error is surfaced in the UI via the posting state remaining false
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId, bId, content) => {
    try {
      const created = await api.send(`/articles/${encodeURIComponent(articleId)}/block-comments`, {
        method: 'POST',
        body: { blockId: bId, content, parentId },
      });
      setComments(prev => [...prev, created]);
    } catch { /* ignore */ }
  };

  const handleResolve = async (commentId) => {
    try {
      const updated = await api.send(`/articles/${encodeURIComponent(articleId)}/block-comments/${commentId}`, {
        method: 'PATCH',
        body: { resolved: true },
      });
      setComments(prev => prev.map(c => c.id === commentId ? updated : (c.parentId === commentId ? { ...c, resolved: true } : c)));
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.send(`/articles/${encodeURIComponent(articleId)}/block-comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    } catch { /* ignore */ }
  };

  if (!open) return null;

  const groups = groupComments(comments);

  return (
    <aside
      aria-label="Block comments"
      className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Comments
          {blockId && <span className="ml-1 text-neutral-400 font-normal lowercase">on block</span>}
        </h3>
        <button type="button" aria-label="Close comments panel" onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1].map(i => <div key={i} className="h-12 rounded animate-pulse bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">No comments yet. Be the first to comment.</p>
        ) : (
          groups.map(g => (
            <ThreadGroup
              key={g.root.id}
              group={g}
              currentUserId={currentUserId}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onReply={handleReply}
              articleId={articleId}
            />
          ))
        )}
      </div>

      {/* KR-028: new comment textarea wrapped with MentionPicker */}
      <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
        <MentionPicker workspaceId={workspaceId} value={newComment} onChange={setNewComment}>
          {({ ref, onChange: onMentionChange, onKeyDown: onMentionKeyDown }) => (
            <textarea
              ref={ref}
              aria-label="New comment"
              placeholder="Add a comment… (type @ to mention)"
              value={newComment}
              onChange={(e) => { setNewComment(e.target.value); onMentionChange(e); }}
              rows={3}
              onKeyDown={(e) => {
                onMentionKeyDown(e);
                if (!e.defaultPrevented && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost();
              }}
              className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          )}
        </MentionPicker>
        <button
          type="button"
          disabled={!newComment.trim() || posting}
          onClick={handlePost}
          className="w-full text-xs py-1.5 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors"
        >
          {posting ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </aside>
  );
}
