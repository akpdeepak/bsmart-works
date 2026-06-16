// KR-033 — Persistent collapsible page tree for a Knowledge Space.
// Fetches GET /api/v1/knowledge-spaces/{spaceId}/tree (depth ≤ 4).
// Collapsed/expanded state persists per-space in localStorage.
// Drag-to-reorder within the same parent via HTML5 draggable API.
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, FileText, Plus } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { TEMPLATE_ICONS } from '@/components/knowledge/ArticleIconPicker';

function storageKey(spaceId) {
  return `know-tree-${spaceId}`;
}

function loadCollapsed(spaceId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(spaceId)) || '{}');
  } catch {
    return {};
  }
}

function saveCollapsed(spaceId, map) {
  try {
    localStorage.setItem(storageKey(spaceId), JSON.stringify(map));
  } catch { /* storage full — ignore */ }
}

function NodeIcon({ node }) {
  if (!node.icon) {
    const DefaultIcon = TEMPLATE_ICONS[node.templateType] || FileText;
    return <DefaultIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />;
  }
  if (node.icon.startsWith('lucide:')) {
    const name = node.icon.slice(7);
    const ResolvedIcon = TEMPLATE_ICONS[name] || FileText;
    return <ResolvedIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />;
  }
  return <span aria-hidden="true" className="text-sm leading-none">{node.icon}</span>;
}

function PageTreeNode({
  node, depth, collapsed, onToggle,
  activeArticleId, onSelectArticle,
  onDragStart, onDragOver, onDrop,
  dragOverId, setDragOverId,
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsed[node.id];
  const isActive = node.id === activeArticleId;
  const isDragOver = dragOverId === node.id;

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, node)}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(node.id); onDragOver(e, node); }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => { setDragOverId(null); onDrop(e, node); }}
        className={cn(
          'flex items-center gap-1 rounded-md px-1 py-1 cursor-pointer group transition-colors',
          'focus-within:ring-2 focus-within:ring-brand-navy-tint/40',
          isActive
            ? 'bg-brand-navy/10 text-brand-navy dark:text-blue-300'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
          isDragOver && 'ring-2 ring-brand-navy/40',
        )}
        style={{ paddingLeft: `${4 + depth * 14}px` }}
      >
        {/* Expand/collapse chevron — only when there are children */}
        <button
          type="button"
          aria-label={hasChildren ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}
          aria-expanded={hasChildren ? !isCollapsed : undefined}
          disabled={!hasChildren}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className={cn(
            'h-4 w-4 flex items-center justify-center rounded transition-transform flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
            hasChildren ? 'hover:bg-neutral-200 dark:hover:bg-neutral-700' : 'opacity-0 pointer-events-none',
            !isCollapsed && hasChildren && 'rotate-90',
          )}
        >
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>

        {/* Article icon */}
        <NodeIcon node={node} />

        {/* Article title — clicking selects the article */}
        <button
          type="button"
          onClick={() => onSelectArticle(node)}
          className="flex-1 min-w-0 text-left text-xs truncate focus-visible:outline-none"
        >
          {node.title || 'Untitled'}
        </button>

        {/* Status dot — show for non-DRAFT */}
        {node.status && node.status !== 'DRAFT' && (
          <span
            aria-label={node.status}
            title={node.status}
            className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', {
              'bg-semantic-success': node.status === 'PUBLISHED',
              'bg-semantic-warning': node.status === 'IN_REVIEW',
              'bg-neutral-400': node.status === 'ARCHIVED',
            })}
          />
        )}
      </div>

      {/* Children — rendered when not collapsed */}
      {hasChildren && !isCollapsed && (
        <ul role="group" className="mt-0.5">
          {node.children.map(child => (
            <PageTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              activeArticleId={activeArticleId}
              onSelectArticle={onSelectArticle}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * @param {{
 *   spaceId: string,
 *   activeArticleId: string|null,
 *   onSelectArticle: (node: object) => void,
 *   onNewArticle: () => void,
 *   onReorder: (articleId: string, newSortOrder: number) => void,
 *   recentArticles: Array<{id: string, title: string}>,
 * }} props
 */
export function PageTreeSidebar({ spaceId, activeArticleId, onSelectArticle, onNewArticle, onReorder, recentArticles = [] }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(spaceId));
  const [dragOverId, setDragOverId] = useState(null);
  const dragNodeRef = useRef(null);

  // Fetch tree when spaceId changes
  useEffect(() => {
    if (!spaceId) { setTree([]); return; }
    setLoading(true);
    api.send(`/knowledge-spaces/${encodeURIComponent(spaceId)}/tree`)
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [spaceId]);

  // Persist collapsed map when it changes
  useEffect(() => {
    saveCollapsed(spaceId, collapsed);
  }, [spaceId, collapsed]);

  // Reset collapsed state when space changes
  useEffect(() => {
    setCollapsed(loadCollapsed(spaceId));
  }, [spaceId]);

  const toggleCollapsed = useCallback((id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDragStart = useCallback((e, node) => {
    dragNodeRef.current = node;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetNode) => {
    e.preventDefault();
    const dragged = dragNodeRef.current;
    if (!dragged || dragged.id === targetNode.id) return;
    // Place dragged node immediately before targetNode: assign targetNode.sortOrder - 0.5
    // The server stores integer sort_order; we use a fractional value here and let the
    // parent normalise sort orders server-side on the next tree fetch.
    const newOrder = (targetNode.sortOrder ?? 0) - 1;
    onReorder?.(dragged.id, newOrder);
    dragNodeRef.current = null;
  }, [onReorder]);

  if (!spaceId) return null;

  return (
    <nav aria-label="Page tree" className="flex flex-col h-full">
      {loading ? (
        <div className="space-y-1.5 px-2 py-2" aria-busy="true" aria-label="Loading page tree">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-6 rounded animate-pulse bg-neutral-100 dark:bg-neutral-700" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <p className="text-xs text-neutral-400 text-center py-4 px-3">No articles in this space yet.</p>
      ) : (
        <ul role="tree" aria-label="Articles" className="flex-1 overflow-y-auto px-1 py-1 space-y-0.5">
          {tree.map(node => (
            <PageTreeNode
              key={node.id}
              node={node}
              depth={0}
              collapsed={collapsed}
              onToggle={toggleCollapsed}
              activeArticleId={activeArticleId}
              onSelectArticle={onSelectArticle}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
            />
          ))}
        </ul>
      )}

      {/* KR-036: recently viewed articles */}
      {recentArticles.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-700 px-2 py-2">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1 mb-1">
            Recently viewed
          </p>
          <ul data-testid="recent-articles" className="space-y-0.5">
            {recentArticles.map((art) => (
              <li key={art.id}>
                <button
                  type="button"
                  onClick={() => onSelectArticle(art)}
                  className={cn(
                    'flex items-center gap-1.5 w-full text-left rounded-md px-2 py-1 text-xs truncate transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                    art.id === activeArticleId
                      ? 'bg-brand-navy/10 text-brand-navy dark:text-blue-300'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  )}
                >
                  <FileText className="h-3 w-3 flex-shrink-0 text-neutral-400" aria-hidden="true" />
                  <span className="truncate">{art.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New article button at bottom */}
      <button
        type="button"
        onClick={onNewArticle}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-neutral-500 hover:text-brand-navy dark:hover:text-blue-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 mt-auto border-t border-neutral-100 dark:border-neutral-700"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        New article
      </button>
    </nav>
  );
}
