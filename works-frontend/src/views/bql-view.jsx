import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, BookmarkPlus, Bookmark, Check, AlertCircle, Plus, Trash2, SlidersHorizontal, Link2, Clock } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { savedViewsClient } from '@/lib/saved-views';
import { Button } from '@/components/works/button';
import { capabilityEnabled } from '@/lib/ai';
import { NULLARY_OPS, SET_OPS, rowToClause, suggestions, applySuggestion } from '@/lib/bql-builder';
import BqlResultsTable from '@/views/bql-results-table';
import { useI18n } from '@/lib/i18n';

const HISTORY_KEY = 'bql.history';

function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(h) ? h : [];
  } catch { return []; }
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
}) {
  const { t } = useI18n();
  // Iteration 10 Cap O — NL→BQL translation (first AI surface)
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlMeta, setNlMeta] = useState(null); // { confidence, fallback }
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState('');
  const [viewSaving, setViewSaving] = useState(false);

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
    }).then(() => runQuery());

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
    navigator.clipboard?.writeText(url).catch(() => {});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    savedViewsClient.list(activeWorkspaceId).then(r => setSavedViews(Array.isArray(r) ? r : [])).catch(() => {});
    api.send(`/bql/schema?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(setSchema)
      .catch(() => setSchema(null));
  }, [activeWorkspaceId]);

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
    savedViewsClient.create(activeWorkspaceId, { name: viewName.trim(), bqlFilter: bqlQuery, columnKeys: '[]' })
      .then(v => { setSavedViews(prev => [...prev, v]); setViewName(''); })
      .catch(() => {})
      .finally(() => setViewSaving(false));
  };

  const deleteView = (id) => {
    if (!activeWorkspaceId) return;
    savedViewsClient.delete(activeWorkspaceId, id)
      .then(() => setSavedViews(prev => prev.filter(v => v.id !== id)))
      .catch(() => {});
  };

  const enumOptions = (alias) => {
    if (!schema?.enums) return null;
    const key = alias.toLowerCase();
    return schema.enums[key] || null;
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">{t('insights.bql.title')}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">{t('insights.bql.subtitle')}</p>

      {/* Iteration 10 Cap O — NL→BQL translation panel */}
      {aiOn && (
        <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-4 mb-4 flex gap-3 items-start">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy mt-2 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">{t('insights.bql.askPlainEnglish')}</p>
            <div className="flex gap-2">
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
              <Button variant="secondary" onClick={translateNl} loading={nlBusy} disabled={!nlText.trim()}>
                Translate to BQL
              </Button>
            </div>
            {nlMeta && (
              <p id="nl-meta" className="text-xs text-neutral-500 mt-1">
                {nlMeta.fallback ? 'Translated using keyword matching (AI off or over budget).' : 'AI translation applied.'}
                {' '}Confidence: <strong>{nlMeta.confidence}</strong>. Review the query below before running.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <label htmlFor="bql-query" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Query</label>
            {/* Live validation indicator */}
            {validation && (
              validation.valid
                ? <span className="flex items-center gap-1 text-xs text-semantic-success"><Check aria-hidden="true" className="h-3.5 w-3.5" /> Valid</span>
                : <span className="flex items-center gap-1 text-xs text-semantic-danger"><AlertCircle aria-hidden="true" className="h-3.5 w-3.5" /> {validation.error}</span>
            )}
          </div>
          <div className="relative mt-2">
            <textarea
              id="bql-query"
              ref={queryRef}
              className="input w-full font-mono text-sm resize-none"
              rows={3}
              placeholder={'status = Open AND (priority = High OR priority = Critical)\nassignee = currentUser() AND createdAt >= startOfWeek()\ndueDate < today() AND status NOT IN (Done, Cancelled)'}
              value={bqlQuery}
              onChange={e => { setBqlQuery(e.target.value); refreshAc(e.target.value, e.target.selectionStart); }}
              onKeyDown={onQueryKeyDown}
              onBlur={() => setTimeout(() => setAc(a => ({ ...a, open: false })), 120)}
              aria-autocomplete="list"
            />
            {ac.open && (
              <ul role="listbox" className="absolute left-0 right-0 mt-1 z-overlay max-h-56 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 text-sm">
                {ac.options.map((opt, i) => (
                  <li key={opt} role="option" aria-selected={i === ac.index}>
                    <button type="button"
                      // onMouseDown (not onClick) so it fires before the textarea blur closes the list.
                      onMouseDown={e => { e.preventDefault(); acceptSuggestion(opt); }}
                      className={`flex w-full items-center px-3 py-1.5 text-left font-mono ${i === ac.index ? 'bg-neutral-100 dark:bg-neutral-700 text-brand-navy' : 'text-neutral-700 dark:text-neutral-200'}`}>
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {validation && !validation.valid && validation.position >= 0 && (
            <p className="text-xs text-semantic-danger mt-2 font-mono">At position {validation.position}: {validation.error}</p>
          )}
          {bqlError && <p className="text-xs text-semantic-danger mt-2 font-mono">{bqlError}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="action" onClick={() => runQuery()}>Run Query (Ctrl+Enter)</Button>
          <Button variant="secondary" leftIcon={<SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={() => setBuilderOpen(o => !o)} aria-expanded={builderOpen}>
            Visual builder
          </Button>
          <Button variant="ghost" leftIcon={<Link2 aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={copyLink} disabled={!bqlQuery.trim()} title="Copy a shareable link to this query">
            Copy link
          </Button>
          {schema?.groupable?.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 ml-auto">
              Group by
              <select className="input text-xs py-1" value={groupBy}
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
          <div className="mt-3 flex items-start gap-2 text-xs">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 mt-1 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {history.map(q => (
                <button key={q} type="button"
                  onClick={() => { setBqlQuery(q); runQuery({ query: q }); }}
                  title={q}
                  className="font-mono max-w-xs truncate bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 text-neutral-600 dark:text-neutral-300 hover:border-brand-navy hover:text-brand-navy transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schema-driven reference — click any token to insert it (autocomplete-by-click) */}
        {schema && (
          <div className="mt-3 space-y-1.5 text-xs">
            <ChipRow label="Fields" items={schema.fields?.map(f => f.alias) || []} onPick={insertToken} />
            <ChipRow label="Operators" items={schema.operators || []} onPick={insertToken} />
            <ChipRow label="Functions" items={schema.functions || []} onPick={insertToken} />
          </div>
        )}
      </div>

      {/* Visual builder (P3 / RB-40 §2 manual fallback) */}
      {builderOpen && (
        <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider">Visual builder</p>
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              Join with
              <select className="input text-xs py-1" value={connector} onChange={e => setConnector(e.target.value)} aria-label="Join clauses with">
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
                  <select id={`b-field-${i}`} className="input text-sm flex-1" value={row.field}
                    onChange={e => updateRow(i, { field: e.target.value })}>
                    <option value="">field…</option>
                    {(schema?.fields || []).map(f => <option key={f.alias} value={f.alias}>{f.alias}</option>)}
                  </select>
                  <label className="sr-only" htmlFor={`b-op-${i}`}>Operator</label>
                  <select id={`b-op-${i}`} className="input text-sm" value={row.op}
                    onChange={e => updateRow(i, { op: e.target.value })}>
                    {(schema?.operators || ['=', '!=', '>', '<', '>=', '<=']).map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  {!hideValue && (
                    opts
                      ? (
                        <>
                          <label className="sr-only" htmlFor={`b-val-${i}`}>Value</label>
                          <select id={`b-val-${i}`} className="input text-sm flex-1" value={row.value}
                            onChange={e => updateRow(i, { value: e.target.value })}>
                            <option value="">value…</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </>
                      )
                      : (
                        <>
                          <label className="sr-only" htmlFor={`b-val-${i}`}>Value</label>
                          <input id={`b-val-${i}`} className="input text-sm flex-1" placeholder={SET_OPS.includes(row.op) ? 'a, b, c' : 'value'}
                            value={row.value} onChange={e => updateRow(i, { value: e.target.value })} />
                        </>
                      )
                  )}
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="text-neutral-300 hover:text-semantic-danger disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    aria-label={`Remove clause ${i + 1}`}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="ghost" size="sm" leftIcon={<Plus aria-hidden="true" className="h-3.5 w-3.5" />} onClick={addRow}>
              Add clause
            </Button>
            <Button variant="secondary" size="sm" onClick={applyBuilder}>Apply to query</Button>
          </div>
        </div>
      )}

      {/* Saved views (Cap R) — filter + column config stored as a named view */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-5 py-3 mb-4">
        <div className="flex items-center gap-3">
          <Bookmark aria-hidden="true" className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <label htmlFor="view-name" className="sr-only">View name</label>
          <input
            id="view-name"
            className="input flex-1 text-sm"
            placeholder="View name…"
            value={viewName}
            onChange={e => setViewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveView(); }}
          />
          <Button variant="secondary" size="sm" leftIcon={<BookmarkPlus aria-hidden="true" className="h-3.5 w-3.5" />}
            loading={viewSaving} disabled={!viewName.trim()} onClick={saveView}>
            Save as View
          </Button>
        </div>
        {savedViews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {savedViews.map(v => (
              <button key={v.id} onClick={() => { setBqlQuery(v.bqlFilter || ''); runQuery({ query: v.bqlFilter || '' }); }}
                className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm hover:border-brand-navy transition-colors group"
                aria-label={`Load view: ${v.name}`}>
                <Bookmark aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy flex-shrink-0" />
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{v.name}</span>
                {v.isShared && <span className="text-xs text-neutral-500">shared</span>}
                <button type="button" onClick={e => { e.stopPropagation(); deleteView(v.id); }}
                  className="text-neutral-300 hover:text-semantic-danger opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  aria-label={`Remove view ${v.name}`}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Board / group-by breakdown — count per bucket, click a lane to drill into it. */}
      {groups && (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">
            Grouped by {groupBy} {groupBusy && <span className="text-neutral-400">· loading…</span>}
          </p>
          {groups.length === 0 && !groupBusy && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No matching items to group.</p>
          )}
          <div className="space-y-2">
            {(() => {
              const max = groups.reduce((m, g) => Math.max(m, Number(g.count) || 0), 0) || 1;
              return groups.map(g => {
                const count = Number(g.count) || 0;
                return (
                  <button key={g.value || '∅'} type="button" onClick={() => drillInto(g.value)}
                    className="flex w-full items-center gap-3 text-left group"
                    aria-label={`Filter to ${groupLabel(g.value)} (${count} items)`}>
                    <span className="w-40 shrink-0 truncate text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-brand-navy">
                      {groupLabel(g.value)}
                    </span>
                    <span className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-900 rounded-sm overflow-hidden">
                      <span className="block h-full bg-brand-navy-tint/70 group-hover:bg-brand-navy"
                        style={{ width: `${Math.round((count / max) * 100)}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-sm text-neutral-600 dark:text-neutral-400">
                      {count}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Results — JIRA-style navigator: sortable columns, column chooser, CSV export */}
      {!groups && bqlResults.length > 0 && (
        <BqlResultsTable
          results={bqlResults}
          sort={sort}
          nameMaps={nameMaps}
          priorityOptions={schema?.enums?.priority || []}
          onSort={(s) => runQuery({ sort: s })}
          onOpen={openItem}
          onShowMore={showMore}
          onBulk={runBulk}
          canShowMore={bqlResults.length >= resultSize && resultSize < 500}
        />
      )}
      {bqlResults.length === 0 && bqlQuery && !bqlError && (
        <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
          <p className="text-sm">No results. Run the query to see results.</p>
        </div>
      )}
    </div>
  );
}

// A labelled, wrap-friendly row of clickable insert chips.
function ChipRow({ label, items, onPick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="font-semibold text-neutral-600 dark:text-neutral-400 shrink-0 pt-0.5">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {items.map(token => (
          <button key={token} type="button" onClick={() => onPick(token)}
            className="font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:text-brand-navy transition-colors"
            aria-label={`Insert ${token}`}>
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}
