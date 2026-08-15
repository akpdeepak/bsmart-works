import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { SearchAIAnswer } from '@/components/knowledge/SearchAIAnswer';
import { BulkActionBar } from '@/components/knowledge/BulkActionBar';
import { ArticleCard } from '@/components/knowledge/ArticleCard';

export function KnowledgeSearchView({
  filteredSearchResults,
  knowledgeSearch,
  filtersOpen,
  setFiltersOpen,
  searchStatusFilter,
  setSearchStatusFilter,
  searchTypeFilter,
  setSearchTypeFilter,
  searchDateFilter,
  setSearchDateFilter,
  setKnowledgeTab,
  setKnowledgeSearch,
  setAiAnswer,
  aiSearchBusy,
  aiAnswer,
  openArticleById,
  selectedIds,
  handleBulkArchive,
  handleBulkDelete,
  clearSelection,
  bulkBusy,
  selectArticle,
  toggleSelect,
  bulkMode,
  STATUS_FILTERS,
  TEMPLATE_TYPES
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-brand-navy dark:text-white">Search Results</h1>
        <span className="text-sm text-neutral-500">
          {filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? 's' : ''} for &ldquo;{knowledgeSearch}&rdquo;
        </span>
        <Button unstyled
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${filtersOpen ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {(searchStatusFilter.length > 0 || searchTypeFilter.length > 0 || searchDateFilter !== 'all') && (
            <span className="ml-1 h-4 w-4 flex items-center justify-center bg-brand-navy text-white rounded-full text-xs font-semibold">
              {searchStatusFilter.length + searchTypeFilter.length + (searchDateFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </Button>
        <Button unstyled
          onClick={() => { setKnowledgeTab('spaces'); setKnowledgeSearch(''); setAiAnswer(null); setSearchStatusFilter([]); setSearchTypeFilter([]); setSearchDateFilter('all'); setFiltersOpen(false); }}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          Clear
        </Button>
      </div>

      {filtersOpen && (
        <div className="mb-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <Button unstyled
                  key={s}
                  type="button"
                  onClick={() => setSearchStatusFilter((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )}
                  aria-pressed={searchStatusFilter.includes(s)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${searchStatusFilter.includes(s) ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500'}`}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Template</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_TYPES.map((t) => (
                <Button unstyled
                  key={t}
                  type="button"
                  onClick={() => setSearchTypeFilter((prev) =>
                    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                  )}
                  aria-pressed={searchTypeFilter.includes(t)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${searchTypeFilter.includes(t) ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500'}`}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Updated</p>
            <div className="flex gap-1.5">
              {[['all', 'All time'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([v, label]) => (
                <Button unstyled
                  key={v}
                  type="button"
                  onClick={() => setSearchDateFilter(v)}
                  aria-pressed={searchDateFilter === v}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${searchDateFilter === v ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500'}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {aiSearchBusy && (
        <div className="mb-4 rounded-lg border border-brand-navy-tint/30 bg-brand-navy-tint/5 p-4 animate-pulse" aria-busy="true" aria-label="AI is searching…">
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
        </div>
      )}
      {!aiSearchBusy && aiAnswer && (
        <div className="mb-4 rounded-lg border border-brand-navy-tint/30 bg-brand-navy-tint/5 p-4">
          <SearchAIAnswer
            answer={aiAnswer.answer}
            citations={aiAnswer.citations ?? []}
            meta={aiAnswer.meta}
            onOpenArticle={openArticleById}
          />
        </div>
      )}

      {filteredSearchResults.length === 0 && !aiAnswer ? (
        <EmptyState icon={Search} title="No results found" subtitle={`No articles match "${knowledgeSearch}". Try different keywords or adjust filters.`} />
      ) : (
        <div className="space-y-2">
          <BulkActionBar
            selectedIds={selectedIds}
            onArchive={handleBulkArchive}
            onDelete={handleBulkDelete}
            onClear={clearSelection}
            busy={bulkBusy}
          />
          {filteredSearchResults.map(art => (
            <ArticleCard key={art.id} art={art} onClick={() => selectArticle(art)} selected={selectedIds.has(art.id)} onToggleSelect={toggleSelect} bulkMode={bulkMode} />
          ))}
        </div>
      )}
    </div>
  );
}
