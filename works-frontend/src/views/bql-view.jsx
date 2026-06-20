import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, BookmarkPlus, Bookmark, Check, AlertCircle, Plus, Trash2, SlidersHorizontal, Link2, Clock, Play, Terminal, Database, Search, LayoutGrid, Wand2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { savedViewsClient } from '@/lib/saved-views';
import { Button } from '@/components/works/button';
import { capabilityEnabled } from '@/lib/ai';
import { NULLARY_OPS, SET_OPS, rowToClause, suggestions, applySuggestion } from '@/lib/bql-builder';
import BqlResultsTable from '@/views/bql-results-table';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CommandPalette } from '@/components/works/organisms/command-palette';
import { tokenize } from '@/lib/bql-highlight';
import { BQL_SNIPPETS } from '@/lib/bql-snippets';
import { useI18n } from '@/lib/i18n';
import { savedViewsKeys } from '@/hooks/queries/keys';
import { SavedViewsPanel } from '@/components/works/molecules/saved-views-panel';
import { Card } from '@/components/works/atoms/card';
import { PageHeader } from '@/components/works/atoms/page-header';
import { PageLayout } from '@/components/works/templates/page-layout';

// Token type → highlight colour (design tokens only; dark-mode legible).
const TOKEN_CLASS = {
  field: 'text-brand-navy dark:text-brand-navy-tint',
  operator: 'text-semantic-info',
  keyword: 'text-brand-orange',
  function: 'text-semantic-success',
  string: 'text-neutral-500',
  number: 'text-brand-amber',
  paren: 'text-neutral-400',
  plain: '',
};

const HISTORY_KEY = 'bql.history';
const NAV_COLS_KEY = 'bql.navigator.columns';

function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(h) ? h : [];
  } catch { return []; }
}

// Current navigator column layout from localStorage (the global default), or null to let the table
// fall back to its built-in default set.
function loadNavCols() {
  try {
    const s = JSON.parse(localStorage.getItem(NAV_COLS_KEY));
    return Array.isArray(s) && s.length ? s : null;
  } catch { return null; }
}

// BQL query view. The parent owns query state + run/save/fetch handlers; this view adds the
// schema-driven editor assists (P3): live validation, insert chips, and a visual builder that
// round-trips to BQL — the manual fallback RB-40 §2 mandates when AI is off.
export default function BqlView({
  bqlQuery,
  bqlError,
  bqlResults,
  workItems,
  activeWorkspaceId,
  aiCapabilities = [],
  nameMaps = {},
  setBqlQuery,
  setSelectedItem,
  runBql,
  notify = () => {},
  bqlLoading = false,
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  // Iteration 10 Cap O — NL→BQL translation (first AI surface)
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlMeta, setNlMeta] = useState(null); // { confidence, fallback }
  const [viewName, setViewName] = useState('');
  const [viewSaving, setViewSaving] = useState(false);
  const [columnKeys, setColumnKeys] = useState(loadNavCols); // results-table column layout (controlled)
  const [activeViewId, setActiveViewId] = useState(null);    // the saved view currently loaded, if any
  const [paletteOpen, setPaletteOpen] = useState(false);     // BQL snippet command palette

  // P3 — editor assists
  const [schema, setSchema] = useState(null); // { fields, operators, functions, enums }
  const [validation, setValidation] = useState(null); // { valid, error }
  const [builderOpen, setBuilderOpen] = useState(false);
  const [rows, setRows] = useState([{ field: '', op: '=', value: '' }]);
  const [connector, setConnector] = useState('AND');
  const [resultSize, setResultSize] = useState(100);
  const [sort, setSort] = useState('created_at desc');
  // Board / group-by view (Batch 5): a field to bucket results by + the per-bucket counts.
  const [groupBy, setGroupBy] = useState('');
  const [groups, setGroups] = useState(null); // [{ value, count }] | null when not grouped
  const [groupBusy, setGroupBusy] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [ac, setAc] = useState({ open: false, options: [], partial: '', index: 0 });
  const queryRef = useRef(null);
  const highlightRef = useRef(null); // the <pre> overlay behind the textarea (scroll-synced)

  // Syntax-highlight tokens (with char offsets) for the overlay, recomputed only when the query or
  // schema changes.
  const tokens = useMemo(() => {
    const out = [];
    tokenize(bqlQuery, schema).reduce((off, t) => {
      out.push({ ...t, start: off, end: off + t.text.length });
      return off + t.text.length;
    }, 0);
    return out;
  }, [bqlQuery, schema]);
  // Char offset to mark with an error squiggle (clamped into range), or null when valid.
  const errorPos = validation && !validation.valid && validation.position >= 0
    ? Math.min(validation.position, Math.max(0, bqlQuery.length - 1))
    : null;
  const syncScroll = (e) => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = e.target.scrollTop;
    highlightRef.current.scrollLeft = e.target.scrollLeft;
  };

  // Reflect the current query + sort into the URL so a run is shareable/bookmarkable (JIRA filter
  // URLs), without polluting history. Uses replaceState; the app's path stays unchanged.
  const syncUrl = (query, sortVal) => {
    try {
      const params = new URLSearchParams();
      if (query && query.trim()) params.set('bql', query.trim());
      if (sortVal) params.set('bqlSort', sortVal);
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    } catch { /* ignore */ }
  };

  const recordHistory = (q) => {
    const query = (q || '').trim();
    if (!query) return;
    setHistory(prev => {
      const next = [query, ...prev.filter(x => x !== query)].slice(0, 8);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Single entry point for running: records history, syncs the URL, then delegates to the parent.
  const runQuery = (opts = {}) => {
    const query = typeof opts.query === 'string' ? opts.query : bqlQuery;
    const nextSort = opts.sort !== undefined ? opts.sort : sort;
    const nextSize = opts.size !== undefined ? opts.size : resultSize;
    if (opts.sort !== undefined) setSort(opts.sort);
    if (opts.size !== undefined) setResultSize(opts.size);
    recordHistory(query);
    syncUrl(query, nextSort);
    runBql({ query, sort: nextSort, size: nextSize });
  };

  const showMore = () => runQuery({ size: Math.min(resultSize + 100, 500) });

  // Load a saved view: reflect its query in the editor, apply its saved column layout, then run it
  // through the audited saved-view endpoint (RB-20 §5) rather than ad-hoc execute.
  const loadSavedView = (v) => {
    const q = v.bqlFilter || '';
    setBqlQuery(q);
    recordHistory(q);
    syncUrl(q, sort);
    setGroupBy('');
    setGroups(null);
    let cols = null;
    try { const p = JSON.parse(v.columnKeys || '[]'); if (Array.isArray(p) && p.length) cols = p; } catch { /* keep null */ }
    setColumnKeys(cols);
    setActiveViewId(v.id);
    runBql({ query: q, savedViewId: v.id, size: resultSize });
  };

  // A column change persists to the global default, and to the active saved view (so each view keeps
  // its own curated layout) when one is loaded.
  const handleColumnsChange = (keys) => {
    setColumnKeys(keys);
    if (activeViewId && activeWorkspaceId) {
      savedViewsClient.update(activeWorkspaceId, activeViewId, { columnKeys: JSON.stringify(keys) }).catch(() => {});
    }
  };

  // Run an example query from the snippet palette.
  const runSnippet = (q) => {
    setBqlQuery(q);
    setActiveViewId(null);
    recordHistory(q);
    syncUrl(q, sort);
    setGroupBy('');
    setGroups(null);
    runBql({ query: q, sort, size: resultSize });
    setPaletteOpen(false);
  };

  // Keyboard shortcut: "?" opens the snippet palette — but only when not typing in a field, so it
  // never hijacks the editor or any input.
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const editing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        || el.tagName === 'SELECT' || el.isContentEditable);
      if (!editing && e.key === '?') { e.preventDefault(); setPaletteOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Fetch per-bucket counts for the current query, grouped by the chosen field. Empty field clears
  // the board back to the flat results table. Runs on demand (no effect) to avoid set-state-in-effect.
  const runGroup = (field) => {
    setGroupBy(field);
    if (!field || !activeWorkspaceId) { setGroups(null); return; }
    setGroupBusy(true);
    api.send('/bql/group', {
      method: 'POST',
      body: JSON.stringify({ query: bqlQuery, groupBy: field, workspaceId: activeWorkspaceId }),
    })
      .then(d => setGroups(Array.isArray(d) ? d : []))
      .catch(() => setGroups([]))
      .finally(() => setGroupBusy(false));
  };

  // Resolve a raw group value (which may be an id for assignee/project/sprint) to a display label.
  const groupLabel = (value) => {
    if (!value) return 'Unassigned';
    const map = groupBy === 'assignee' || groupBy === 'assignee_id' ? nameMaps.users
      : groupBy === 'project' || groupBy === 'project_id' ? nameMaps.projects
        : groupBy === 'sprint' || groupBy === 'sprint_id' ? nameMaps.sprints
          : null;
    return (map && map[value]) || value;
  };

  // Apply a bulk edit to the selected rows, then re-run so the table reflects the change. The
  // server re-checks edit rights per item and skips any the user can't touch (RB-40 §1).
  const runBulk = (action, value, ids) =>
    api.send('/work-items/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, action, value }),
    }).then(res => {
      const updated = res?.updated?.length ?? 0;
      const skipped = res?.skipped?.length ?? 0;
      notify(skipped ? `Updated ${updated}, skipped ${skipped}` : `Updated ${updated} item${updated === 1 ? '' : 's'}`);
      return runQuery();
    }).catch(() => notify('Bulk edit failed', 'error'));

  // Drill into a bucket: AND the bucket onto the query and switch back to the flat table.
  const drillInto = (value) => {
    const clause = `${groupBy} ${value ? `= ${/\s/.test(value) ? `"${value}"` : value}` : 'IS EMPTY'}`;
    const next = bqlQuery.trim() ? `${bqlQuery.trim()} AND ${clause}` : clause;
    setBqlQuery(next);
    setGroupBy('');
    setGroups(null);
    runQuery({ query: next });
  };

  // Open a result reliably — like JIRA, any row opens its item even if it isn't in the local cache.
  const openItem = (item) => {
    const full = workItems.find(w => w.id === item.id);
    if (full) { setSelectedItem(full); return; }
    api.send(`/work-items/${encodeURIComponent(item.id)}`).then(setSelectedItem).catch(() => {});
  };

  const copyLink = () => {
    const params = new URLSearchParams();
    if (bqlQuery.trim()) params.set('bql', bqlQuery.trim());
    if (sort) params.set('bqlSort', sort);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    Promise.resolve(navigator.clipboard?.writeText(url))
      .then(() => notify('Link copied to clipboard'))
      .catch(() => notify('Could not copy link', 'error'));
  };

  // ── Inline autocomplete (caret-aware, schema-driven) ──────────────────────────────
  const refreshAc = (val, caret) => {
    if (!schema) { setAc(a => ({ ...a, open: false })); return; }
    const { partial, options } = suggestions(val.slice(0, caret ?? val.length), schema);
    setAc({ open: options.length > 0, options, partial, index: 0 });
  };

  const acceptSuggestion = (choice) => {
    const el = queryRef.current;
    const caret = el ? el.selectionStart : bqlQuery.length;
    const next = applySuggestion(bqlQuery, caret, ac.partial, choice);
    setBqlQuery(next.text);
    setAc(a => ({ ...a, open: false }));
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(next.caret, next.caret); } }, 0);
  };

  const onQueryKeyDown = (e) => {
    if (ac.open && ac.options.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAc(a => ({ ...a, index: (a.index + 1) % a.options.length })); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAc(a => ({ ...a, index: (a.index - 1 + a.options.length) % a.options.length })); return; }
      if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) { e.preventDefault(); acceptSuggestion(ac.options[ac.index]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setAc(a => ({ ...a, open: false })); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); setAc(a => ({ ...a, open: false })); runQuery(); }
  };

  // Seed from a shared URL once on mount (deferred so no setState runs synchronously in the effect).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('bql');
    if (!q) return undefined;
    const s = params.get('bqlSort') || undefined;
    const t = setTimeout(() => { setBqlQuery(q); if (s) setSort(s); runBql({ query: q, sort: s }); }, 0);
    return () => clearTimeout(t);
  }, []); // intentional mount-only: reads URL params once on load, before any user interaction.

  const translateNl = () => {
    if (!nlText.trim() || !activeWorkspaceId) return;
    setNlBusy(true);
    setNlMeta(null);
    api.send(`/ai/nl-to-bql?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
      method: 'POST',
      body: JSON.stringify({ text: nlText }),
    })
      .then(d => {
        if (d.bql) setBqlQuery(d.bql);
        setNlMeta({ confidence: d.confidence, fallback: d.meta?.fallback });
      })
      .catch(() => {})
      .finally(() => setNlBusy(false));
  };

  // Gate the NL→BQL panel on ITS capability (nl_to_bql), not "any AI" (RB-40 §2 most-restrictive).
  const aiOn = capabilityEnabled(aiCapabilities, 'nl_to_bql');

  useEffect(() => {
    if (!activeWorkspaceId) return;
    api.send(`/bql/schema?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(setSchema)
      .catch(() => setSchema(null));
  }, [activeWorkspaceId]); // api.send, set fns excluded: stable refs that don't affect when to re-fetch.

  // Live validation — debounced; surfaces parse/field errors before the user runs the query.
  // All setState happens inside the timeout (async), never synchronously in the effect body.
  useEffect(() => {
    const q = bqlQuery.trim();
    const handle = setTimeout(() => {
      if (!q) { setValidation(null); return; }
      api.send(`/bql/validate`, {
        method: 'POST',
        body: JSON.stringify({ query: bqlQuery, workspaceId: activeWorkspaceId }),
      })
        .then(d => setValidation(d))
        .catch(() => setValidation(null));
    }, 400);
    return () => clearTimeout(handle);
  }, [bqlQuery, activeWorkspaceId]);

  const insertToken = (token) => {
    const el = queryRef.current;
    const sep = bqlQuery && !bqlQuery.endsWith(' ') ? ' ' : '';
    setBqlQuery(`${bqlQuery}${sep}${token} `);
    if (el) setTimeout(() => el.focus(), 0);
  };

  const applyBuilder = () => {
    const clause = rows.map(rowToClause).filter(Boolean).join(` ${connector} `);
    if (clause) setBqlQuery(clause);
  };

  const updateRow = (i, patch) => setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows(prev => [...prev, { field: '', op: '=', value: '' }]);
  const removeRow = (i) => setRows(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const saveView = () => {
    if (!viewName.trim() || !activeWorkspaceId) return;
    setViewSaving(true);
    // Capture the current column layout so the view reopens with it.
    savedViewsClient.create(activeWorkspaceId, { name: viewName.trim(), bqlFilter: bqlQuery, columnKeys: JSON.stringify(columnKeys ?? []) })
      .then(v => {
        setViewName('');
        if (v?.id) setActiveViewId(v.id);
        queryClient.invalidateQueries({ queryKey: savedViewsKeys.list(activeWorkspaceId) });
        notify('View saved');
      })
      .catch(() => notify('Could not save view', 'error'))
      .finally(() => setViewSaving(false));
  };



  const enumOptions = (alias) => {
    if (!schema?.enums) return null;
    const key = alias.toLowerCase();
    return schema.enums[key] || null;
  };

  return (
    <PageLayout width="dashboard" className="space-y-5">
      {/* BQL snippet palette (⌘K-style) — example queries as a fast on-ramp; opened by the Snippets
          button or the "?" shortcut. Mounted only while open (it owns its focus trap + scroll lock). */}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          placeholder="Insert a BQL snippet…"
          commands={BQL_SNIPPETS.map(s => ({
            id: s.id, label: s.label, group: 'BQL snippet', Icon: Terminal, keywords: s.keywords,
            run: () => runSnippet(s.query),
          }))}
        />
      )}
      {/* Header */}
      <PageHeader
        title={t('insights.bql.title')}
        description={t('insights.bql.subtitle')}
        actions={schema?.fields?.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            <Database aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy-tint" />
            {schema.fields.length} fields queryable
          </span>
        )}
      />

      {/* Iteration 10 Cap O — NL→BQL translation panel */}
      {aiOn && (
        <Card variant="outlined" padding="none" className="overflow-hidden border-brand-navy-tint/30 dark:border-brand-navy-tint/40 bg-gradient-to-br from-brand-navy/5 to-transparent shadow-sm dark:from-brand-navy-tint/10">
          <div className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy dark:bg-brand-navy-tint/20 dark:text-brand-navy-tint">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="mb-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200">{t('insights.bql.askPlainEnglish')}</p>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <label htmlFor="nl-query" className="sr-only">Plain-English filter query</label>
                <input
                  id="nl-query"
                  type="text"
                  className="input flex-1 text-sm"
                  placeholder="e.g. open bugs assigned to me this week"
                  value={nlText}
                  onChange={e => setNlText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') translateNl(); }}
                  aria-describedby={nlMeta ? 'nl-meta' : undefined}
                />
                <Button variant="secondary" leftIcon={<Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
                  onClick={translateNl} loading={nlBusy} disabled={!nlText.trim()}>
                  Translate
                </Button>
              </div>
              {nlMeta && (
                <p id="nl-meta" className="mt-1.5 text-xs text-neutral-500">
                  {nlMeta.fallback ? 'Translated using keyword matching (AI off or over budget).' : 'AI translation applied.'}
                  {' '}Confidence: <strong className="text-neutral-700 dark:text-neutral-300">{nlMeta.confidence}</strong>. Review the query below before running.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Query console */}
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 dark:border-neutral-700/60">
          <div className="flex items-center gap-2">
            <Terminal aria-hidden="true" className="h-4 w-4 text-brand-navy-tint" />
            <label htmlFor="bql-query" className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Query</label>
          </div>
          {validation && (
            validation.valid
              ? <span className="inline-flex items-center gap-1 rounded-full bg-semantic-success-surface px-2.5 py-1 text-xs font-medium text-semantic-success"><Check aria-hidden="true" className="h-3.5 w-3.5" /> Valid</span>
              : <span className="inline-flex max-w-xs items-center gap-1 rounded-full bg-semantic-danger-surface px-2.5 py-1 text-xs font-medium text-semantic-danger"><AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{validation.error}</span></span>
          )}
        </div>

        <div className="p-5">
          <div className="relative">
            <textarea
              id="bql-query"
              ref={queryRef}
              spellCheck={false}
              className="input relative w-full resize-none rounded-lg bg-neutral-50/60 font-mono text-sm leading-relaxed text-transparent caret-brand-navy focus:bg-white focus:ring-2 focus:ring-brand-navy-tint/30 dark:bg-neutral-900/40 dark:caret-brand-navy-tint dark:focus:bg-neutral-900"
              rows={3}
              placeholder={'status = Open AND (priority = High OR priority = Critical)\nassignee = currentUser() AND createdAt >= startOfWeek()\ndueDate < today() AND status NOT IN (Done, Cancelled)'}
              value={bqlQuery}
              onChange={e => { setBqlQuery(e.target.value); setActiveViewId(null); refreshAc(e.target.value, e.target.selectionStart); }}
              onKeyDown={onQueryKeyDown}
              onScroll={syncScroll}
              onBlur={() => setTimeout(() => setAc(a => ({ ...a, open: false })), 120)}
              aria-autocomplete="list"
            />
            {/* Syntax-highlight overlay — aria-hidden; the textarea above is the real, accessible field
                (its text is transparent so this shows through; the caret stays visible). RB-30 §6. */}
            <pre ref={highlightRef} aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-transparent px-3 py-2 font-mono text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
              {tokens.map((tok, i) => {
                const isErr = errorPos !== null && errorPos >= tok.start && errorPos < tok.end;
                return (
                  <span key={i}
                    className={`${TOKEN_CLASS[tok.type] || ''}${isErr ? ' underline decoration-semantic-danger decoration-dotted decoration-2 underline-offset-2' : ''}`}>
                    {tok.text}
                  </span>
                );
              })}
              {'\n'}
            </pre>
            {ac.open && (
              <ul role="listbox" className="absolute left-0 right-0 z-dropdown mt-1 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {ac.options.map((opt, i) => (
                  <li key={opt} role="option" aria-selected={i === ac.index}>
                    <button type="button"
                      // onMouseDown (not onClick) so it fires before the textarea blur closes the list.
                      onMouseDown={e => { e.preventDefault(); acceptSuggestion(opt); }}
                      className={`flex w-full items-center px-3 py-1.5 text-left font-mono transition-colors ${i === ac.index ? 'bg-brand-navy/5 text-brand-navy dark:bg-brand-navy-tint/20 dark:text-neutral-50' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700/50'}`}>
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {validation && !validation.valid && validation.position >= 0 && (
            <p className="mt-2 font-mono text-xs text-semantic-danger">At position {validation.position}: {validation.error}</p>
          )}
          {bqlError && <p className="mt-2 font-mono text-xs text-semantic-danger">{bqlError}</p>}

          {/* Action bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="action" leftIcon={<Play aria-hidden="true" className="h-3.5 w-3.5" />} onClick={() => runQuery()}>Run Query</Button>
            <span className="mr-1 hidden items-center gap-1 text-neutral-400 sm:inline-flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
            <span className="mx-1 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />
            <Button variant="secondary" leftIcon={<SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />}
              onClick={() => setBuilderOpen(o => !o)} aria-expanded={builderOpen}>
              Visual builder
            </Button>
            <Button variant="ghost" leftIcon={<Wand2 aria-hidden="true" className="h-3.5 w-3.5" />}
              onClick={() => setPaletteOpen(true)} title="Insert an example query (?)">
              Snippets
            </Button>
            <Button variant="ghost" leftIcon={<Link2 aria-hidden="true" className="h-3.5 w-3.5" />}
              onClick={copyLink} disabled={!bqlQuery.trim()} title="Copy a shareable link to this query">
              Copy link
            </Button>
            {schema?.groupable?.length > 0 && (
              <label className="ml-auto flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" />
                Group by
                <select className="input w-auto py-1 text-xs" value={groupBy}
                  onChange={e => runGroup(e.target.value)} aria-label="Group results by field">
                  <option value="">none</option>
                  {schema.groupable.map(g => {
                    const alias = (schema.fields || []).find(f => f.column === g)?.alias || g;
                    return <option key={g} value={alias}>{alias}</option>;
                  })}
                </select>
              </label>
            )}
          </div>

          {/* Recent queries — quick re-run (JIRA lacks query history; addresses a JQL pain point) */}
          {history.length > 0 && (
            <div className="mt-4 flex items-start gap-2 text-xs">
              <span className="mt-1 inline-flex shrink-0 items-center gap-1 font-semibold uppercase tracking-wide text-neutral-400">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Recent
              </span>
              <div className="flex flex-wrap gap-1.5">
                {history.map(q => (
                  <button key={q} type="button"
                    onClick={() => { setBqlQuery(q); runQuery({ query: q }); }}
                    title={q}
                    className="max-w-xs truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-neutral-600 transition-all hover:-translate-y-px hover:border-brand-navy hover:text-brand-navy hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Schema-driven reference — click any token to insert it (autocomplete-by-click) */}
          {schema && (
            <div className="mt-4 space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3 text-xs dark:border-neutral-700/60 dark:bg-neutral-900/40">
              <ChipRow label="Fields" items={schema.fields?.map(f => f.alias) || []} onPick={insertToken} />
              <ChipRow label="Operators" items={schema.operators || []} onPick={insertToken} />
              <ChipRow label="Functions" items={schema.functions || []} onPick={insertToken} />
            </div>
          )}
        </div>
      </Card>

      {/* Visual builder (P3 / RB-40 §2 manual fallback) */}
      {builderOpen && (
        <Card variant="outlined" padding="none" className="p-5 border-brand-navy-tint/30 dark:border-brand-navy-tint/40 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
              <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy-tint" /> Visual builder
            </p>
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              Join with
              <select className="input w-auto py-1 text-xs" value={connector} onChange={e => setConnector(e.target.value)} aria-label="Join clauses with">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => {
              const opts = enumOptions(row.field);
              const hideValue = NULLARY_OPS.includes(row.op);
              return (
                <div key={i} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`b-field-${i}`}>Field</label>
                  <select id={`b-field-${i}`} className="input flex-1 text-sm" value={row.field}
                    onChange={e => updateRow(i, { field: e.target.value })}>
                    <option value="">field…</option>
                    {(schema?.fields || []).map(f => <option key={f.alias} value={f.alias}>{f.alias}</option>)}
                  </select>
                  <label className="sr-only" htmlFor={`b-op-${i}`}>Operator</label>
                  <select id={`b-op-${i}`} className="input w-auto text-sm" value={row.op}
                    onChange={e => updateRow(i, { op: e.target.value })}>
                    {(schema?.operators || ['=', '!=', '>', '<', '>=', '<=']).map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  {!hideValue && (
                    opts
                      ? (
                        <>
                          <label className="sr-only" htmlFor={`b-val-${i}`}>Value</label>
                          <select id={`b-val-${i}`} className="input flex-1 text-sm" value={row.value}
                            onChange={e => updateRow(i, { value: e.target.value })}>
                            <option value="">value…</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </>
                      )
                      : (
                        <>
                          <label className="sr-only" htmlFor={`b-val-${i}`}>Value</label>
                          <input id={`b-val-${i}`} className="input flex-1 text-sm" placeholder={SET_OPS.includes(row.op) ? 'a, b, c' : 'value'}
                            value={row.value} onChange={e => updateRow(i, { value: e.target.value })} />
                        </>
                      )
                  )}
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-semantic-danger-surface hover:text-semantic-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label={`Remove clause ${i + 1}`}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Plus aria-hidden="true" className="h-3.5 w-3.5" />} onClick={addRow}>
              Add clause
            </Button>
            <Button variant="secondary" size="sm" onClick={applyBuilder}>Apply to query</Button>
          </div>
        </Card>
      )}

      {/* Saved views (Cap R) — filter + column config stored as a named view */}
      <Card variant="outlined" padding="sm">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <Bookmark aria-hidden="true" className="h-4 w-4" />
          </span>
          <label htmlFor="view-name" className="sr-only">View name</label>
          <input
            id="view-name"
            className="input flex-1 text-sm"
            placeholder="Save this query as a named view…"
            value={viewName}
            onChange={e => setViewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveView(); }}
          />
          <Button variant="secondary" size="sm" leftIcon={<BookmarkPlus aria-hidden="true" className="h-3.5 w-3.5" />}
            loading={viewSaving} disabled={!viewName.trim()} onClick={saveView}>
            Save as View
          </Button>
        </div>
        {/* First-class view management — rename / reorder / delete (WI-15). */}
        <div className="mt-3">
          <SavedViewsPanel
            workspaceId={activeWorkspaceId}
            activeViewId={activeViewId}
            onLoad={loadSavedView}
          />
        </div>
      </Card>

      {/* Board / group-by breakdown — count per bucket, click a lane to drill into it. */}
      {groups && (
        <Card variant="outlined" padding="none" className="p-5">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
            <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy-tint" />
            Grouped by {groupBy} {groupBusy && <span className="font-normal normal-case tracking-normal text-neutral-400">· loading…</span>}
          </p>
          {groups.length === 0 && !groupBusy && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No matching items to group.</p>
          )}
          <div className="space-y-2.5">
            {(() => {
              const max = groups.reduce((m, g) => Math.max(m, Number(g.count) || 0), 0) || 1;
              return groups.map(g => {
                const count = Number(g.count) || 0;
                const pct = Math.round((count / max) * 100);
                return (
                  <button key={g.value || '∅'} type="button" onClick={() => drillInto(g.value)}
                    className="group flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-900/50"
                    aria-label={`Filter to ${groupLabel(g.value)} (${count} items)`}>
                    <span className="w-40 shrink-0 truncate text-sm font-medium text-neutral-900 group-hover:text-brand-navy dark:text-neutral-100">
                      {groupLabel(g.value)}
                    </span>
                    <span className="h-6 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                      <span className="block h-full rounded-full bg-gradient-to-r from-brand-navy-tint to-brand-navy transition-all duration-base group-hover:opacity-90"
                        style={{ width: `${Math.max(pct, 4)}%` }} />
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {count}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </Card>
      )}

      {/* Loading — skeleton rows while a query runs and we have nothing to show yet (RB-30 §6). */}
      {bqlLoading && !groups && bqlResults.length === 0 && (
        <Card variant="outlined" padding="sm" role="status" aria-busy="true" aria-label="Loading query results">
          <ListSkeleton rows={6} />
        </Card>
      )}

      {/* Results — JIRA-style navigator: sortable columns, column chooser, CSV export */}
      {!groups && bqlResults.length > 0 && (
        <BqlResultsTable
          results={bqlResults}
          sort={sort}
          nameMaps={nameMaps}
          priorityOptions={schema?.enums?.priority || []}
          columnKeys={columnKeys}
          onColumnsChange={handleColumnsChange}
          onSort={(s) => runQuery({ sort: s })}
          onOpen={openItem}
          onShowMore={showMore}
          onBulk={runBulk}
          canShowMore={bqlResults.length >= resultSize && resultSize < 500}
        />
      )}
      {/* Error state — the query couldn't run; offer to jump back to the editor. */}
      {!bqlLoading && !groups && bqlResults.length === 0 && bqlError && (
        <div className="rounded-xl border border-dashed border-semantic-danger/40 bg-white dark:border-semantic-danger/40 dark:bg-neutral-800">
          <EmptyState icon={AlertCircle} title="This query couldn't run" subtitle={bqlError}
            action={<Button variant="secondary" onClick={() => queryRef.current?.focus()}>Fix query</Button>} />
        </div>
      )}
      {/* No-results state — the query ran but matched nothing. */}
      {!bqlLoading && !groups && bqlResults.length === 0 && bqlQuery && !bqlError && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <EmptyState icon={Search} title="No results"
            subtitle="No work items match this query. Adjust a clause and run it again."
            action={<Button variant="secondary" onClick={() => runQuery()}>Run again</Button>} />
        </div>
      )}
    </PageLayout>
  );
}

// A small keyboard-cap chip for showing shortcuts.
function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded border border-neutral-300 bg-neutral-50 px-1 py-0.5 font-mono text-2xs font-medium text-neutral-500 shadow-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
      {children}
    </kbd>
  );
}

// A labelled, wrap-friendly row of clickable insert chips.
function ChipRow({ label, items, onPick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="w-16 shrink-0 pt-1 font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map(token => (
          <button key={token} type="button" onClick={() => onPick(token)}
            className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-neutral-700 transition-all hover:-translate-y-px hover:border-brand-navy hover:text-brand-navy hover:shadow-sm active:translate-y-0 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            aria-label={`Insert ${token}`}>
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}
