import { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { KnowledgeSpaceView } from '@/components/knowledge/KnowledgeSpaceView';
import { KnowledgeSearchView } from '@/components/knowledge/KnowledgeSearchView';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import {
  Search, Folder, FileText, ArrowLeft,
  AlertTriangle, Pencil, Eye, ChevronRight,
  Copy, SlidersHorizontal, Share2, X, Home,
  ListTree, Download, Printer,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { BlockRenderer } from '@/components/BlockRenderer';
import { ArticleSummarizeButton } from '@/components/knowledge/ArticleSummarizeButton';
import { AiTextAssist } from '@/components/knowledge/AiTextAssist';
import { ArticleCover, COVER_GRADIENTS } from '@/components/knowledge/ArticleCover';
import { ArticleIconPicker } from '@/components/knowledge/ArticleIconPicker';
import { StatusBadge } from '@/components/knowledge/StatusBadge';
import { StatusTransitionPopover } from '@/components/knowledge/StatusTransitionPopover';
import { PageTreeSidebar } from '@/components/knowledge/PageTreeSidebar';
import { PresenceBar } from '@/components/works/molecules/presence-bar';
import { SearchModeToggle } from '@/components/knowledge/SearchModeToggle';
import { useSearchMode } from '@/hooks/use-search-mode';
import { PresenceAvatarRow } from '@/components/knowledge/PresenceAvatarRow';
import { ArticlePropertiesPanel } from '@/components/knowledge/ArticlePropertiesPanel';
import { ArticleReactions } from '@/components/knowledge/ArticleReactions';
import { ArticleTags } from '@/components/knowledge/ArticleTags';
import { StarButton } from '@/components/knowledge/StarButton';
import { WatchButton } from '@/components/knowledge/WatchButton';
import { RelatedArticles } from '@/components/knowledge/RelatedArticles';
import { ArticleSharePopover } from '@/components/knowledge/ArticleSharePopover';
import { useRecentArticles } from '@/hooks/use-recent-articles';
import { renderMd } from '@/lib/utils';
import { blocksText, countWords } from '@/lib/doc-stats';
import { articleText, articleOutline, parseArticleBlocks, safeDownloadName, downloadBlob } from './knowledge/knowledge-view-helpers';
import { downloadMarkdown } from '@/lib/export';
import { makeAiAssist, knowledgeAi } from '@/lib/knowledge-ai';
import { capabilityEnabled } from '@/lib/ai';
import { api } from '@/lib/apiClient';
import { useArticlePresence } from '@/hooks/use-article-presence';
import { useEditLock } from '@/hooks/use-edit-lock';

// Code-split the editor and the conditionally-rendered overlays (Phase 2 / W2-d): browsing Know
// must not download the 2k-line BlockEditor or the modals/panels a reader never opens. These are
// named exports, hence the { default } shim.
const BlockEditor = lazy(() => import('@/components/BlockEditor').then(m => ({ default: m.BlockEditor })));
const MeetingNotesAssistant = lazy(() => import('@/components/knowledge/MeetingNotesAssistant').then(m => ({ default: m.MeetingNotesAssistant })));
const CreateWorkItemsFromChecklist = lazy(() => import('@/components/knowledge/CreateWorkItemsFromChecklist').then(m => ({ default: m.CreateWorkItemsFromChecklist })));
const KnowAiPanel = lazy(() => import('@/components/knowledge/KnowAiPanel').then(m => ({ default: m.KnowAiPanel })));
const BlockCommentsPanel = lazy(() => import('@/components/knowledge/BlockCommentsPanel').then(m => ({ default: m.BlockCommentsPanel })));
const TemplatePickerModal = lazy(() => import('@/components/knowledge/TemplatePickerModal').then(m => ({ default: m.TemplatePickerModal })));
const KnowledgeRoadmapPanel = lazy(() => import('@/components/knowledge/KnowledgeRoadmapPanel').then(m => ({ default: m.KnowledgeRoadmapPanel })));

// Shared article list card — used in both the space view and search results.


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
  aiCapabilities = [],
  currentUser,
}) {
  const aiGenEnabled = capabilityEnabled(aiCapabilities, 'generation');
  const aiAssist = makeAiAssist(workspaceId, aiGenEnabled);

  // KR-036: recently-viewed articles (localStorage, no backend)
  const [recentArticles, addRecent] = useRecentArticles(workspaceId, currentUser?.id);

  // KR-038: bulk-operation selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkMode = can('manage_projects') || selectedIds.size > 0;

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // KR-038: bulk archive handler — calls POST /api/v1/articles/bulk-archive
  const handleBulkArchive = useCallback(() => {
    if (!workspaceId || selectedIds.size === 0) return;
    setBulkBusy(true);
    api.send('/articles/bulk-archive', {
      method: 'POST',
      body: { ids: [...selectedIds], workspaceId },
    })
      .then(() => { clearSelection(); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => {})
      .finally(() => setBulkBusy(false));
  }, [workspaceId, selectedIds, selectedSpace, clearSelection, fetchKnowledgeArticles]);

  // KR-038: bulk delete handler — calls POST /api/v1/articles/bulk-delete
  const handleBulkDelete = useCallback(() => {
    if (!workspaceId || selectedIds.size === 0) return;
    setBulkBusy(true);
    api.send('/articles/bulk-delete', {
      method: 'POST',
      body: { ids: [...selectedIds], workspaceId },
    })
      .then(() => { clearSelection(); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => {})
      .finally(() => setBulkBusy(false));
  }, [workspaceId, selectedIds, selectedSpace, clearSelection, fetchKnowledgeArticles]);

  // KR-011: Properties panel — persisted across sessions
  const [propertiesOpen, setPropertiesOpen] = useState(() => {
    try { return localStorage.getItem('know_props_open') === 'true'; } catch { return false; }
  });

  // KR-012: Focus mode — keyboard shortcut Ctrl+Shift+F
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        setFocusMode(prev => !prev);
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // KR-043: search filters
  const [searchStatusFilter, setSearchStatusFilter] = useState([]);   // [] = all
  const [searchTypeFilter, setSearchTypeFilter] = useState([]);        // [] = all
  const [searchDateFilter, setSearchDateFilter] = useState('all');     // 'all' | '7d' | '30d'
  const [filtersOpen, setFiltersOpen] = useState(false);

  const TEMPLATE_TYPES = ['KB', 'RUNBOOK', 'ADR', 'POSTMORTEM', 'ONBOARDING', 'TROUBLESHOOTING', 'MEETING_NOTES', 'CUSTOM'];
  const STATUS_FILTERS = ['PUBLISHED', 'DRAFT', 'IN_REVIEW', 'ARCHIVED'];

  const filteredSearchResults = (knowledgeSearchResults || []).filter((art) => {
    if (searchStatusFilter.length > 0 && !searchStatusFilter.includes(art.status)) return false;
    if (searchTypeFilter.length > 0 && !searchTypeFilter.includes(art.templateType)) return false;
    if (searchDateFilter !== 'all' && art.updatedAt) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (searchDateFilter === '7d' ? 7 : 30));
      if (new Date(art.updatedAt) < cutoff) return false;
    }
    return true;
  });

  // KR-066: share popover state
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(null);

  // KR-044: AI semantic search — search mode toggle + AI answer state
  const [searchMode, setSearchMode] = useSearchMode();
  const [aiAnswer, setAiAnswer] = useState(null);  // { answer, citations, meta } | null
  const [aiSearchBusy, setAiSearchBusy] = useState(false);

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

  // WI-29: SSE presence indicators — who else is viewing/editing this article
  const viewers = useArticlePresence(workspaceId, selectedArticle?.id, currentUser?.id);

  // WI-29: soft edit lock — first-come single editor; others see a read-only banner.
  // lockGranted=false means another user is editing; show read-only banner + disable editor.
  const { lockGranted, lockedBy } = useEditLock(
    workspaceId, selectedArticle?.id, currentUser?.id, editingArticle
  );

  // WI-29: template picker modal state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // KR-065: article-level presence — POST to /api/v1/articles/{id}/presence on mount/unmount/heartbeat.
  // Separate from the workspace-level SSE presence (useArticlePresence); this tracks per-article viewers.
  const [articlePresences, setArticlePresences] = useState([]);
  const presenceIntervalRef = useRef(null);
  const cursorRef = useRef({ cursorX: null, cursorY: null });
  useEffect(() => {
    const handlePointerMove = (event) => {
      cursorRef.current = {
        cursorX: Math.round((event.clientX / Math.max(1, window.innerWidth)) * 1000) / 10,
        cursorY: Math.round((event.clientY / Math.max(1, window.innerHeight)) * 1000) / 10,
      };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const articleId = selectedArticle?.id;
    if (!articleId || !workspaceId || !currentUser?.id) return;

    const wsParam = encodeURIComponent(workspaceId);

    const join = () => {
      api.send(`/articles/${encodeURIComponent(articleId)}/presence?workspaceId=${wsParam}`, {
        method: 'POST',
        body: { action: 'join', ...cursorRef.current },
      })
        .then((res) => {
          if (Array.isArray(res?.presences)) {
            setArticlePresences(res.presences.filter((p) => p.userId !== currentUser.id));
          }
        })
        .catch(() => {}); // non-fatal — presence is best-effort
    };

    join();
    presenceIntervalRef.current = setInterval(join, 20_000);

    return () => {
      clearInterval(presenceIntervalRef.current);
      // Best-effort leave signal on unmount.
      api.send(`/articles/${encodeURIComponent(articleId)}/presence?workspaceId=${wsParam}`, {
        method: 'POST',
        body: { action: 'leave' },
      }).catch(() => {});
      setArticlePresences([]);
    };
  }, [selectedArticle?.id, workspaceId, currentUser?.id]);

  // KR-041: full-text search with 300ms debounce
  const [ftsResults, setFtsResults] = useState([]);
  const [ftsOpen, setFtsOpen] = useState(false);
  const ftsTimer = useRef(null);
  const handleSearchInput = (e) => {
    const q = e.target.value;
    setKnowledgeSearch(q);
    if (ftsTimer.current) clearTimeout(ftsTimer.current);
    if (!q.trim()) { setFtsResults([]); setFtsOpen(false); return; }
    // Only run FTS debounce in keyword mode; AI mode submits on Enter/button click.
    if (searchMode === 'keyword') {
      ftsTimer.current = setTimeout(() => {
        api.send(`/articles/search?q=${encodeURIComponent(q)}`)
          .then(data => { setFtsResults(Array.isArray(data) ? data : []); setFtsOpen(true); })
          .catch(() => { setFtsResults([]); setFtsOpen(false); });
      }, 300);
    }
  };
  useEffect(() => () => { if (ftsTimer.current) clearTimeout(ftsTimer.current); }, []);

  // KR-044: AI search submission — called when user presses Enter or the search button in AI mode.
  const submitAiSearch = (query) => {
    if (!query.trim() || aiSearchBusy) return;
    setAiSearchBusy(true);
    setAiAnswer(null);
    knowledgeAi.ask(workspaceId, query.trim())
      .then((res) => setAiAnswer(res))
      .catch(() => setAiAnswer(null))
      .finally(() => setAiSearchBusy(false));
  };

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
    setSharePopoverOpen(false);
    setSelectedIds(new Set()); // clear any bulk selection
    addRecent(art); // KR-036: track recently viewed
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

  // KR-011: word count for the properties panel
  const wordCount = (() => {
    if (!selectedArticle) return 0;
    const blocks = parseArticleBlocks(selectedArticle);
    if (Array.isArray(blocks) && blocks.length > 0) return countWords(blocksText(blocks));
    return countWords(selectedArticle.content || '');
  })();

  const outline = articleOutline(selectedArticle);
  const articleBlocks = parseArticleBlocks(selectedArticle);

  const handleHeadingJump = (id) => {
    const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const target = document.querySelector(`[data-block-id="${safeId}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleArticleExport = async (format) => {
    if (!selectedArticle) return;
    if (format === 'print') {
      window.print();
      return;
    }
    if (format === 'md') {
      downloadMarkdown(selectedArticle.title, articleBlocks.length > 0
        ? articleBlocks
        : [{ id: 'content', type: 'paragraph', content: selectedArticle.content || '', metadata: {} }]);
      return;
    }
    if (!workspaceId) return;
    setExportBusy(format);
    try {
      const res = await api.raw(`/articles/${encodeURIComponent(selectedArticle.id)}/export/${format}?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      downloadBlob(await res.blob(), safeDownloadName(selectedArticle.title, format));
    } finally {
      setExportBusy(null);
    }
  };

  const [diffVersions, setDiffVersions] = useState({ from: '', to: '', loading: false, data: null, error: '' });
  useEffect(() => {
    if (articlePanel !== 'history' || articleVersions.length < 2) {
      setDiffVersions({ from: '', to: '', loading: false, data: null, error: '' });
      return;
    }
    setDiffVersions((prev) => ({
      ...prev,
      from: prev.from || String(articleVersions[1]?.versionNumber || ''),
      to: prev.to || String(articleVersions[0]?.versionNumber || ''),
    }));
  }, [articlePanel, articleVersions]);

  const loadVersionDiff = async () => {
    if (!selectedArticle?.id || !diffVersions.from || !diffVersions.to) return;
    setDiffVersions((prev) => ({ ...prev, loading: true, data: null, error: '' }));
    try {
      const data = await api.send(
        `/articles/${encodeURIComponent(selectedArticle.id)}/versions/${encodeURIComponent(diffVersions.from)}/diff/${encodeURIComponent(diffVersions.to)}`,
      );
      setDiffVersions((prev) => ({ ...prev, loading: false, data, error: '' }));
    } catch (error) {
      setDiffVersions((prev) => ({ ...prev, loading: false, data: null, error: error.message || 'Could not load diff.' }));
    }
  };

  // KR-022: duplicate the current article
  const handleDuplicate = async () => {
    if (!selectedArticle || !workspaceId) return;
    const newArticle = await api.send(
      '/articles/' + encodeURIComponent(selectedArticle.id) + '/duplicate?workspaceId=' + encodeURIComponent(workspaceId),
      { method: 'POST' },
    );
    await fetchKnowledgeArticles(selectedSpace?.id || null);
    if (newArticle) setSelectedArticle(newArticle);
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar — spaces ──────────────────────────────────── */}
      <div className={`w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col ${focusMode ? 'hidden' : ''}`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Knowledge Spaces</h2>
            <Button unstyled
              onClick={() => setIsSpaceFormOpen(true)}
              className="w-6 h-6 flex items-center justify-center rounded bg-brand-navy text-white text-sm hover:bg-brand-navy-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              title="New space"
            >+</Button>
          </div>
          {/* KR-041/KR-044: search bar with mode toggle + 300ms debounce FTS + KR-042 excerpt dropdown */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
          </div>
          <div className="relative">
            <input
              type="search"
              role="combobox"
              aria-label="Search articles"
              aria-expanded={ftsOpen}
              aria-haspopup="listbox"
              aria-controls="fts-listbox"
              aria-autocomplete="list"
              placeholder={searchMode === 'ai' ? 'Ask your knowledge base…' : 'Search articles… (Ctrl+K)'}
              value={knowledgeSearch}
              onChange={handleSearchInput}
              onKeyDown={e => {
                if (e.key === 'Escape') { setFtsOpen(false); }
                if (e.key === 'Enter') {
                  if (searchMode === 'ai') {
                    submitAiSearch(knowledgeSearch);
                    setKnowledgeTab('search');
                    setFtsOpen(false);
                  } else {
                    searchKnowledge();
                    setKnowledgeTab('search');
                    setFtsOpen(false);
                  }
                }
              }}
              onBlur={() => setTimeout(() => setFtsOpen(false), 150)}
              className="input text-xs pl-6 py-1.5 w-full"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </span>

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
                    <Button unstyled
                      type="button"
                      onMouseDown={() => { selectArticle(r); setFtsOpen(false); setKnowledgeSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                    >
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{r.title}</p>
                      {r.excerpt && (
                        <p
                          className="text-xs text-neutral-500 mt-0.5 line-clamp-2 [&_mark]:bg-brand-orange/20 [&_mark]:text-brand-orange [&_mark]:font-medium [&_mark]:rounded-sm"
                          dangerouslySetInnerHTML={{
                            __html: typeof window !== 'undefined' && window.DOMPurify
                              ? window.DOMPurify.sanitize(r.excerpt, { ALLOWED_TAGS: ['mark'] })
                              : r.excerpt.replace(/<(?!\/?(mark))[^>]+>/g, '')
                          }}
                        />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* All articles shortcut */}
        <div className="px-2 py-1">
          <Button unstyled
            onClick={() => { setSelectedSpace(null); setSelectedArticle(null); setKnowledgeTab('all'); fetchKnowledgeArticles(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${knowledgeTab === 'all' && !selectedSpace ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            All Articles
          </Button>
        </div>

        {/* KR-036: Recently viewed */}
        {recentArticles.length > 0 && (
          <section aria-label="Recently viewed" className="px-2 py-1 border-t border-neutral-100 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-3 py-1">Recent</p>
            {recentArticles.map(r => (
              <Button unstyled
                key={r.id}
                onClick={() => {
                  const art = [...(knowledgeArticles || []), ...(knowledgeSearchResults || [])].find(a => a.id === r.id) || r;
                  selectArticle(art);
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 truncate"
              >
                {r.icon ? <span aria-hidden="true">{r.icon}</span> : <FileText className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
                <span className="truncate">{r.title}</span>
              </Button>
            ))}
          </section>
        )}

        {/* Space list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {knowledgeSpaces.length === 0 && (
            <AsyncBoundary
              loading={knowledgeSpacesLoading}
              label="Loading spaces"
              className="space-y-1.5 px-1 py-2"
              skeleton={[0, 1, 2].map(i => <div key={i} className="h-8 rounded-lg animate-pulse bg-neutral-100 dark:bg-neutral-700" />)}
              empty
              emptyIcon={Folder}
              emptyTitle="No spaces yet"
              emptySubtitle="Create one to get started."
            />
          )}
          {knowledgeSpaces.map(space => (
            <div key={space.id}>
              <Button unstyled
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
              </Button>

              {/* KR-033: page tree — rendered inline below the selected space */}
              {selectedSpace?.id === space.id && (
                <div className="ml-2 mt-0.5 mb-1">
                  <PageTreeSidebar
                    key={`${space.id}-${treeVersion}`}
                    spaceId={space.id}
                    activeArticleId={selectedArticle?.id}
                    recentArticles={recentArticles.slice(0, 5)}
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
                <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-neutral-100" aria-hidden="true" />}>
                  <KnowAiPanel workspaceId={workspaceId} onOpenArticle={openArticleById} />
                </Suspense>
              </div>
            )}

            {knowledgeTab === 'search' ? (
              /* ── Search results ── */
              <KnowledgeSearchView
                filteredSearchResults={filteredSearchResults}
                knowledgeSearch={knowledgeSearch}
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
                searchStatusFilter={searchStatusFilter}
                setSearchStatusFilter={setSearchStatusFilter}
                searchTypeFilter={searchTypeFilter}
                setSearchTypeFilter={setSearchTypeFilter}
                searchDateFilter={searchDateFilter}
                setSearchDateFilter={setSearchDateFilter}
                setKnowledgeTab={setKnowledgeTab}
                setKnowledgeSearch={setKnowledgeSearch}
                setAiAnswer={setAiAnswer}
                aiSearchBusy={aiSearchBusy}
                aiAnswer={aiAnswer}
                openArticleById={openArticleById}
                selectedIds={selectedIds}
                handleBulkArchive={handleBulkArchive}
                handleBulkDelete={handleBulkDelete}
                clearSelection={clearSelection}
                bulkBusy={bulkBusy}
                selectArticle={selectArticle}
                toggleSelect={toggleSelect}
                bulkMode={bulkMode}
                STATUS_FILTERS={STATUS_FILTERS}
                TEMPLATE_TYPES={TEMPLATE_TYPES}
              />
            ) : (
              /* ── Space / All Articles ── */
              <KnowledgeSpaceView
                selectedSpace={selectedSpace}
                knowledgeTab={knowledgeTab}
                setSelectedSpace={setSelectedSpace}
                setKnowledgeTab={setKnowledgeTab}
                workspaceId={workspaceId}
                canManageProjects={can('manage_projects')}
                deleteKnowledgeSpace={deleteKnowledgeSpace}
                setTemplatePickerOpen={setTemplatePickerOpen}
                setIsArticleFormOpen={setIsArticleFormOpen}
                setArticleForm={setArticleForm}
                selectedIds={selectedIds}
                handleBulkArchive={handleBulkArchive}
                handleBulkDelete={handleBulkDelete}
                clearSelection={clearSelection}
                bulkBusy={bulkBusy}
                knowledgeArticlesLoading={knowledgeArticlesLoading}
                knowledgeArticles={knowledgeArticles}
                selectArticle={selectArticle}
                toggleSelect={toggleSelect}
                bulkMode={bulkMode}
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
                <Button unstyled
                  onClick={goBack}
                  className="mt-0.5 text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  aria-label={navStack.length > 0 ? `Back to ${navStack[navStack.length - 1].title}` : 'Back to article list'}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div className="flex-1 min-w-0">
                  {navStack.length > 0 && (
                    <nav aria-label="Article breadcrumb" className="flex items-center gap-1 text-xs text-neutral-500 mb-0.5 flex-wrap">
                      {navStack.map((ancestor, i) => (
                        <span key={ancestor.id} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0" />}
                          <Button unstyled
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
                          </Button>
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
                    {/* KR-034: article tags — shown in both view and edit mode */}
                    <ArticleTags
                      articleId={selectedArticle.id}
                      workspaceId={workspaceId}
                      readOnly={!editingArticle}
                    />
                  </div>
                </div>
              </div>

              {/* WI-29: presence bar — co-viewers + soft-lock banner */}
              {/* KR-065: article-level presence avatar row */}
              <div className="ml-7 mt-1.5 flex items-center gap-3">
                <PresenceBar viewers={viewers} lockGranted={lockGranted} lockedBy={lockedBy} />
                {articlePresences.length > 0 && (
                  <PresenceAvatarRow presences={articlePresences} />
                )}
              </div>

              {/* Row 2: all action buttons — flex-wrap so they never clip */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2 ml-7">
                {[
                  { key: 'history',   label: `History (${articleVersions.length})` },
                  { key: 'comments',  label: `Comments (${articleComments.length})` },
                  { key: 'analytics', label: 'Analytics' },
                ].map(p => (
                  <Button unstyled
                    key={p.key}
                    onClick={() => openArticlePanel(p.key)}
                    aria-pressed={articlePanel === p.key}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${articlePanel === p.key ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
                  >
                    {p.label}
                  </Button>
                ))}

                <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>

                {/* KR-035: star/favorite */}
                <StarButton articleId={selectedArticle.id} workspaceId={workspaceId} />

                {/* KR-067: watch/subscribe */}
                <WatchButton
                  articleId={selectedArticle.id}
                  workspaceId={workspaceId}
                  initialWatching={selectedArticle.watching ?? false}
                  initialCount={selectedArticle.watcherCount ?? 0}
                />

                {/* KR-066: share link — only for PUBLISHED articles */}
                {selectedArticle.status === 'PUBLISHED' && (
                  <div className="relative">
                    <Button unstyled
                      type="button"
                      onClick={() => setSharePopoverOpen((o) => !o)}
                      aria-expanded={sharePopoverOpen}
                      aria-label="Share article"
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${sharePopoverOpen ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Share
                    </Button>
                    {sharePopoverOpen && (
                      <ArticleSharePopover
                        articleId={selectedArticle.id}
                        articleTitle={selectedArticle.title}
                        token={selectedArticle.publicShareToken ?? null}
                        onTokenChange={(tok) => setSelectedArticle(a => ({ ...a, publicShareToken: tok }))}
                        onClose={() => setSharePopoverOpen(false)}
                      />
                    )}
                  </div>
                )}

                {/* KR-037: set as space home — available to managers in edit mode */}
                {editingArticle && selectedSpace && can('manage_projects') && (
                  <Button unstyled
                    type="button"
                    title="Set as space home page"
                    aria-label="Set as space home"
                    onClick={() => {
                      api.send(`/knowledge-spaces/${encodeURIComponent(selectedSpace.id)}/home-article`, {
                        method: 'PATCH',
                        body: { articleId: selectedArticle.id },
                      }).catch(() => {});
                    }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  >
                    <Home className="h-3.5 w-3.5" aria-hidden="true" />
                    Set home
                  </Button>
                )}

                <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>

                {aiAssist && (
                  <ArticleSummarizeButton workspaceId={workspaceId} text={articleText(selectedArticle)} />
                )}

                <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>

                <Button unstyled
                  type="button"
                  onClick={() => handleArticleExport('pdf')}
                  disabled={exportBusy === 'pdf'}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  PDF
                </Button>
                <Button unstyled
                  type="button"
                  onClick={() => handleArticleExport('docx')}
                  disabled={exportBusy === 'docx'}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  DOCX
                </Button>
                <Button unstyled
                  type="button"
                  onClick={() => handleArticleExport('md')}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Markdown
                </Button>
                <Button unstyled
                  type="button"
                  onClick={() => handleArticleExport('print')}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  Print
                </Button>

                {/* KR-077: convert unchecked action items to work items */}
                {selectedArticle.templateType === 'MEETING_NOTES' && (() => {
                  const blocks = parseArticleBlocks(selectedArticle);
                  return Array.isArray(blocks) && blocks.some(b => b.type === 'checklist' && (b.metadata?.items || []).some(i => !i.done)) ? (
                    <Suspense fallback={null}>
                      <CreateWorkItemsFromChecklist
                        blocks={blocks}
                        articleTitle={selectedArticle.title}
                        workspaceId={workspaceId}
                        onBlocksChange={(updated) => {
                          const json = JSON.stringify(updated);
                          setSelectedArticle(a => ({ ...a, contentBlocks: json }));
                          scheduleBlockSave(selectedArticle.id, { contentBlocks: json, contentFormat: 'blocks', templateType: selectedArticle.templateType });
                        }}
                      />
                    </Suspense>
                  ) : null;
                })()}

                <Button unstyled
                  onClick={() => setEditingArticle(e => !e)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${editingArticle ? 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600' : 'border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white'}`}
                >
                  {editingArticle
                    ? <><Eye className="h-3.5 w-3.5" aria-hidden="true" />View</>
                    : <><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit</>
                  }
                </Button>

                {/* KR-022: Duplicate article */}
                <Button unstyled
                  aria-label="Duplicate this article"
                  onClick={handleDuplicate}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Duplicate
                </Button>

                {/* KR-011: Properties panel toggle */}
                <Button unstyled
                  onClick={() => {
                    const next = !propertiesOpen;
                    setPropertiesOpen(next);
                    try { localStorage.setItem('know_props_open', String(next)); } catch { /* non-fatal */ }
                  }}
                  aria-pressed={propertiesOpen}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${propertiesOpen ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy'}`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Properties
                </Button>

                <Button unstyled
                  onClick={() => deleteArticle(selectedArticle.id)}
                  className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                >
                  Delete
                </Button>

                {editingArticle && (
                  <>
                    <span className="text-neutral-200 dark:text-neutral-700 select-none mx-0.5" aria-hidden="true">|</span>
                    {selectedArticle.coverImage ? (
                      <>
                        <Button unstyled
                          type="button"
                          onClick={() => { setCoverUrlDraft(selectedArticle.coverImage); setCoverPickerOpen(true); }}
                          className="text-xs text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                        >
                          Change cover
                        </Button>
                        <Button unstyled
                          type="button"
                          onClick={() => applyCover(null)}
                          className="text-xs text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                        >
                          Remove cover
                        </Button>
                      </>
                    ) : (
                      <Button unstyled
                        type="button"
                        onClick={() => { setCoverUrlDraft(''); setCoverPickerOpen(true); }}
                        className="text-xs text-neutral-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                      >
                        Add cover
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Body: content area + optional side panel */}
            <div className="flex flex-1 overflow-hidden">

              {/* Content area — sub-articles live INSIDE this div, below the article body */}
              <div className="flex-1 overflow-y-auto p-6">
                {editingArticle ? (
                  /* ── Edit mode ── */
                  <div className="w-full max-w-workspace space-y-4">
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
                          <Button unstyled type="button" onClick={() => applyCover(coverUrlDraft)}
                            className="text-xs px-3 py-1.5 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                            Use URL
                          </Button>
                        </div>
                        <p className="text-xs text-neutral-500">Or choose a gradient preset:</p>
                        <div className="grid grid-cols-6 gap-1.5">
                          {Object.entries(COVER_GRADIENTS).map(([key, cls]) => (
                            <Button unstyled key={key} type="button" aria-label={key} title={key}
                              onClick={() => applyCover(`gradient:${key}`)}
                              className={`h-8 rounded-md ${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 hover:ring-2 hover:ring-brand-navy`}
                            />
                          ))}
                        </div>
                        <Button unstyled type="button" onClick={() => setCoverPickerOpen(false)}
                          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
                          Cancel
                        </Button>
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
                          {['KB', 'RUNBOOK', 'ADR', 'POSTMORTEM', 'ONBOARDING', 'TROUBLESHOOTING', 'MEETING_NOTES', 'CUSTOM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* KR-077: meeting notes assistant — shown when templateType is MEETING_NOTES */}
                    {selectedArticle.templateType === 'MEETING_NOTES' && (
                      <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-neutral-100" aria-hidden="true" />}>
                        <MeetingNotesAssistant
                          workspaceId={workspaceId}
                          onInsert={(blocks) => {
                            const json = JSON.stringify(blocks);
                            setSelectedArticle(a => ({ ...a, contentBlocks: json, contentFormat: 'blocks' }));
                            scheduleBlockSave(selectedArticle.id, { contentBlocks: json, contentFormat: 'blocks', templateType: selectedArticle.templateType });
                          }}
                        />
                      </Suspense>
                    )}

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
                      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-neutral-100" aria-hidden="true" />}>
                        <BlockEditor
                          key={selectedArticle.id}
                          aiAssist={aiAssist}
                          workspaceId={workspaceId}
                          readOnly={!lockGranted}
                          blocks={(() => {
                            const parsed = parseArticleBlocks(selectedArticle);
                            if (parsed.length > 0) return parsed;
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
                      </Suspense>
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
                  <div className="w-full max-w-workspace">
                    {/* KR-009: cover banner in read mode */}
                    <ArticleCover image={selectedArticle.coverImage} />
                    {(() => {
                      // Block-format articles render via BlockRenderer.
                      // Markdown articles render via renderMd. Neither should ever show nothing.
                      const blocks = parseArticleBlocks(selectedArticle);

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

                    {/* KR-029: emoji reactions strip */}
                    <ArticleReactions
                      articleId={selectedArticle.id}
                      workspaceId={workspaceId}
                      currentUserId={currentUser?.id}
                    />

                    {/* KR-045: related articles — below content, above sub-articles */}
                    <RelatedArticles
                      articleId={selectedArticle.id}
                      workspaceId={workspaceId}
                      onOpenArticle={openArticleById}
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
                            <Button unstyled
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
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {outline.length > 0 && (
                <aside className="hidden xl:block w-56 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-y-auto p-4" aria-label="Article outline">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
                    Outline
                  </h3>
                  <nav className="space-y-1">
                    {outline.map((item) => (
                      <Button unstyled
                        key={item.id}
                        type="button"
                        onClick={() => handleHeadingJump(item.id)}
                        className={`block w-full text-left rounded px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${item.level === 2 ? 'pl-4' : item.level === 3 ? 'pl-6' : ''}`}
                      >
                        {item.text}
                      </Button>
                    ))}
                  </nav>
                </aside>
              )}

              {/* ── KR-025: Block comments panel ── */}
              <Suspense fallback={null}>
                <BlockCommentsPanel
                  articleId={selectedArticle?.id}
                  blockId={blockCommentPanel.blockId}
                  workspaceId={workspaceId}
                  currentUserId={currentUser?.id}
                  open={blockCommentPanel.open}
                  onClose={() => setBlockCommentPanel({ open: false, blockId: null })}
                />
              </Suspense>

              {/* KR-011: Article properties panel */}
              {propertiesOpen && (
                <ArticlePropertiesPanel
                  article={selectedArticle}
                  wordCount={wordCount}
                  onClose={() => {
                    setPropertiesOpen(false);
                    try { localStorage.setItem('know_props_open', 'false'); } catch { /* non-fatal */ }
                  }}
                  readOnly={!editingArticle}
                  workspaceId={workspaceId}
                  articleText={articleText(selectedArticle)}
                  onAcceptTag={() => {}}
                />
              )}

              {/* ── Contextual side panels ── */}
              {!focusMode && !propertiesOpen && !articlePanel && (
                <Suspense fallback={<div className="w-80 flex-shrink-0 animate-pulse border-l border-neutral-200 bg-neutral-100" aria-hidden="true" />}>
                  <KnowledgeRoadmapPanel
                    article={selectedArticle}
                    articles={[...(knowledgeArticles || []), ...(knowledgeSearchResults || [])]}
                    related={articleChildren}
                    comments={articleComments}
                    searchQuery={knowledgeSearch}
                    onOpenArticle={openArticleById}
                  />
                </Suspense>
              )}

              {articlePanel === 'history' && (
                <div className="w-80 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
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
                          <Button unstyled
                            onClick={() => setSelectedArticle(a => ({
                              ...a,
                              content: v.content ?? a.content,
                              contentBlocks: v.contentBlocks ?? a.contentBlocks,
                            }))}
                            className="text-xs text-brand-navy hover:underline mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {articleVersions.length >= 2 && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Compare versions</h4>
                      <div className="flex items-end gap-2">
                        <label className="flex-1 text-xs text-neutral-500">
                          From
                          <select
                            aria-label="Compare from version"
                            className="input mt-1 text-xs w-full"
                            value={diffVersions.from}
                            onChange={(e) => setDiffVersions((prev) => ({ ...prev, from: e.target.value, data: null }))}
                          >
                            {articleVersions.map(v => <option key={v.id} value={v.versionNumber}>v{v.versionNumber}</option>)}
                          </select>
                        </label>
                        <label className="flex-1 text-xs text-neutral-500">
                          To
                          <select
                            aria-label="Compare to version"
                            className="input mt-1 text-xs w-full"
                            value={diffVersions.to}
                            onChange={(e) => setDiffVersions((prev) => ({ ...prev, to: e.target.value, data: null }))}
                          >
                            {articleVersions.map(v => <option key={v.id} value={v.versionNumber}>v{v.versionNumber}</option>)}
                          </select>
                        </label>
                        <Button unstyled
                          type="button"
                          onClick={loadVersionDiff}
                          disabled={diffVersions.loading || !diffVersions.from || !diffVersions.to}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-60"
                        >
                          {diffVersions.loading ? 'Loading' : 'Diff'}
                        </Button>
                      </div>
                      {diffVersions.error && (
                        <p className="mt-2 text-xs text-semantic-danger">{diffVersions.error}</p>
                      )}
                      {diffVersions.data && (
                        <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            v{diffVersions.data.fromVersion} to v{diffVersions.data.toVersion}
                            {diffVersions.data.titleChanged ? ' - title changed' : ''}
                          </div>
                          <div className="max-h-80 overflow-auto font-mono text-xs">
                            {(diffVersions.data.lines || []).map((line, idx) => (
                              <div
                                key={`${line.type}-${idx}`}
                                className={`px-3 py-1 whitespace-pre-wrap ${
                                  line.type === 'ADDED'
                                    ? 'bg-semantic-success-surface text-semantic-success'
                                    : line.type === 'REMOVED'
                                      ? 'bg-semantic-danger/10 text-semantic-danger'
                                      : 'text-neutral-600 dark:text-neutral-300'
                                }`}
                              >
                                <span aria-hidden="true">{line.type === 'ADDED' ? '+ ' : line.type === 'REMOVED' ? '- ' : '  '}</span>
                                {line.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {articlePanel === 'comments' && (
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
                          <Button unstyled
                            onClick={() => toggleArticleComment(selectedArticle.id, c.id, !c.resolved)}
                            className="text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                          >
                            {c.resolved ? 'Reopen' : 'Resolve'}
                          </Button>
                          <Button unstyled
                            onClick={() => deleteArticleComment(selectedArticle.id, c.id)}
                            className="text-xs text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 rounded"
                          >
                            Delete
                          </Button>
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

              {articlePanel === 'analytics' && (
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

      {/* KR-012: Focus mode exit button — fixed at top-right when focus mode is active */}
      {focusMode && (
        <Button unstyled
          aria-label="Exit focus mode"
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-modal text-xs px-3 py-1.5 rounded-lg bg-neutral-900/80 text-white hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 flex items-center gap-1.5"
        >
          Exit focus <X className="h-3 w-3" aria-hidden="true" />
        </Button>
      )}

      {/* WI-29: template picker modal */}
      {templatePickerOpen && (
        <Suspense fallback={null}>
          <TemplatePickerModal
            workspaceId={workspaceId}
            onClose={() => setTemplatePickerOpen(false)}
            onApplyTemplate={(template) => {
              // Pre-fill a new article with the template's body as the initial content.
              setArticleForm({
                title: '',
                content: template.body || '',
                templateType: template.category || 'KB',
                status: 'DRAFT',
              });
              setIsArticleFormOpen(true);
              setTemplatePickerOpen(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
