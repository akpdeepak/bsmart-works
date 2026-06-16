// SearchAIAnswer — renders the AI-synthesised answer from the KB RAG endpoint.
// KR-044: AI semantic search in Know Studio. Shows the answer paragraph, citation
// cards (brand-navy border-left accent), AiMetaBadge provenance footer, and a
// fallback banner when AI was unavailable (meta.source === 'keyword_fallback' or
// meta.fallback === true). Design tokens only (RB-30 §1); WCAG 2.1 AA.

import { AlertTriangle } from 'lucide-react';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';

/**
 * SearchAIAnswer — displays the AI KB answer with citations and provenance.
 *
 * @param {{
 *   answer: string,
 *   citations: Array<{ id: string, title: string, excerpt?: string }>,
 *   meta: object,
 *   onOpenArticle?: (id: string) => void,
 * }} props
 */
export function SearchAIAnswer({ answer, citations = [], meta, onOpenArticle }) {
  if (!answer) return null;

  // The AI Control Plane sets meta.fallback=true when it served the deterministic
  // keyword result instead of a synthesised answer. The backend may also indicate this
  // via a 'source' field on the meta object for future compatibility.
  const isFallback = meta?.fallback === true || meta?.source === 'keyword_fallback';

  return (
    <div className="space-y-3" aria-label="AI answer">
      {/* Fallback banner — shown when AI was unavailable */}
      {isFallback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg px-3 py-2 bg-semantic-warning-surface border border-semantic-warning/30 text-semantic-warning text-xs"
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          AI unavailable — keyword results shown instead
        </div>
      )}

      {/* Answer paragraph */}
      <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
        {answer}
      </p>

      {/* Citation cards */}
      {citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Sources</p>
          <ul className="space-y-1.5" aria-label="Source articles">
            {citations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenArticle?.(c.id)}
                  className="w-full text-left rounded-md border-l-2 border-brand-navy bg-neutral-50 dark:bg-neutral-900 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors"
                  aria-label={c.title || c.id}
                >
                  <p className="text-xs font-semibold text-brand-navy dark:text-blue-300 truncate">
                    {c.title || c.id}
                  </p>
                  {c.excerpt && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{c.excerpt}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI provenance footer */}
      {meta && <AiMetaBadge meta={meta} />}
    </div>
  );
}
