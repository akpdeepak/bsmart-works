import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, BookmarkPlus, Bookmark, Check, AlertCircle, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { savedViewsClient } from '@/lib/saved-views';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { PriorityBadge } from '@/components/works/priority-badge';
import { anyCapabilityEnabled } from '@/lib/ai';

// Operators that take no right-hand value.
const NULLARY_OPS = ['IS EMPTY', 'IS NOT EMPTY'];
// Operators that take a comma-separated set.
const SET_OPS = ['IN', 'NOT IN'];

// Quote a value if it contains whitespace so the compiler reads it as one token.
export function quoteIfNeeded(v) {
  const s = String(v ?? '').trim();
  if (s === '') return '""';
  if (/\s/.test(s) && !/^".*"$/.test(s)) return `"${s}"`;
  return s;
}

// Compose a single visual-builder row into a BQL clause.
export function rowToClause({ field, op, value }) {
  if (!field) return '';
  if (NULLARY_OPS.includes(op)) return `${field} ${op}`;
  if (SET_OPS.includes(op)) {
    const items = String(value || '').split(',').map(s => s.trim()).filter(Boolean).map(quoteIfNeeded);
    if (items.length === 0) return '';
    return `${field} ${op} (${items.join(', ')})`;
  }
  if (value === '' || value == null) return '';
  return `${field} ${op} ${quoteIfNeeded(value)}`;
}

// BQL query view. The parent owns query state + run/save/fetch handlers; this view adds the
// schema-driven editor assists (P3): live validation, insert chips, and a visual builder that
// round-trips to BQL — the manual fallback RB-40 §2 mandates when AI is off.
export default function BqlView({
  bqlQuery,
  bqlError,
  bqlFilterName,
  bqlFilters,
  bqlResults,
  workItems,
  activeWorkspaceId,
  aiCapabilities = [],
  setBqlQuery,
  setBqlFilterName,
  setSelectedItem,
  runBql,
  saveBqlFilter,
  fetchBqlFilters,
}) {
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
  const queryRef = useRef(null);

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

  const aiOn = anyCapabilityEnabled(aiCapabilities);

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
      <h1 className="text-2xl font-bold text-brand-navy mb-1">BQL — bSmart Query Language</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">Write composable queries to filter work items. Use AND/OR/NOT, grouping with (), operators like IN, BETWEEN and IS EMPTY, and date functions like today() and startOfWeek().</p>

      {/* Iteration 10 Cap O — NL→BQL translation panel */}
      {aiOn && (
        <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-4 mb-4 flex gap-3 items-start">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-navy mt-2 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">Ask in plain English</p>
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
          <div className="flex gap-2 mt-2">
            <textarea
              id="bql-query"
              ref={queryRef}
              className="input flex-1 font-mono text-sm resize-none"
              rows={3}
              placeholder={'status = Open AND (priority = High OR priority = Critical)\nassignee = currentUser() AND createdAt >= startOfWeek()\ndueDate < today() AND status NOT IN (Done, Cancelled)'}
              value={bqlQuery}
              onChange={e => setBqlQuery(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runBql(); } }}
            />
          </div>
          {bqlError && <p className="text-xs text-semantic-danger mt-2 font-mono">{bqlError}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="action" onClick={() => runBql()}>Run Query (Ctrl+Enter)</Button>
          <Button variant="secondary" leftIcon={<SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={() => setBuilderOpen(o => !o)} aria-expanded={builderOpen}>
            Visual builder
          </Button>
          <div className="flex gap-2 items-center flex-1">
            <input className="input flex-1 text-sm" aria-label="Filter name" placeholder="Filter name..." value={bqlFilterName} onChange={e => setBqlFilterName(e.target.value)} />
            <Button variant="secondary" onClick={saveBqlFilter}>Save Filter</Button>
          </div>
        </div>

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
              <button key={v.id} onClick={() => { setBqlQuery(v.bqlFilter || ''); runBql(); }}
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

      {/* Saved filters */}
      {bqlFilters.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">Saved Filters</p>
          <div className="flex flex-wrap gap-2">
            {bqlFilters.map(f => (
              <button key={f.id} onClick={() => { setBqlQuery(f.query); runBql(); }}
                className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm hover:border-brand-navy transition-colors group">
                <span className="font-medium text-neutral-900">{f.name}</span>
                {f.isShared && <span className="text-xs text-neutral-600 dark:text-neutral-400">shared</span>}
                <button onClick={e => { e.stopPropagation(); api.raw(`/bql/filters/${f.id}`, { method: 'DELETE' }).then(() => fetchBqlFilters()); }}
                  className="text-neutral-300 hover:text-semantic-danger opacity-0 group-hover:opacity-100 transition-opacity ml-1" aria-label="Remove"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {bqlResults.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-900">{bqlResults.length} result{bqlResults.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-neutral-50 max-h-96 overflow-y-auto">
            {bqlResults.map((item, i) => (
              <div key={item.id || i} role="button" tabIndex={0} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
                onClick={() => { const full = workItems.find(w => w.id === item.id); if (full) setSelectedItem(full); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const full = workItems.find(w => w.id === item.id); if (full) setSelectedItem(full); } }}>
                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-24 flex-shrink-0">{item.id}</span>
                <span className="flex-1 text-sm font-medium text-neutral-900 truncate">{item.title}</span>
                {item.status && <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>}
                {item.priority && <PriorityBadge priority={item.priority} />}
              </div>
            ))}
          </div>
        </div>
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
