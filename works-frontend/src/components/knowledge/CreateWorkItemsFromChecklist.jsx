// CreateWorkItemsFromChecklist.jsx — converts unchecked checklist items in a MEETING_NOTES article
// into work items (KR-077). Shows a "Create N work items" button when unchecked items exist.
//
// Props:
//   blocks          — Block[]   current article blocks
//   articleTitle    — string    used as the description prefix
//   workspaceId     — string
//   onBlocksChange(blocks) — called with the updated block array after marking items checked
//
// RBAC: `create_items` — the backend enforces it; the frontend surfaces the failure message from
// the API error response (the button isn't hidden because the RBAC check is server-authoritative).
//
// Design tokens only (RB-30 §1). WCAG 2.1 AA (RB-30 §6).

import { useState } from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { api } from '@/lib/apiClient';

// Collect all unchecked checklist item texts across all checklist blocks.
function uncheckedItems(blocks) {
  const items = [];
  for (const block of (blocks || [])) {
    if (block.type !== 'checklist') continue;
    for (const item of (block.metadata?.items || [])) {
      if (!item.done) {
        items.push({ blockId: block.id, text: item.text });
      }
    }
  }
  return items;
}

// Return a copy of blocks with each matching checklist item marked done.
function markItemsDone(blocks, texts) {
  const textSet = new Set(texts);
  return blocks.map(block => {
    if (block.type !== 'checklist') return block;
    const updatedItems = (block.metadata?.items || []).map(item =>
      textSet.has(item.text) ? { ...item, done: true } : item
    );
    return { ...block, metadata: { ...block.metadata, items: updatedItems } };
  });
}

export function CreateWorkItemsFromChecklist({ blocks, articleTitle, workspaceId, onBlocksChange }) {
  const items = uncheckedItems(blocks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdCount, setCreatedCount] = useState(0);

  if (items.length === 0) return null;

  const handleCreate = async () => {
    if (loading || items.length === 0) return;
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      items.map(({ text }) =>
        api.send('/api/v1/work-items', {
          method: 'POST',
          body: {
            title: text,
            workspaceId,
            type: 'TASK',
            description: `From meeting notes: ${articleTitle || 'Untitled'}`,
          },
        })
      )
    );

    const fulfilled = results
      .map((r, i) => ({ result: r, item: items[i] }))
      .filter(({ result }) => result.status === 'fulfilled');

    const failed = results.filter(r => r.status === 'rejected');

    if (fulfilled.length > 0) {
      const createdTexts = fulfilled.map(({ item }) => item.text);
      const updated = markItemsDone(blocks, createdTexts);
      onBlocksChange(updated);
      setCreatedCount(c => c + fulfilled.length);
    }

    if (failed.length > 0) {
      const firstErr = failed[0].reason;
      const msg = firstErr?.message || 'Some work items could not be created.';
      setError(`${failed.length} item${failed.length > 1 ? 's' : ''} failed: ${msg}`);
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        variant="secondary"
        onClick={handleCreate}
        disabled={loading}
        aria-busy={loading}
        className="flex items-center gap-1.5"
      >
        <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {loading
          ? 'Creating…'
          : `Create ${items.length} work item${items.length > 1 ? 's' : ''}`}
      </Button>

      {createdCount > 0 && !loading && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded bg-semantic-success-surface text-semantic-success"
          aria-live="polite"
        >
          {createdCount} item{createdCount > 1 ? 's' : ''} created
        </span>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-xs text-semantic-danger"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
