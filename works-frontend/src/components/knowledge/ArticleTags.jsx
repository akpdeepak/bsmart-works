// KR-034 — Tag/label picker for an article. Shows current tags as colored pills.
// In edit mode: clicking opens a popover to add/remove tags from workspace tag list.
import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { X, Plus } from 'lucide-react';

export function ArticleTags({ articleId, workspaceId, readOnly = false }) {
  const [tags, setTags] = useState([]);          // tags on this article
  const [allTags, setAllTags] = useState([]);    // all workspace tags
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!articleId || !workspaceId) return;
    api.send(`/articles/${articleId}/tags?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(d => setTags(Array.isArray(d) ? d : []))
      .catch(() => setTags([]));
    api.send(`/workspaces/${encodeURIComponent(workspaceId)}/article-tags`)
      .then(d => setAllTags(Array.isArray(d) ? d : []))
      .catch(() => setAllTags([]));
  }, [articleId, workspaceId]);

  const assignTag = async (tag) => {
    const newIds = [...new Set([...tags.map(t => t.id), tag.id])];
    await api.send(`/articles/${articleId}/tags`, { method: 'PUT', body: { tagIds: newIds, workspaceId } });
    setTags(prev => prev.find(t => t.id === tag.id) ? prev : [...prev, tag]);
  };

  const removeTag = async (tagId) => {
    const newIds = tags.filter(t => t.id !== tagId).map(t => t.id);
    await api.send(`/articles/${articleId}/tags`, { method: 'PUT', body: { tagIds: newIds, workspaceId } });
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Article tags">
      {tags.map(tag => (
        <span key={tag.id} className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', tag.color || 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300')}>
          {tag.name}
          {!readOnly && (
            <button type="button" aria-label={`Remove tag ${tag.name}`} onClick={() => removeTag(tag.id)}
              className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <div className="relative">
          <button type="button" aria-label="Add tag" aria-haspopup="listbox" aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-500">
            <Plus className="h-3 w-3" aria-hidden="true" /> Tag
          </button>
          {open && (
            <ul role="listbox" aria-label="Available tags"
              className="absolute top-full left-0 mt-1 z-dropdown w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-md text-sm py-1 max-h-40 overflow-y-auto">
              {allTags.filter(t => !tags.find(at => at.id === t.id)).map(tag => (
                <li key={tag.id} role="option" aria-selected="false">
                  <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    onClick={() => { assignTag(tag); setOpen(false); }}>
                    <span className={cn('inline-block w-2 h-2 rounded-full mr-1.5', tag.color?.split(' ')[0])} aria-hidden="true" />
                    {tag.name}
                  </button>
                </li>
              ))}
              {allTags.filter(t => !tags.find(at => at.id === t.id)).length === 0 && (
                <li className="px-3 py-2 text-neutral-400 text-xs">No more tags</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
