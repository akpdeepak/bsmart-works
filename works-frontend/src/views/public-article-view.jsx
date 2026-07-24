// KR-066 — Public article view: renders a shared article with no sidebar/editor/auth.
// Loaded at route /p/:token — no JWT required; the server fetches by token.
import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { BlockRenderer } from '@/components/BlockRenderer';
import { renderMd } from '@/lib/utils';

/**
 * Minimal public reader for a shared article (KR-066).
 * No sidebar, no editing, no authentication. Article must be PUBLISHED.
 *
 * @param {{ token: string }} props
 */
export default function PublicArticleView({ token }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); setError('No share token.'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    api.send(`/public/articles/${encodeURIComponent(token)}`)
      .then((data) => { setArticle(data); setLoading(false); })
      .catch(() => { setError('This link is invalid or the article is no longer available.'); setLoading(false); });
  }, [token]);

  // The unresolved states keep this route's full-screen centred chrome (it is an unauthenticated
  // page, not a panel inside the shell) but render through AsyncBoundary so the loading and error
  // treatments match every other async surface (RB-30 §6).
  if (loading || error || !article) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-8">
        <div className="w-full max-w-reading">
          <AsyncBoundary
            loading={loading}
            error={error || (!article ? 'This article is not available. The share link may have been revoked.' : null)}
            errorTitle="Article not found"
            label="Loading article"
            className="space-y-3 animate-pulse"
            skeleton={
              <>
                <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-3/4" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-4/6" />
              </>
            }
          />
        </div>
      </div>
    );
  }

  // Render blocks or markdown
  let blocks = [];
  try {
    const parsed = JSON.parse(article.contentBlocks || '[]');
    if (Array.isArray(parsed)) blocks = parsed;
  } catch { /* fall through */ }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Minimal header — just the product wordmark and a note this is a shared article */}
      <header className="border-b border-neutral-100 dark:border-neutral-800 px-6 py-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-brand-navy" aria-hidden="true" />
        <span className="text-sm font-semibold text-brand-navy dark:text-white">bSmart Works</span>
        <span className="text-xs text-neutral-400 ml-auto">Shared article</span>
      </header>

      {/* Article content — max-w-reading centred, matches the in-app reader */}
      <main className="max-w-reading mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
          {article.title || 'Untitled'}
        </h1>

        {blocks.length > 0 ? (
          <BlockRenderer blocks={blocks} workspaceId={null} />
        ) : article.content ? (
          <div
            className="prose prose-sm dark:prose-invert text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap text-sm"
            dangerouslySetInnerHTML={{ __html: renderMd(article.content) }}
          />
        ) : (
          <p className="text-sm text-neutral-500 italic">This article has no content.</p>
        )}
      </main>
    </div>
  );
}
