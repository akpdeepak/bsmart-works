import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, FileText, AlertCircle, Bookmark, X } from 'lucide-react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/works/atoms/tabs';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { Button } from '@/components/works/button';
import { IconButton } from '@/components/works/atoms/icon-button';
import { TypeBadge } from '@/components/works/work-item-type';
import { PriorityBadge } from '@/components/works/priority-badge';
import { StatusBadge } from '@/components/works/status-badge';
import { useSearch } from '@/hooks/queries/useSearch';
import { mergeViewState, readViewState } from '@/lib/view-state';

// Facet tab id → types array passed to searchClient.
const FACET_TYPES = {
  all:        ['work_items', 'articles'],
  work_items: ['work_items'],
  articles:   ['articles'],
};

// Work-item result row — shows TypeBadge + title + project + PriorityBadge + StatusBadge.
// Uses Button (ghost) so raw <button> doesn't appear in views/ (guardrail). className overrides
// the ghost defaults to produce the search-row look (no border from ghost; added manually).
function WorkItemRow({ item, onSelect, isFocused, onFocus }) {
  return (
    <Button
      variant="ghost"
      role="option"
      aria-selected={isFocused}
      tabIndex={-1}
      onFocus={onFocus}
      onMouseMove={onFocus}
      onClick={() => onSelect(item)}
      className={[
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-fast justify-start',
        isFocused
          ? 'border-brand-navy/20 bg-neutral-50 dark:bg-neutral-700/60 dark:border-neutral-600'
          : 'border-neutral-100 bg-white dark:bg-neutral-800 dark:border-neutral-700',
        'hover:border-brand-navy/20 hover:bg-neutral-50 dark:hover:bg-neutral-700/60',
      ].join(' ')}
    >
      <TypeBadge type={item.type} compact />
      <span className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {item.title}
      </span>
      {item.projectName && (
        <span className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400 hidden sm:inline">
          {item.projectName}
        </span>
      )}
      {item.priority && <PriorityBadge priority={item.priority} />}
      {item.status && (
        <StatusBadge category={item.statusCategory ?? 'todo'}>
          {item.status}
        </StatusBadge>
      )}
    </Button>
  );
}

// Article result row — shows FileText icon + title + space name + excerpt.
// Same Button/ghost pattern so no raw <button> in views/.
function ArticleRow({ article, onSelect, isFocused, onFocus }) {
  return (
    <Button
      variant="ghost"
      role="option"
      aria-selected={isFocused}
      tabIndex={-1}
      onFocus={onFocus}
      onMouseMove={onFocus}
      onClick={() => onSelect(article)}
      className={[
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-fast justify-start',
        isFocused
          ? 'border-brand-navy/20 bg-neutral-50 dark:bg-neutral-700/60 dark:border-neutral-600'
          : 'border-neutral-100 bg-white dark:bg-neutral-800 dark:border-neutral-700',
        'hover:border-brand-navy/20 hover:bg-neutral-50 dark:hover:bg-neutral-700/60',
      ].join(' ')}
    >
      <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {article.title}
        </p>
        {(article.spaceName || article.excerpt) && (
          <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
            {article.spaceName && <span>{article.spaceName}</span>}
            {article.spaceName && article.excerpt && <span className="mx-1">·</span>}
            {article.excerpt && <span>{article.excerpt}</span>}
          </p>
        )}
      </div>
    </Button>
  );
}

// Standalone search surface (WI-30). Unified text search over work items (BQL title-contains)
// and articles (FTS). Supports facet tabs (All / Work Items / Articles) + keyboard navigation
// (Up/Down to cycle, Enter to select). WCAG 2.1 AA: labelled input, role=list, role=option.
//
// Props:
//   workspaceId   (string)  — required; scopes both search requests.
//   onSelectItem  (fn)      — called with the work item object when a row is activated.
//   onSelectArticle (fn)    — called with the article object when a row is activated.
export default function SearchView({ workspaceId, onSelectItem, onSelectArticle }) {
  const [initialState] = useState(() => readViewState('search', { query: '', facet: 'all', saved: [] }));
  const [query, setQuery]   = useState(initialState.query);
  const [facet, setFacet]   = useState(FACET_TYPES[initialState.facet] ? initialState.facet : 'all');
  const [saved, setSaved]   = useState(Array.isArray(initialState.saved) ? initialState.saved : []);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef    = useRef(null);
  const resultsRef  = useRef(null);

  // Autofocus the search input on mount.
  useEffect(() => { inputRef.current?.focus(); }, []);

  const types = FACET_TYPES[facet] ?? FACET_TYPES.all;
  const { data, isLoading, isError } = useSearch(workspaceId, query, { types });

  const workItems = data?.workItems ?? [];
  const articles  = data?.articles  ?? [];

  // Flat list of all currently visible results (drives keyboard nav).
  const allResults = [
    ...workItems.map((r) => ({ kind: 'work_item', data: r })),
    ...articles.map((r)  => ({ kind: 'article',   data: r })),
  ];

  // Clamp focusIdx so it never exceeds the current result count. This is computed at render time
  // rather than via a setState-in-effect (which triggers a cascading re-render and fires a lint
  // warning). Keyboard handlers already bound-check before using this value.
  const safeFocusIdx = allResults.length > 0 ? Math.min(focusIdx, allResults.length - 1) : 0;

  const activate = useCallback((entry) => {
    if (!entry) return;
    if (entry.kind === 'work_item') onSelectItem?.(entry.data);
    else onSelectArticle?.(entry.data);
  }, [onSelectItem, onSelectArticle]);

  function updateQuery(nextQuery) {
    setQuery(nextQuery);
    setFocusIdx(0);
    mergeViewState('search', { query: nextQuery, facet, saved });
  }

  function updateFacet(nextFacet) {
    setFacet(nextFacet);
    setFocusIdx(0);
    mergeViewState('search', { query, facet: nextFacet, saved });
  }

  function saveRefinement() {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const id = `${facet}:${trimmed.toLowerCase()}`;
    const next = [{ id, query: trimmed, facet }, ...saved.filter((item) => item.id !== id)].slice(0, 8);
    setSaved(next);
    mergeViewState('search', { query: trimmed, facet, saved: next });
  }

  function applyRefinement(refinement) {
    setQuery(refinement.query);
    setFacet(FACET_TYPES[refinement.facet] ? refinement.facet : 'all');
    setFocusIdx(0);
    mergeViewState('search', { query: refinement.query, facet: refinement.facet, saved });
  }

  function removeRefinement(id) {
    const next = saved.filter((item) => item.id !== id);
    setSaved(next);
    mergeViewState('search', { query, facet, saved: next });
  }

  function onKeyDown(e) {
    if (!allResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => (i + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => (i - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(allResults[safeFocusIdx]);
    }
  }

  // Scroll focused result into view whenever it changes.
  useEffect(() => {
    const el = resultsRef.current?.querySelector(`[aria-selected="true"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [safeFocusIdx]);

  const showPrompt  = !isLoading && query.trim().length < 2;
  const showEmpty   = !isLoading && !isError && !showPrompt && allResults.length === 0;
  const showResults = !isLoading && !isError && !showPrompt && allResults.length > 0;

  return (
    <PageLayout title="Search">
      {/* Search input */}
      <div className="relative mb-6">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
        />
        <input
          ref={inputRef}
          type="search"
          role="searchbox"
          aria-label="Search work items, articles, and more"
          aria-controls="search-results"
          aria-autocomplete="list"
          placeholder="Search work items, articles, and more…"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className={[
            'h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm',
            'text-neutral-900 placeholder:text-neutral-400',
            'transition-colors duration-fast',
            'hover:border-neutral-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
            'focus-visible:ring-offset-2 focus-visible:border-brand-navy',
            'dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100',
          ].join(' ')}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={saveRefinement}
          disabled={query.trim().length < 2}
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          Save search
        </Button>
        {saved.map((refinement) => (
          <span key={refinement.id} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyRefinement(refinement)}
              className="h-auto px-0 py-0 text-xs"
            >
              {refinement.query}
              <span className="ml-1 text-neutral-500">/{refinement.facet.replace('_', ' ')}</span>
            </Button>
            <IconButton
              type="button"
              onClick={() => removeRefinement(refinement.id)}
              aria-label={`Remove saved search ${refinement.query}`}
              size="xs"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </IconButton>
          </span>
        ))}
      </div>

      {/* Facet tabs */}
      <Tabs value={facet} onValueChange={updateFacet}>
        <TabList aria-label="Search result type">
          <Tab value="all">All</Tab>
          <Tab value="work_items">Work Items</Tab>
          <Tab value="articles">Articles</Tab>
        </TabList>

        <TabPanel value={facet}>
          {/* Loading */}
          {isLoading && (
            <div aria-live="polite" aria-label="Searching">
              <ListSkeleton rows={6} className="mt-4" />
            </div>
          )}

          {/* Empty prompt — query too short */}
          {showPrompt && (
            <p className="mt-10 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Type to search across your workspace
            </p>
          )}

          {/* No results */}
          {showEmpty && (
            <EmptyState
              icon={Search}
              title={`No results for "${query}"`}
              subtitle="Try different keywords or switch to another tab."
            />
          )}

          {/* Error */}
          {isError && (
            <EmptyState
              icon={AlertCircle}
              title="Search unavailable"
              subtitle="Could not reach the search service. Try again in a moment."
            />
          )}

          {/* Results */}
          {showResults && (
            <div
              id="search-results"
              ref={resultsRef}
              role="list"
              aria-label="Search results"
              className="mt-4 space-y-1.5"
            >
              {workItems.length > 0 && (
                <section aria-label="Work items">
                  {facet === 'all' && (
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                      Work Items
                    </p>
                  )}
                  {workItems.map((item, idx) => (
                    <WorkItemRow
                      key={item.id}
                      item={item}
                      onSelect={(r) => onSelectItem?.(r)}
                      isFocused={safeFocusIdx === idx}
                      onFocus={() => setFocusIdx(idx)}
                    />
                  ))}
                </section>
              )}

              {articles.length > 0 && (
                <section aria-label="Articles" className={workItems.length > 0 ? 'mt-4' : ''}>
                  {facet === 'all' && (
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                      Articles
                    </p>
                  )}
                  {articles.map((art, artIdx) => {
                    const globalIdx = workItems.length + artIdx;
                    return (
                      <ArticleRow
                        key={art.id}
                        article={art}
                        onSelect={(r) => onSelectArticle?.(r)}
                        isFocused={safeFocusIdx === globalIdx}
                        onFocus={() => setFocusIdx(globalIdx)}
                      />
                    );
                  })}
                </section>
              )}
            </div>
          )}
        </TabPanel>
      </Tabs>
    </PageLayout>
  );
}
