import { useState, useEffect } from 'react';
import { Sparkles, X, BookmarkPlus, Bookmark } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { savedViewsClient } from '@/lib/saved-views';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { PriorityBadge } from '@/components/works/priority-badge';
import { capabilityEnabled } from '@/lib/ai';

// BQL query view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent owns query state + run/save/fetch handlers. Extraction also associates the "Query"
// label with its textarea and labels the filter-name input (finding D3).
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
  }, [activeWorkspaceId]);

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

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">BQL — bSmart Query Language</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">Write composable queries to filter work items. Use AND/OR, comparison operators, and functions like currentUser() and today().</p>

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
          <label htmlFor="bql-query" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Query</label>
          <div className="flex gap-2 mt-2">
            <textarea
              id="bql-query"
              className="input flex-1 font-mono text-sm resize-none"
              rows={3}
              placeholder={'priority = High AND assignee = currentUser()\nstatus != Done AND type = Bug\ndueDate < today() AND priority IN (High, Highest)'}
              value={bqlQuery}
              onChange={e => setBqlQuery(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runBql(); } }}
            />
          </div>
          {bqlError && <p className="text-xs text-semantic-danger mt-2 font-mono">{bqlError}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="action" onClick={runBql}>Run Query (Ctrl+Enter)</Button>
          <div className="flex gap-2 items-center flex-1">
            <input className="input flex-1 text-sm" aria-label="Filter name" placeholder="Filter name..." value={bqlFilterName} onChange={e => setBqlFilterName(e.target.value)} />
            <Button variant="secondary" onClick={saveBqlFilter}>Save Filter</Button>
          </div>
        </div>
        <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-600">Fields:</span> priority, status, type, assignee, dueDate, sprint, storyPoints &nbsp;·&nbsp;
          <span className="font-semibold text-neutral-600">Ops:</span> = != {'<'} {'>'} {'<='} {'>='} IN CONTAINS STARTSWITH &nbsp;·&nbsp;
          <span className="font-semibold text-neutral-600">Functions:</span> currentUser() today() now()
        </div>
      </div>

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
