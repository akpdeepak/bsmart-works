// KR-069 — article_ref block component.
// Edit mode: a debounced search input that finds articles in the same workspace via
//   GET /api/v1/articles?q=<query>&workspaceId=<id>
// then stores { articleId, displayMode } in block.metadata.
// Read mode: fetches the referenced article via GET /api/v1/articles/{id} and renders a
// compact card — title, status chip, first 100 chars of content, "→ Open" link.
// Falls back to an informative placeholder when the article is not found or not yet selected.
// All HTTP goes through api.send() (apiClient) — no inline fetch. Design tokens only (RB-30 §1).

import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, ExternalLink, Search, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { StatusBadge } from '@/components/knowledge/StatusBadge';
import { cn } from '@/lib/utils';

// Derive a short text preview from an article (block content or markdown body).
function articleExcerpt(article, maxLen = 100) {
  if (!article) return '';
  let text = '';
  try {
    const blocks = JSON.parse(article.contentBlocks || '[]');
    if (Array.isArray(blocks)) {
      text = blocks.map(b => b.content || '').join(' ').replace(/\s+/g, ' ').trim();
    }
  } catch { /* fall through */ }
  if (!text) text = (article.content || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/**
 * ArticleRefBlock — rendered inside BlockEditor (edit + read mode).
 *
 * @param {{
 *   block:       { id: string, type: string, content: string, metadata: object },
 *   onChange:    (patch: object) => void,
 *   editMode:    boolean,
 *   workspaceId: string | null,
 * }} props
 */
export function ArticleRefBlock({ block, onChange, editMode, workspaceId }) {
  const meta = block.metadata || {};
  const articleId = meta.articleId || null;

  // ── Edit-mode state ───────────────────────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const runSearch = useCallback((q) => {
    if (!q.trim() || !workspaceId) { setResults([]); setDropdownOpen(false); return; }
    setSearching(true);
    api.send(`/articles?q=${encodeURIComponent(q)}&workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.content ?? []);
        setResults(list.slice(0, 10));
        setDropdownOpen(list.length > 0);
      })
      .catch(() => { setResults([]); setDropdownOpen(false); })
      .finally(() => setSearching(false));
  }, [workspaceId]);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 280);
  };

  const selectArticle = (art) => {
    onChange({ metadata: { ...meta, articleId: art.id } });
    setDropdownOpen(false);
    setQuery('');
  };

  // ── Read-mode state ───────────────────────────────────────────────────────
  const [article, setArticle]   = useState(null);
  const [loadErr, setLoadErr]   = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!articleId) { setArticle(null); setLoadErr(false); return; }
    setLoading(true);
    setLoadErr(false);
    api.send(`/articles/${encodeURIComponent(articleId)}`)
      .then((data) => { setArticle(data); })
      .catch(() => { setArticle(null); setLoadErr(true); })
      .finally(() => setLoading(false));
  }, [articleId]);

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-brand-navy-tint/40">
            <Search aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInput}
              onFocus={() => { if (results.length) setDropdownOpen(true); }}
              placeholder={articleId ? 'Change referenced article…' : 'Search for an article…'}
              aria-label="Search for an article to reference"
              className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-none"
            />
            {searching && (
              <span className="text-xs text-neutral-400">Searching…</span>
            )}
          </div>

          {dropdownOpen && (
            <ul
              role="listbox"
              aria-label="Article search results"
              className="absolute left-0 top-full mt-1 z-dropdown w-full max-h-56 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1 shadow-lg"
            >
              {results.map((art) => (
                <li key={art.id} role="option" aria-selected={art.id === articleId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectArticle(art)}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      art.id === articleId && 'bg-brand-navy/5',
                    )}
                  >
                    <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{art.title || 'Untitled'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={art.status} />
                        {art.templateType && (
                          <span className="text-xs text-neutral-400 font-mono">{art.templateType}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview of the currently linked article while in edit mode */}
        {articleId && !dropdownOpen && (
          <ArticleCard article={article} loading={loading} error={loadErr} editMode />
        )}
      </div>
    );
  }

  // ── Read mode ─────────────────────────────────────────────────────────────
  if (!articleId) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-neutral-200 dark:border-neutral-700 px-4 py-3 text-neutral-400">
        <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="text-sm italic">No article selected.</span>
      </div>
    );
  }

  return <ArticleCard article={article} loading={loading} error={loadErr} />;
}

// Shared card UI used in both edit-mode preview and read mode.
function ArticleCard({ article, loading, error, editMode = false }) {
  if (loading) {
    return (
      <div
        className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-2 animate-pulse"
        aria-busy="true"
        aria-label="Loading article reference"
      >
        <div className="h-4 w-3/4 bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="h-3 w-2/3 bg-neutral-100 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 px-4 py-3">
        <AlertCircle aria-hidden="true" className="h-4 w-4 text-semantic-danger shrink-0" />
        <span className="text-sm text-semantic-danger">Article not found or deleted.</span>
      </div>
    );
  }

  const excerpt = articleExcerpt(article);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <BookOpen aria-hidden="true" className="h-4 w-4 text-brand-navy shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {article.title || 'Untitled'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={article.status} />
            {article.templateType && (
              <span className="text-xs text-neutral-400 font-mono">{article.templateType}</span>
            )}
          </div>
        </div>
        {!editMode && (
          <a
            href={`#article-${article.id}`}
            aria-label={`Open article: ${article.title || 'Untitled'}`}
            className="flex items-center gap-1 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded shrink-0 ml-auto"
          >
            Open <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        )}
      </div>
      {excerpt && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {excerpt}
        </p>
      )}
    </div>
  );
}
