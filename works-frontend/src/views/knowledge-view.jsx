import { useRef, useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Search, Folder, FileText, File as FileIcon, ArrowLeft, BookOpen,
  AlertTriangle, Pencil, Eye, ChevronRight, PanelRight,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { BlockEditor } from '@/components/BlockEditor';
import { BlockRenderer } from '@/components/BlockRenderer';
import { KnowAiPanel } from '@/components/knowledge/KnowAiPanel';
import { ArticleSummarizeButton } from '@/components/knowledge/ArticleSummarizeButton';
import { AiTextAssist } from '@/components/knowledge/AiTextAssist';
import { ArticleCover, COVER_GRADIENTS } from '@/components/knowledge/ArticleCover';
import { ArticleIconPicker } from '@/components/knowledge/ArticleIconPicker';
import { StatusBadge } from '@/components/knowledge/StatusBadge';
import { StatusTransitionPopover } from '@/components/knowledge/StatusTransitionPopover';
import { PageTreeSidebar } from '@/components/knowledge/PageTreeSidebar';
import { BlockCommentsPanel } from '@/components/knowledge/BlockCommentsPanel';
import { ArticleReactions } from '@/components/knowledge/ArticleReactions';
import { ArticleTags } from '@/components/knowledge/ArticleTags';
import { StarButton } from '@/components/knowledge/StarButton';
import { RelatedArticles } from '@/components/knowledge/RelatedArticles';
import { ArticlePropertiesPanel } from '@/components/knowledge/ArticlePropertiesPanel';
import { onPressKey, renderMd } from '@/lib/utils';
import { blocksText } from '@/lib/doc-stats';
import { makeAiAssist } from '@/lib/knowledge-ai';
import { capabilityEnabled } from '@/lib/ai';

// Plain text of an article for AI summary — block content when present, else the markdown body.
function articleText(article) {
  if (!article) return '';
  let blocks;
  try { blocks = JSON.parse(article.contentBlocks || '[]'); } catch { blocks = []; }
  if (Array.isArray(blocks) && blocks.length > 0) return blocksText(blocks);
  return article.content || '';
}

// Preview text for article list cards — uses blocksText() for block-format articles so they never
// show an empty snippet in the list (previously art.content was always empty for block articles).
function articlePreview(art, maxLen = 120) {
  let text = art.content || '';
  try {
    const blocks = JSON.parse(art.contentBlocks || '[]');
    if (Array.isArray(blocks) && blocks.length > 0) text = blocksText(blocks);
  } catch { /* keep art.content fallback */ }
  const trimmed = text.trim();
  return trimmed.length > maxLen ? `${trimmed.substring(0, maxLen)}…` : trimmed;
}

// KR-043: parse filter syntax from search query, e.g. "status:DRAFT tag:urgent deploy notes"
// Returns { q: mainQuery, status?, tag?, type?, author? }
function parseSearchQuery(raw) {
  const filters = {};
  const words = [];
  for (const token of (raw || '').trim().split(/\s+/)) {
    const m = token.match(/^(\w+):(.+)$/);
    if (m && ['status', 'tag', 'type', 'author'].includes(m[1])) {
      filters[m[1]] = m[2];
    } else if (token) {
      words.push(token);
    }
  }
  return { q: words.join(' '), ...filters };
}

const STATUS_CHIP = {
  PUBLISHED: 'bg-semantic-success-surface text-semantic-success',
  DRAFT:     'bg-neutral-100 dark:bg-neutral-700 text-neutral-500',
  IN_REVIEW: 'bg-semantic-warning-surface text-semantic-warning',
  ARCHIVED:  'bg-neutral-200 dark:bg-neutral-600 text-neutral-500',
};

// Shared article list card — used in both the space view and search results.
function ArticleCard({ art, onClick }) {
  const preview = articlePreview(art);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={onPressKey}
      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{art.title}</p>
          {preview && (
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{preview}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-neutral-500">v{art.versionNumber || 1} · {art.authorName || 'Unknown'}</span>
            {art.updatedAt && (
              <span className="text-xs text-neutral-500">{new Date(art.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_CHIP[art.status] || STATUS_CHIP.DRAFT}`}>
            {art.status || 'DRAFT'}
          </span>
          <span className="text-xs bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded font-mono">
            {art.templateType || 'KB'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * KnowledgeView — knowledge base: spaces, articles, block editor, version history,
 * comments, and analytics.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 *
 * Note: the "New Space" and "New Article" modals (isSpaceFormOpen / isArticleFormOpen)
 * remain in App.jsx because they live outside this block in the original code.
 */
export default function KnowledgeView({
  knowledgeSearch,
  knowledgeTab,
  knowledgeSpaces,
  selectedSpace,
  selectedArticle,
  editingArticle,
  articlePanel,
  knowledgeSearchResults,
  knowledgeArticles,
  articleVersions,
  articleComments,
  articleAnalytics,
  newArticleComment,
  can,
  setKnowledgeSearch,
  setKnowledgeTab,
  setSelectedSpace,
  setSelectedArticle,
  setEditingArticle,
  setArticlePanel,
  setNewArticleComment,
  setIsSpaceFormOpen,
  setIsArticleFormOpen,
  setArticleForm,
  searchKnowledge,
  fetchKnowledgeArticles,
  deleteKnowledgeSpace,
  updateArticle,
  submitArticleForReview,
  publishArticle,
  archiveArticle,
  restoreArticle,
  deleteArticle,
  addArticleComment,
  toggleArticleComment,
  deleteArticleComment,
  openArticlePanel,
  rejectArticle,
  articleChildren = [],
  fetchArticleChildren,
  fetchArticleDetail,
  knowledgeSpacesLoading = false,
  knowledgeArticlesLoading = false,
  workspaceId,
  currentUserId,
  aiCapabilities = [],
}) {
  const aiGenEnabled = capabilityEnabled(aiCapabilities, 'generation');
  const aiAssist = makeAiAssist(workspaceId, aiGenEnabled);

  // KR-011: article properties panel state (persisted in localStorage)
  const [showProperties, setShowProperties] = useState(() => {
    try { return JSON.parse(localStorage.getItem('know-show-properties') || 'false'); } catch { return false; }
  });
  const toggleProperties = useCallback(() => {
    setShowProperties(p => {
      const next = !p;
      try { localStorage.setItem('know-show-properties', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // KR-012: focus / distraction-free mode
  const [focusMode, setFocusMode] = useState(false);

  // KR-036: recently viewed articles (localStorage, capped at 10, deduped by id)
  const recentKey = workspaceId ? `know-recent-${workspaceId}` : 'know-recent';
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch { return []; }
  });

  // KR-036: push article to recently viewed when selected
  useEffect(() => {
    if (!selectedArticle) return;
    setRecentlyViewed(prev => {
      const entry = { id: selectedArticle.id, title: selectedArticle.title, icon: selectedArticle.icon };
      const deduped = [entry, ...prev.filter(r => r.id !== selectedArticle.id)].slice(0, 10);
      try { localStorage.setItem(recentKey, JSON.stringify(deduped)); } catch { /* ignore */ }
      return deduped;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticle?.id]);

  // KR-012: Ctrl+Shift+F toggles focus mode; Escape exits
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFocusMode(f => !f);
      }
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focusMode]);

  // Block-editor autosave: persist quietly ~900ms after the last change instead of
  // PUT-on-every-keystroke (which previously fired a toast + version + list refetch per character).
  const saveTimer = useRef(null);
  const [blockSaveStatus, setBlockSaveStatus] = useState('idle'); // idle | saving | saved
  const scheduleBlockSave = (id, patch) => {
    setBlockSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      Promise.resolve(updateArticle(id, patch, { silent: true }))
        .then(() => setBlockSaveStatus('saved'))
        .catch(() => setBlockSaveStatus('idle'));
    }, 900);
  };
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // KR-009: cover image picker state
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState('');

  const applyCover = (val) => {
    setSelectedArticle((a) => ({ ...a, coverImage: val || null }));
    updateArticle(selectedArticle.id, { coverImage: val || null });
    setCoverPickerOpen(false);
  };

  // KR-010: icon change handler
  const applyIcon = (val) => {
    setSelectedArticle((a) => ({ ...a, icon: val }));
    updateArticle(selectedArticle.id, { icon: val });
  };

  // KR-017: status transition popover
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  // KR-033: page tree reorder — update sort_order via the article PUT endpoint
  const [treeVersion, setTreeVersion] = useState(0);
  const handleReorder = (articleId, newSortOrder) => {
    updateArticle(articleId, { sortOrder: newSortOrder }, { silent: true });
    setTreeVersion(v => v + 1);
  };

  // KR-025: block comments panel
  const [blockCommentPanel, setBlockCommentPanel] = useState({ open: false, blockId: null });

  // KR-041/KR-043: full-text search with 300ms debounce + advanced filter parsing
  const [ftsResults, setFtsResults] = useState([]);
  const [ftsOpen, setFtsOpen] = useState(false);
  const [parsedFilters, setParsedFilters] = useState({});
  const ftsTimer = useRef(null);
  const handleSearchInput = (e) => {
    const raw = e.target.value;
    setKnowledgeSearch(raw);
    if (ftsTimer.current) clearTimeout(ftsTimer.current);
    if (!raw.trim()) { setFtsResults([]); setFtsOpen(false); setParsedFilters({}); return; }
    const { q, status, tag, type, author } = parseSearchQuery(raw);
    setParsedFilters({ status, tag, type, author });
    if (!q.trim() && !status && !tag && !type && !author) { setFtsResults([]); setFtsOpen(false); return; }
    ftsTimer.current = setTimeout(() => {
      import('@/lib/apiClient').then(({ api }) => {
        const url = new URL('/articles/search', 'http://x');
        if (q.trim()) url.searchParams.set('q', q.trim());
        else url.searchParams.set('q', '*');
        if (status) url.searchParams.set('status', status);
        if (tag) url.searchParams.set('tag', tag);
        if (type) url.searchParams.set('templateType', type);
        if (author) url.searchParams.set('authorId', author);
        api.send(url.pathname + url.search)
          .then(data => { setFtsResults(Array.isArray(data) ? data : []); setFtsOpen(true); })
          .catch(() => { setFtsResults([]); setFtsOpen(false); });
      });
    }, 300);
  };
  useEffect(() => () => { if (ftsTimer.current) clearTimeout(ftsTimer.current); }, []);

  // Navigation stack for sub-article drilling: Back returns to the direct parent article
  // rather than jumping to the flat list. Breadcrumbs show the full ancestor path.
  const [navStack, setNavStack] = useState([]);

  // Open an article from the list/search/AI panel — always a fresh top-level navigation.
  const selectArticle = (art) => {
    if (!art) return;
    setNavStack([]);
    setSelectedArticle(art);
    setEditingArticle(false);
    setArticlePanel(null);
    fetchArticleChildren?.(art.id);
    fetchArticleDetail?.(art.id);
  };

  // Drill into a sub-article, pushing the current article onto the nav stack.
  const selectSubArticle = (child) => {
    if (!child) return;
    setNavStack((prev) => [...prev, selectedArticle]);
    setSelectedArticle(child);
    setEditingArticle(false);
    setArticlePanel(null);
    fetchArticleChildren?.(child.id);
    fetchArticleDetail?.(child.id);
  };

  // Navigate back: pop the parent from the stack, or go to the article list if stack is empty.
  const goBack = () => {
    if (navStack.length > 0) {
      const parent = navStack[navStack.length - 1];
      setNavStack((prev) => prev.slice(0, -1));
      setSelectedArticle(parent);
      setEditingArticle(false);
      setArticlePanel(null);
      fetchArticleChildren?.(parent.id);
      fetchArticleDetail?.(parent.id);
    } else {
      setSelectedArticle(null);
      setEditingArticle(false);
      setArticlePanel(null);
    }
  };

  // Open a cited article from the KB AI panel if it is already in the loaded list.
  const openArticleById = (id) => {
    const found = [...(knowledgeArticles || []), ...(knowledgeSearchResults || [])].find((a) => a.id === id);
    if (found) selectArticle(found);
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar — spaces ──────────────────────────────────── */}
      <div className={`w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col${focusMode ? ' hidden' : ''}`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Knowledge Spaces</h2>
            <button
              onClick={() => setIsSpaceFormOpen(true)}
              className="w-6 h-6 flex items-center justify-center rounded bg-brand-navy text-white text-sm hover:bg-brand-navy-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              title="New space"
            >+</button>
          </div>
          {/* KR-041: search bar with 300ms debounce FTS + KR-042 excerpt dropdown */}
          <div className="relative">
            <input
              type="search"
              role="combobox"
              aria-label="Search articles"
              aria-expanded={ftsOpen}
              aria-haspopup="listbox"
              aria-controls="fts-listbox"
              aria-autocomplete="list"
              placeholder="Search articles… (Ctrl+K)"
              value={knowledgeSearch}
              onChange={handleSearchInput}
              onKeyDown={e => {
                if (e.key === 'Escape') { setFtsOpen(false); }
                if (e.key === 'Enter') { searchKnowledge(); setKnowledgeTab('search'); setFtsOpen(false); }
              }}
              onBlur={() => setTimeout(() => setFtsOpen(false), 150)}
              className="input text-xs pl-6 py-1.5 w-full"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </span>

            {/* KR-043: active filter chips shown below the search input */}
            {(parsedFilters.status || parsedFilters.tag || parsedFilters.type || parsedFilters.author) && (
              <div className="flex gap-1 flex-wrap mt-1">
                {Object.entries(parsedFilters).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy dark:bg-brand-orange/10 dark:text-brand-orange">
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}

            {/* KR-042: FTS results dropdown with excerpt highlights */}
            {ftsOpen && ftsResults.length > 0 && (
              <ul
                id="fts-listbox"
                role="listbox"
                aria-label="Search results"
                className="absolute left-0 top-full mt-1 z-dropdown w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto"
              >
                {ftsResults.map(r => (
                  <li key={r.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      onMouseDown={() => { selectArticle(r); setFtsOpen(false); setKnowledgeSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                    >
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{r.title}</p>
                      {r.excerpt && (
                        <p
                          className="text-xs text-neutral-500 mt-0.5 line-clamp-2 [&_mark]:bg-brand-orange/20 [&_mark]:text-brand-orange [&_mark]:font-medium [&_mark]:rounded-sm"
                          dangerouslySetInnerHTML={{
                            __html: typeof DOMPurify !== 'undefined'
                              ? DOMPurify.sanitize(r.excerpt, { ALLOWED_TAGS: ['mark'] })
                              : r.excerpt.replace(/<(?!\/?(mark))[^>]+>/g, '')
                          }}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* All articles shortcut */}
        <div className="px-2 py-1">
          <button
            onClick={() => { setSelectedSpace(null); setSelectedArticle(null); setKnowledgeTab('all'); fetchKnowledgeArticles(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${knowledgeTab === 'all' && !selectedSpace ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            All Articles
          </button>
        </div>

        {/* KR-036: Recently viewed articles */}
        {recentlyViewed.length > 0 && !knowledgeSearch && (
          <section aria-label="Recently viewed" className="px-2 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-3 py-1">Recent</h3>
            {recentlyViewed.slice(0, 5).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => openArticleById(item.id)}
                className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                {item.icon ? <span className="mr-1.5">{item.icon}</span> : null}
                {item.title || 'Untitled'}
              </button>
            ))}
          </section>
        )}

        {/* Space list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {knowledgeSpacesLoading && knowledgeSpaces.length === 0 ? (
            <div className="space-y-1.5 px-1 py-2" aria-busy="true" aria-label="Loading spaces">
              {[0, 1, 2].map(i => <div key={i} className="h-8 rounded-lg animate-pulse bg-neutral-100 dark:bg-neutral-700" />)}
            </div>
          ) : knowledgeSpaces.length === 0 && !knowledgeSpacesLoading ? (
            <p className="text-xs text-neutral-500 text-center py-6 px-3 leading-relaxed">
              No spaces yet.<br />Create one to get started.
            </p>
          ) : null}
          {knowledgeSpaces.map(space => (
            <div key={space.id}>
              <button
                onClick={() => { setSelectedSpace(space); setSelectedArticle(null); setEditingArticle(false); setKnowledgeTab('space'); fetchKnowledgeArticles(space.id); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors group flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${selectedSpace?.id === space.id ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {space.icon ? <span>{space.icon}</span> : <Folder className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
                  <span className="truncate">{space.name}</span>
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ml-1 ${space.visibility === 'PUBLIC' ? 'bg-semantic-success-surface text-semantic-success' : space.visibility === 'PRIVATE' ? 'bg-semantic-danger-surface text-semantic-danger' : 'bg-brand-navy/10 text-brand-navy'}`}>
                  {space.visibility || 'TEAM'}
                </span>
              </button>

              {/* KR-033: page tree — rendered inline below the selected space */}
              {selectedSpace?.id === space.id && (
                <div className="ml-2 mt-0.5 mb-1">
                  <PageTreeSidebar
                    key={`${space.id}-${treeVersion}`}
                    spaceId={space.id}
                    activeArticleId={selectedArticle?.id}
                    onSelectArticle={(node) => {
                      const art = knowledgeArticles?.find(a => a.id === node.id) || node;
                      selectArticle(art);
                    }}
                    onNewArticle={() => {
                      setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT', spaceId: space.id });
                      setIsArticleFormOpen(true);
                    }}
                    onReorder={handleReorder}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Article list panel */}
        {!selectedArticle && (
          <div className="flex-1 overflow-y-auto p-6">
            {aiAssist && knowledgeTab !== 'search' && (
              <div className="mb-5">
                <KnowAiPanel workspaceId={workspaceId} onOpenArticle={openArticleById} />
              </div>
            )}

            {knowledgeTab === 'search' ? (
              /* ── Search results ── */
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-xl font-bold text-brand-navy dark:text-white">Search Results</h1>
                  <span className="text-sm text-neutral-500">
                    {knowledgeSearchResults.length} result{knowledgeSearchResults.length !== 1 ? 's' : ''} for &ldquo;{knowledgeSearch}&rdquo;
                  </span>
                  <button
                    onClick={() => { setKnowledgeTab('spaces'); setKnowledgeSearch(''); }}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  >
                    Clear
                  </button>
                </div>
                {knowledgeSearchResults.length === 0 ? (
                  <EmptyState icon={Search} title="No results found" subtitle={`No articles match "${knowledgeSearch}". Try different keywords.`} />
                ) : (
                  <div className="space-y-2">
                    {knowledgeSearchResults.map(art => (
                      <ArticleCard key={art.id} art={art} onClick={() => selectArticle(art)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (selectedSpace || knowledgeTab === 'all') ? (
              /* ── Space / All Articles ── */
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {selectedSpace && (
                      <button
                        onClick={() => { setSelectedSpace(null); setKnowledgeTab('spaces'); }}
                        className="text-xs text-neutral-500 hover:text-brand-navy transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        Spaces
                      </button>
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-brand-navy dark:text-white">
                        {selectedSpace ? selectedSpace.name : 'All Articles'}
                      </h1>
                      {selectedSpace?.description && (
                        <p className="text-xs text-neutral-500 mt-0.5">{selectedSpace.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSpace && can('manage_projects') && (
                      <button
                        onClick={() => deleteKnowledgeSpace(selectedSpace.id)}
                        className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                      >
                        Delete Space
                      </button>
                    )}
                    {selectedSpace && (
                      <Button
                        variant="action"
                        onClick={() => { setIsArticleFormOpen(true); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); }}
                      >
                        + New Article
                      </Button>
                    )}
                  </div>
                </div>

                {knowledgeArticlesLoading && knowledgeArticles.length === 0 ? (
                  <div className="space-y-2" aria-busy="true" aria-label="Loading articles">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-neutral-100 dark:bg-neutral-800" />)}
                  </div>
                ) : knowledgeArticles.length === 0 ? (
                  <EmptyState
                    icon={FileIcon}
                    title={selectedSpace ? `No articles in ${selectedSpace.name}` : 'No articles'}
                    subtitle="Create your first article to capture knowledge for the team."
                    action={selectedSpace && (
                      <Button variant="action" onClick={() => setIsArticleFormOpen(true)}>Write Article</Button>
                    )}
                  />
                ) : (
                  <div className="space-y-2">
                    {knowledgeArticles.map(art => (
                      <ArticleCard key={art.id} art={art} onClick={() => selectArticle(art)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Select a space"
                subtitle="Choose a knowledge space from the left sidebar to browse articles, or search for specific content."
              />
            )}
          </div>
        )}

        {/* ── Article detail / editor panel ── */}
        {selectedArticle && (
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Header — two rows so the action strip never overflows on long titles */}
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 bg-white dark:bg-neutral-800 flex-shrink-0">

              {/* Row 1: back arrow + title + status/meta */}
              <div className="flex items-start gap-3">
                <button
                  onClick={goBack}
                  className="mt-0.5 text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  aria-label={navStack.length > 0 ? `Back to ${navStack[navStack.length - 1].title}` : 'Back to article list'}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="flex-1 min-w-0">
                  {navStack.length > 0 && (
                    <nav aria-label="Article breadcrumb" className="flex items-center gap-1 text-xs text-neutral-500 mb-0.5 flex-wrap">
                      {navStack.map((ancestor, i) => (
                        <span key={ancestor.id} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0" />}
                          <button
                            type="button"
                            onClick={() => {
                              setNavStack(navStack.slice(0, i));
                              setSelectedArticle(ancestor);
                              setEditingArticle(false);
                              setArticlePanel(null);
                              fetchArticleChildren?.(ancestor.id);
                              fetchArticleDetail?.(ancestor.id);
                            }}
                            className="hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded truncate max-w-32"
                          >
                            {ancestor.title}
                          </button>
                        </span>
                      ))}
                      <ChevronRight aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0" />
                    </nav>
                  )}
                  <div className="flex items-center gap-1.5">
                    {editingArticle && (
                      <ArticleIconPicker
                        icon={selectedArticle.icon || null}
                        templateType={selectedArticle.templateType || 'KB'}
                        onPick={applyIcon}
                      />
                    )}
                    {!editingArticle && selectedArticle.icon && (
                      <span className="text-2xl leading-none" aria-hidden="true">{selectedArticle.icon.startsWith('lucide:') ? null : selectedArticle.icon}</span>
                    )}
                    <h1 className="font-bold text-lg text-neutral-900 dark:text-white truncate leading-tight">
                      {selectedArticle.title}
                    </h1>
                    {/* KR-035: star/favorite button */}
                    {workspaceId && (
                      <StarButton articleId={selectedArticle.id} workspaceId={workspaceId} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* KR-017: clickable status badge + transition popover */}
                    <div className="relative">
                      <StatusBadge
                        status={selectedArticle.status}
                        onClick={() => setStatusPopoverOpen((o) => !o)}
                      />
                      <StatusTransitionPopover
                        status={selectedArticle.status}
                        open={statusPopoverOpen}
                        onClose={() => setStatusPopoverOpen(false)}
                        onSubmit={() => { submitArticleForReview(selectedArticle.id); setSelectedArticle(a => ({ ...a, status: 'IN_REVIEW' })); }}
                        onPublish={() => { publishArticle(selectedArticle.id); setSelectedArticle(a => ({ ...a, status: 'PUBLISHED' })); }}
                        onReject={() => { rejectArticle(selectedArticle.id); setSelectedArticle(a => ({ ...a, status: 'DRAFT' })); }}
                        onArchive={() => { archiveArticle(selectedArticle.id); setSelectedArticle(a => ({ ...a, status: 'ARCHIVED' })); }}
                        onRestore={() => { restoreArticle(selectedArticle.id); setSelectedArticle(a => ({ ...a, status: 'DRAFT' })); }}
                      />
                    </div>
                    <span className="text-xs font-mono bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded">
                      {selectedArticle.templateType || 'KB'}
                    </span>
                    <span className="text-xs text-neutral-500">v{selectedArticle.versionNumber || 1}</span>
                    {selectedArticle.updatedAt && (
                      <span className="text-xs text-neutral-500">
                        Updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                    {/* KR-034: article tags */}
                    {workspaceId && (
                      <ArticleTags
                        articleId={selectedArticle.id}
                        workspaceId={workspaceId}
                        readOnly={!editingArticle}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: all action buttons — flex-wrap so they never clip */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2 ml-7">
                {[
                  { key: 'history',   label: `History (${articleVersions.length})` },
                  { key: 'comments',  label: `Comments (${articleComments.length})` },
                  { key: 'analytics', label: 'Analytics' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => openArticlePanel(p.key)}
                    aria-pressed={articlePanel === p.key}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${articlePanel === p.key ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
                  >
                    {p.label}
                  </button>
                ))}

                <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>

                {aiAssist && (
                  <ArticleSummarizeButton workspaceId={workspaceId} text={articleText(selectedArticle)} />
                )}

                <button
                  onClick={() => setEditingArticle(e => !e)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${editingArticle ? 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600' : 'border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white'}`}
                >
                  {editingArticle
                    ? <><Eye className="h-3.5 w-3.5" aria-hidden="true" />View</>
                    : <><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit</>
                  }
                </button>

                <button
                  onClick={() => deleteArticle(selectedArticle.id)}
                  className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                >
                  Delete
                </button>

                {editingArticle && (
                  <>
                    <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>
                    {selectedArticle.coverImage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setCoverUrlDraft(selectedArticle.coverImage); setCoverPickerOpen(true); }}
                          className="text-xs text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                        >
                          Change cover
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCover(null)}
                          className="text-xs text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                        >
                          Remove cover
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setCoverUrlDraft(''); setCoverPickerOpen(true); }}
                        className="text-xs text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                      >
                        Add cover
                      </button>
                    )}
                  </>
                )}
                {/* KR-011: Properties panel toggle */}
                <button
                  type="button"
                  onClick={toggleProperties}
                  aria-pressed={showProperties}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${showProperties ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
                >
                  <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Properties
                </button>
              </div>
            </div>

            {/* KR-012: Exit focus mode chip */}
            {focusMode && (
              <button
                type="button"
                aria-label="Exit focus mode"
                onClick={() => setFocusMode(false)}
                className="fixed top-3 right-4 z-modal text-xs bg-neutral-800/80 text-neutral-200 px-3 py-1.5 rounded-full hover:bg-neutral-700 transition-colors"
              >
                Exit focus
              </button>
            )}

            {/* Body: content area + optional side panel */}
            <div className="flex flex-1 overflow-hidden">

              {/* Content area — sub-articles live INSIDE this div, below the article body */}
              <div className="flex-1 overflow-y-auto p-6">
                {editingArticle ? (
                  /* ── Edit mode ── */
                  <div className={`space-y-4${focusMode ? ' max-w-3xl mx-auto' : ' max-w-3xl'}`}>
                    {/* KR-009: cover banner */}
                    <ArticleCover image={selectedArticle.coverImage} />

                    {/* KR-009: cover picker popover */}
                    {coverPickerOpen && (
                      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 p-4 space-y-3">
                        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">Cover image</p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            aria-label="Cover image URL"
                            value={coverUrlDraft}
                            onChange={(e) => setCoverUrlDraft(e.target.value)}
                            placeholder="https://… image URL"
                            className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                          />
                          <button type="button" onClick={() => applyCover(coverUrlDraft)}
                            className="text-xs px-3 py-1.5 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                            Use URL
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500">Or choose a gradient preset:</p>
                        <div className="grid grid-cols-6 gap-1.5">
                          {Object.entries(COVER_GRADIENTS).map(([key, cls]) => (
                            <button key={key} type="button" aria-label={key} title={key}
                              onClick={() => applyCover(`gradient:${key}`)}
                              className={`h-8 rounded-md ${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 hover:ring-2 hover:ring-brand-navy`}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => setCoverPickerOpen(false)}
                          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
                          Cancel
                        </button>
                      </div>
                    )}

                    <div>
                      <label htmlFor="article-title" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                        Title
                      </label>
                      <input
                        id="article-title"
                        className="input text-lg font-bold w-full"
                        value={selectedArticle.title || ''}
                        onChange={e => setSelectedArticle(a => ({ ...a, title: e.target.value }))}
                        onBlur={e => updateArticle(selectedArticle.id, { title: e.target.value, content: selectedArticle.content })}
                      />
                    </div>

                    <div className="flex items-end gap-4">
                      <div>
                        <label htmlFor="article-template-type" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                          Template Type
                        </label>
                        <select
                          id="article-template-type"
                          className="input text-sm w-48"
                          value={selectedArticle.templateType || 'KB'}
                          onChange={e => { const t = e.target.value; setSelectedArticle(a => ({ ...a, templateType: t })); updateArticle(selectedArticle.id, { templateType: t }); }}
                        >
                          {['KB', 'RUNBOOK', 'ADR', 'POSTMORTEM', 'ONBOARDING', 'TROUBLESHOOTING', 'CUSTOM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* KR-018 / KR-019 / KR-020 / KR-021 — workflow metadata */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 p-4 space-y-3">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Workflow
                      </p>

                      {/* KR-018: reviewer assignment */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="article-reviewer"
                          className="text-xs text-neutral-500 dark:text-neutral-400 w-28 flex-shrink-0"
                        >
                          Reviewer
                        </label>
                        <input
                          id="article-reviewer"
                          type="text"
                          aria-label="Reviewer ID"
                          defaultValue={selectedArticle.reviewerId || ''}
                          onBlur={e => {
                            const val = e.target.value.trim() || null;
                            setSelectedArticle(a => ({ ...a, reviewerId: val }));
                            updateArticle(selectedArticle.id, { reviewerId: val });
                          }}
                          placeholder="Assign reviewer\u2026"
                          className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 bg-white dark:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        />
                      </div>

                      {/* KR-021: review-by date */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="article-review-by"
                          className="text-xs text-neutral-500 dark:text-neutral-400 w-28 flex-shrink-0"
                        >
                          Review by
                        </label>
                        <input
                          id="article-review-by"
                          type="date"
                          aria-label="Review-by date"
                          value={selectedArticle.reviewByDate || ''}
                          onChange={e => {
                            const val = e.target.value || null;
                            setSelectedArticle(a => ({ ...a, reviewByDate: val }));
                            updateArticle(selectedArticle.id, { reviewByDate: val });
                          }}
                          className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 bg-white dark:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        />
                      </div>

                      {/* KR-020: scheduled publish — only for DRAFT or IN_REVIEW */}
                      {(!selectedArticle.status || selectedArticle.status === 'DRAFT' || selectedArticle.status === 'IN_REVIEW') && (
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="article-scheduled-publish"
                            className="text-xs text-neutral-500 dark:text-neutral-400 w-28 flex-shrink-0"
                          >
                            Scheduled publish
                          </label>
                          <input
                            id="article-scheduled-publish"
                            type="datetime-local"
                            aria-label="Scheduled publish date and time"
                            value={selectedArticle.scheduledPublishAt
                              ? selectedArticle.scheduledPublishAt.substring(0, 16)
                              : ''}
                            onChange={e => {
                              const val = e.target.value ? e.target.value + ':00Z' : null;
                              setSelectedArticle(a => ({ ...a, scheduledPublishAt: val }));
                              updateArticle(selectedArticle.id, { scheduledPublishAt: val });
                            }}
                            className="flex-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 bg-white dark:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                          />
                        </div>
                      )}

                      {/* KR-019: requires approval toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 w-28 flex-shrink-0">
                          Requires approval
                        </span>
                        <input
                          id="article-requires-approval"
                          type="checkbox"
                          aria-label="Requires approval before publishing"
                          checked={!!selectedArticle.requiresApproval}
                          onChange={e => {
                            const val = e.target.checked;
                            setSelectedArticle(a => ({ ...a, requiresApproval: val }));
                            updateArticle(selectedArticle.id, { requiresApproval: val });
                          }}
                          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        />
                        <label htmlFor="article-requires-approval" className="text-xs text-neutral-600 dark:text-neutral-400">
                          Approval required before publish
                        </label>
                      </div>
                    </div>

                    {/* Block editor — always used; markdown articles are migrated to a paragraph block on first edit */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Content · Block editor
                        </span>
                        {blockSaveStatus === 'saving' && (
                          <span className="text-2xs text-neutral-400" aria-live="polite">Saving…</span>
                        )}
                        {blockSaveStatus === 'saved' && (
                          <span className="text-2xs text-semantic-success" aria-live="polite">Saved</span>
                        )}
                      </div>
                      <BlockEditor
                        key={selectedArticle.id}
                        aiAssist={aiAssist}
                        workspaceId={workspaceId}
                        editingArticle={editingArticle}
                        blocks={(() => {
                          try {
                            const parsed = JSON.parse(selectedArticle.contentBlocks || '[]');
                            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                          } catch { /* fall through */ }
                          if (selectedArticle.content) {
                            return [{ id: `blk-migrate-${selectedArticle.id}`, type: 'paragraph', content: selectedArticle.content, metadata: {} }];
                          }
                          return [];
                        })()}
                        onChange={blocks => {
                          const json = JSON.stringify(blocks);
                          setSelectedArticle(a => ({ ...a, contentBlocks: json, contentFormat: 'blocks' }));
                          scheduleBlockSave(selectedArticle.id, { contentBlocks: json, contentFormat: 'blocks', templateType: selectedArticle.templateType });
                        }}
                      />
                    </div>

                    <Button
                      variant="action"
                      onClick={() => updateArticle(selectedArticle.id, {
                        title: selectedArticle.title,
                        contentBlocks: selectedArticle.contentBlocks,
                        contentFormat: 'blocks',
                        templateType: selectedArticle.templateType,
                      })}
                    >
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  /* ── Read mode ── */
                  <div className={focusMode ? 'max-w-3xl mx-auto' : 'max-w-3xl'}>
                    {/* KR-009: cover banner in read mode */}
                    <ArticleCover image={selectedArticle.coverImage} />
                    {(() => {
                      // Block-format articles render via BlockRenderer.
                      // Markdown articles render via renderMd. Neither should ever show nothing.
                      let blocks;
                      try { blocks = JSON.parse(selectedArticle.contentBlocks || '[]'); } catch { blocks = []; }

                      if (Array.isArray(blocks) && blocks.length > 0) {
                        return <BlockRenderer blocks={blocks} workspaceId={workspaceId} />;
                      }
                      if (selectedArticle.content) {
                        return (
                          <div
                            className="prose prose-sm dark:prose-invert text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap text-sm"
                            dangerouslySetInnerHTML={{ __html: renderMd(selectedArticle.content) }}
                          />
                        );
                      }
                      return (
                        <EmptyState
                          icon={FileText}
                          title="No content yet"
                          subtitle="This article is empty. Click Edit to start writing."
                          action={<Button variant="action" onClick={() => setEditingArticle(true)}>Start Writing</Button>}
                        />
                      );
                    })()}

                    {/* KR-029: emoji reactions strip below article content */}
                    <ArticleReactions
                      articleId={selectedArticle.id}
                      workspaceId={workspaceId}
                      currentUserId={currentUserId}
                    />

                    {/* Sub-articles — placed below the article body, inside the scrollable content
                        area. Previously they were a flex-row sibling of this div which broke the
                        layout by rendering them as a narrow column next to the content. */}
                    {articleChildren.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5" aria-hidden="true" />
                          Sub-articles ({articleChildren.length})
                        </h3>
                        <div className="space-y-1">
                          {articleChildren.map(child => (
                            <button
                              key={child.id}
                              onClick={() => selectSubArticle(child)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm text-brand-navy dark:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors group"
                            >
                              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" aria-hidden="true" />
                              <span className="flex-1 truncate group-hover:underline">{child.title}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${child.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                                {child.status || 'DRAFT'}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KR-045: related articles via shared tags */}
                    {workspaceId && (
                      <RelatedArticles
                        articleId={selectedArticle.id}
                        workspaceId={workspaceId}
                        onOpenArticle={openArticleById}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ── KR-025: Block comments panel ── */}
              <BlockCommentsPanel
                articleId={selectedArticle?.id}
                blockId={blockCommentPanel.blockId}
                workspaceId={workspaceId}
                currentUserId={null}
                open={blockCommentPanel.open}
                onClose={() => setBlockCommentPanel({ open: false, blockId: null })}
              />

              {/* KR-011: Article properties panel */}
              {showProperties && selectedArticle && !focusMode && (
                <ArticlePropertiesPanel
                  article={selectedArticle}
                  wordCount={(() => {
                    try {
                      const blocks = JSON.parse(selectedArticle.contentBlocks || '[]');
                      if (Array.isArray(blocks) && blocks.length > 0) return blocksText(blocks).trim().split(/\s+/).filter(Boolean).length;
                    } catch { /* ignore */ }
                    return (selectedArticle.content || '').trim().split(/\s+/).filter(Boolean).length;
                  })()}
                  onClose={toggleProperties}
                  readOnly={!editingArticle}
                />
              )}

              {/* ── Contextual side panels ── */}
              {!focusMode && articlePanel === 'history' && (
                <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Version history</h3>
                  {articleVersions.length === 0 ? (
                    <p className="text-xs text-neutral-500">No versions saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {articleVersions.map(v => (
                        <div key={v.id} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Version {v.versionNumber}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{v.savedBy || 'Unknown'}</p>
                          <p className="text-xs text-neutral-500">{v.savedAt ? new Date(v.savedAt).toLocaleString() : '—'}</p>
                          {/* Restore both markdown content and block content so block-format
                              articles restore correctly, not just their (empty) markdown body. */}
                          <button
                            onClick={() => setSelectedArticle(a => ({
                              ...a,
                              content: v.content ?? a.content,
                              contentBlocks: v.contentBlocks ?? a.contentBlocks,
                            }))}
                            className="text-xs text-brand-navy hover:underline mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!focusMode && articlePanel === 'comments' && (
                <div className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4 flex flex-col">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    Comments ({articleComments.length})
                  </h3>
                  <div className="flex-1 space-y-2">
                    {articleComments.length === 0 && (
                      <p className="text-xs text-neutral-500">No comments yet. Start the discussion below.</p>
                    )}
                    {articleComments.map(c => (
                      <div
                        key={c.id}
                        className={`rounded-lg p-3 border ${c.resolved ? 'bg-semantic-success-surface border-semantic-success/30' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{c.authorName || 'Unknown'}</span>
                          <span className="text-xs text-neutral-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{c.body}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            onClick={() => toggleArticleComment(selectedArticle.id, c.id, !c.resolved)}
                            className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                          >
                            {c.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => deleteArticleComment(selectedArticle.id, c.id)}
                            className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Add comment</span>
                      {aiAssist && (
                        <AiTextAssist
                          workspaceId={workspaceId}
                          getText={() => newArticleComment}
                          onApply={text => setNewArticleComment(text)}
                        />
                      )}
                    </div>
                    <textarea
                      rows={3}
                      aria-label="Add a comment"
                      value={newArticleComment}
                      onChange={e => setNewArticleComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="input resize-none text-xs w-full"
                    />
                    <Button variant="action" className="mt-2 w-full" onClick={() => addArticleComment(selectedArticle.id)}>
                      Comment
                    </Button>
                  </div>
                </div>
              )}

              {!focusMode && articlePanel === 'analytics' && (
                <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Analytics</h3>
                  {!articleAnalytics ? (
                    <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading article analytics">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                          <div className="h-3 w-6 bg-neutral-200 dark:bg-neutral-700 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { label: 'Views',               value: articleAnalytics.viewCount },
                        { label: 'Helpful votes',        value: articleAnalytics.helpfulVotes },
                        { label: 'Work-item citations',  value: articleAnalytics.citationCount },
                        { label: 'Open comments',        value: articleAnalytics.openComments },
                        { label: 'Versions',             value: articleAnalytics.versionCount },
                        { label: 'Days since update',    value: articleAnalytics.daysSinceUpdate },
                      ].map(m => (
                        <div key={m.label} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{m.label}</span>
                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{m.value ?? '—'}</span>
                        </div>
                      ))}
                      {articleAnalytics.stale && (
                        <div className="bg-semantic-warning-surface border border-semantic-warning/30 rounded-lg p-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-semantic-warning flex-shrink-0" aria-hidden="true" />
                          <span className="text-xs text-semantic-warning font-medium">
                            Stale — published over 90 days ago without an update.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
