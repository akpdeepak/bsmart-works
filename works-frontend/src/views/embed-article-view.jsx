// KR-069 — Embed article view: a minimal-chrome, iframe-friendly read-only surface.
// Loaded at route /embed/article/{token} — no auth required.
// Uses the same public share token as the /p/:token route (KR-066).
// No sidebar, no header, no bSmart branding — just the article title and content blocks.
// X-Frame-Options is not set on /api/v1/public/** (SecurityConfig), so iframe embedding works.
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { BlockRenderer } from '@/components/BlockRenderer';
import { renderMd } from '@/lib/utils';

/**
 * Minimal iframe-friendly embed view for a shared article (KR-069).
 * No navigation, no auth, no bSmart chrome — title + content only.
 *
 * @param {{ token: string }} props
 */
export default function EmbedArticleView({ token }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); setError('No share token.'); return; }
    setLoading(true);
    setError(null);
    api.send(`/public/articles/${encodeURIComponent(token)}`)
      .then((data) => { setArticle(data); setLoading(false); })
      .catch(() => {
        setError('This article is not available or the embed link has been revoked.');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 p-6">
        <div className="space-y-3 max-w-reading animate-pulse" aria-busy="true" aria-label="Loading article">
          <div className="h-7 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-3/4" />
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6" />
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center gap-3 p-8">
        <AlertTriangle className="h-10 w-10 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-neutral-500 text-center max-w-reading">
          {error || 'This article embed is no longer available.'}
        </p>
      </div>
    );
  }

  // Parse block content, fall through to markdown
  let blocks = [];
  try {
    const parsed = JSON.parse(article.contentBlocks || '[]');
    if (Array.isArray(parsed)) blocks = parsed;
  } catch { /* fall through */ }

  return (
    <div className="bg-white dark:bg-neutral-950 p-6">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-5">
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
    </div>
  );
}
