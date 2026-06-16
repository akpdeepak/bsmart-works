// KR-066 — Article public share link popover.
// Shown when a PUBLISHED article is selected. Lets the author generate, copy, and revoke
// the public share link. The link is served at /p/{token} (no auth required).
// KR-069: also shows an "Embed" section with an iframe snippet when a share token exists.
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Trash2, Code2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/works/button';

/**
 * @param {{
 *   articleId: string,
 *   token: string|null,
 *   onTokenChange: (token: string|null) => void,
 *   onClose: () => void,
 * }} props
 */
export function ArticleSharePopover({ articleId, token: initialToken, onTokenChange, onClose }) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [error, setError] = useState(null);
  const popoverRef = useRef(null);

  // Close on Escape or click outside
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const shareUrl = token
    ? `${window.location.origin}/p/${token}`
    : null;

  // KR-069: iframe embed snippet for the /embed/article/:token route.
  const embedUrl = token
    ? `${window.location.origin}/embed/article/${token}`
    : null;
  const embedSnippet = embedUrl
    ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" title="Article embed"></iframe>`
    : null;

  function handleGenerate() {
    setLoading(true);
    setError(null);
    api.send(`/articles/${articleId}/share`, { method: 'POST' })
      .then((data) => {
        const newToken = data.token;
        setToken(newToken);
        onTokenChange(newToken);
      })
      .catch(() => setError('Failed to generate link. Please try again.'))
      .finally(() => setLoading(false));
  }

  function handleRevoke() {
    setLoading(true);
    setError(null);
    api.send(`/articles/${articleId}/share`, { method: 'DELETE' })
      .then(() => {
        setToken(null);
        onTokenChange(null);
      })
      .catch(() => setError('Failed to revoke link. Please try again.'))
      .finally(() => setLoading(false));
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // KR-069: copy the iframe embed snippet to clipboard.
  function handleCopyEmbed() {
    if (!embedSnippet) return;
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Share article"
      className="absolute right-0 top-full mt-1 z-dropdown w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
          Share article
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share popover"
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          ×
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-semantic-danger">{error}</p>
      )}

      {token ? (
        <>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Anyone with this link can read this article without signing in.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              aria-label="Public share URL"
              className="flex-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-300 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Link copied' : 'Copy link'}
              disabled={loading}
              className="flex-shrink-0 p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied
                ? <Check className="h-3.5 w-3.5 text-semantic-success" aria-hidden="true" />
                : <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              }
            </button>
          </div>
          {/* KR-069: Embed section — iframe snippet for external embedding */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Code2 aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" />
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                Embed
              </p>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Paste this snippet into any external page to embed this article.
            </p>
            <div className="flex items-start gap-2">
              <textarea
                readOnly
                value={embedSnippet}
                aria-label="Iframe embed code"
                rows={3}
                className="flex-1 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-300 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              />
              <button
                type="button"
                onClick={handleCopyEmbed}
                aria-label={embedCopied ? 'Embed code copied' : 'Copy embed code'}
                disabled={loading}
                className="flex-shrink-0 p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {embedCopied
                  ? <Check className="h-3.5 w-3.5 text-semantic-success" aria-hidden="true" />
                  : <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                }
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRevoke}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Revoke link
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Generate a public link to share this article without requiring sign-in.
          </p>
          <Button
            variant="action"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating…' : 'Generate share link'}
          </Button>
        </>
      )}
    </div>
  );
}
