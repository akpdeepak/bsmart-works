// KR-029 — Emoji reactions strip below the article content.
// Shows reaction counts grouped by emoji. Clicking a swatch toggles the user's reaction.
import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const DEFAULT_EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀', '😄'];

export function ArticleReactions({ articleId, workspaceId, currentUserId }) {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!articleId || !workspaceId) return;
    api.send(`/articles/${articleId}/reactions?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(data => setReactions(Array.isArray(data) ? data : []))
      .catch(() => setReactions([]));
  }, [articleId, workspaceId]);

  const byEmoji = DEFAULT_EMOJIS.reduce((acc, e) => {
    const group = reactions.filter(r => r.emoji === e);
    if (group.length) acc[e] = group;
    return acc;
  }, {});

  const toggle = async (emoji) => {
    if (loading) return;
    setLoading(true);
    try {
      await api.send(`/articles/${articleId}/reactions`, {
        method: 'POST',
        body: { emoji, workspaceId },
      });
      // refetch after toggle
      const data = await api.send(
        `/articles/${articleId}/reactions?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      setReactions(Array.isArray(data) ? data : []);
    } catch { /* ignore network errors — UI stays consistent with last known state */ }
    finally { setLoading(false); }
  };

  const myReactions = new Set(
    reactions.filter(r => r.userId === currentUserId).map(r => r.emoji)
  );

  return (
    <div className="flex flex-wrap gap-1.5 mt-4" role="group" aria-label="Article reactions">
      {DEFAULT_EMOJIS.map(emoji => {
        const count = (byEmoji[emoji] || []).length;
        const mine = myReactions.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            aria-label={`React with ${emoji}${count ? `, ${count} reaction${count > 1 ? 's' : ''}` : ''}`}
            aria-pressed={mine}
            onClick={() => toggle(emoji)}
            disabled={loading}
            className={cn(
              'flex items-center gap-1 text-sm px-2 py-0.5 rounded-full border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              mine
                ? 'border-brand-navy bg-brand-navy/10 text-brand-navy dark:border-brand-orange dark:bg-brand-orange/10 dark:text-brand-orange'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'
            )}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
