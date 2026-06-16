// TemplatePickerModal.jsx — simple template picker modal for the Knowledge view.
// WI-29: "New from template" flow — lists available workspace templates and lets the user
// pick one to pre-fill a new article's content body.
//
// Props:
//   workspaceId   — string
//   onApplyTemplate(template) — called with the selected template object
//   onClose       — called to dismiss the modal
//
// Self-fetching: loads templates from the existing templatesClient endpoint.
// Graceful degradation: if loading fails, shows an error state (no crash, no spinner loop).
// Design tokens only (RB-30 §1). Uses the Modal atom for focus trap + a11y.

import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { templatesClient } from '@/lib/knowledge-advanced';

export function TemplatePickerModal({ workspaceId, onApplyTemplate, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await templatesClient.list(workspaceId);
        if (!cancelled) setTemplates(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load templates.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  return (
    <Modal title="New article from template" onClose={onClose} size="lg">
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading templates">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-sm text-semantic-danger"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          subtitle="Create reusable templates in the Advanced Knowledge view, then start articles from them here."
        />
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto" role="listbox" aria-label="Choose a template">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => { onApplyTemplate(t); onClose(); }}
                className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {t.category && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-brand-navy/10 text-brand-navy">
                          {t.category}
                        </span>
                      )}
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {t.name}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{t.description}</p>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
