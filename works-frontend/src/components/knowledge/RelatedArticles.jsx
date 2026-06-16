// KR-045 — Related articles panel. Fetches /articles/{id}/related?workspaceId=.
// Backend returns articles sharing at least one tag with the current article,
// ordered by tag-overlap count. This component just displays results.
import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { FileText } from 'lucide-react';

export function RelatedArticles({ articleId, workspaceId, onOpenArticle }) {
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!articleId || !workspaceId) return;
    api.send(`/articles/${articleId}/related?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(d => setRelated(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => setRelated([]));
  }, [articleId, workspaceId]);

  if (!related.length) return null;

  return (
    <section aria-label="Related articles" className="mt-6 border-t border-neutral-200 dark:border-neutral-700 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Related</h3>
      <ul className="space-y-1">
        {related.map(art => (
          <li key={art.id}>
            <button type="button" onClick={() => onOpenArticle?.(art.id)}
              className="w-full text-left flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-brand-navy dark:hover:text-brand-orange py-0.5">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" aria-hidden="true" />
              <span className="truncate">{art.title || 'Untitled'}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
