// "Save to Know" — drop-in quick-capture so users can document from anywhere in the app (a work
// item, a dashboard, a meeting) without navigating to the Know section. Self-contained: it lists the
// workspace's knowledge spaces, lets the user pick one + a title, creates a DRAFT article seeded with
// the captured content, and (optionally) links it back to the originating work item. One knowledge
// layer (RB-40 unification); workspace-scoped + RBAC enforced server-side. Design tokens only.

import { useState, useCallback, useRef, useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { knowledge } from '@/lib/knowledge';

/**
 * @param {Object} props
 * @param {string} props.workspaceId
 * @param {string} [props.defaultTitle]
 * @param {Function} [props.getContent]  () => markdown string seeded into the new article
 * @param {string} [props.linkWorkItemId] when set, the new article is linked to this work item
 * @param {Function} [props.onToast]      (msg, kind) => void
 * @param {Function} [props.onSaved]      (article) => void
 * @param {string} [props.variant]        'button' (default) | 'menuitem'
 */
export function SaveToKnowButton({ workspaceId, defaultTitle = '', getContent, linkWorkItemId, onToast, onSaved, variant = 'button' }) {
  const [open, setOpen] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [spaceId, setSpaceId] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick); };
  }, [open]);

  const toast = useCallback((m, k) => { if (onToast) onToast(m, k); }, [onToast]);

  const openPopover = () => {
    setOpen(true);
    setTitle(defaultTitle);
    setError(null);
    setLoadingSpaces(true);
    knowledge.listSpaces()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSpaces(list);
        setSpaceId((prev) => prev || (list[0] ? list[0].id : ''));
      })
      .catch(() => setError('Could not load knowledge spaces.'))
      .finally(() => setLoadingSpaces(false));
  };

  const save = async () => {
    if (!title.trim()) { setError('A title is required.'); return; }
    if (!spaceId) { setError('Pick a space.'); return; }
    setBusy(true);
    setError(null);
    try {
      const article = await knowledge.createArticle({
        spaceId,
        workspaceId,
        title: title.trim(),
        content: getContent ? (getContent() || '') : '',
        templateType: 'KB',
        status: 'DRAFT',
      });
      if (linkWorkItemId && article?.id) {
        try { await knowledge.linkWorkItem(article.id, linkWorkItemId); } catch { /* linking is best-effort */ }
      }
      toast('Saved to Know as a draft.', 'success');
      onSaved?.(article);
      setOpen(false);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const triggerClass = variant === 'menuitem'
    ? 'w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-800'
    : 'inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40';

  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" onClick={openPopover} aria-haspopup="dialog" aria-expanded={open} className={triggerClass}>
        <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
        Save to Know
      </button>
      {open && (
        <div role="dialog" aria-label="Save to Know" className="absolute right-0 top-9 z-overlay w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Save to Know</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <label className="block text-2xs uppercase tracking-wide font-semibold text-neutral-400">Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="mt-1 w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
            />
          </label>
          <label className="block text-2xs uppercase tracking-wide font-semibold text-neutral-400">Space
            {loadingSpaces ? (
              <div className="mt-1 h-8 rounded animate-pulse bg-neutral-100 dark:bg-neutral-800" aria-busy="true" aria-label="Loading spaces" />
            ) : (
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="mt-1 w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                {spaces.length === 0 && <option value="">No spaces</option>}
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </label>
          {error && <p className="text-xs text-semantic-danger">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="w-full text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy-tint disabled:opacity-50 rounded px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          >
            {busy ? 'Saving…' : 'Create draft'}
          </button>
        </div>
      )}
    </div>
  );
}
