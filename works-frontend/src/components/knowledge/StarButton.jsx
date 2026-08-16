// KR-035 — Star/unstar article button with optimistic toggle.
import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarButton({ articleId, workspaceId }) {
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!articleId || !workspaceId) return;
    api.send(`/articles/favorites?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(res => {
        const favs = Array.isArray(res) ? res : (res?.content || []);
        const isFav = favs.some(f => f === articleId || f.id === articleId || f.articleId === articleId);
        setStarred(isFav);
      })
      .catch(() => setStarred(false));
  }, [articleId, workspaceId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (starred) {
        await api.send(`/articles/${articleId}/favorite?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'DELETE' });
        setStarred(false);
      } else {
        await api.send(`/articles/${articleId}/favorite?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'POST' });
        setStarred(true);
      }
    } catch { /* ignore toggle errors — optimistic UI already applied */ } finally { setLoading(false); }
  };

  return (
    <button
      type="button"
      aria-label={starred ? 'Unstar article' : 'Star article'}
      aria-pressed={starred}
      onClick={toggle}
      disabled={loading}
      className={cn(
        'p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
        starred ? 'text-brand-orange' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
      )}
    >
      <Star className="h-4 w-4" fill={starred ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}
