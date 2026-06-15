import { useState, useEffect, useCallback } from 'react';
import { FileText, FilePlus2, Sparkles, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { templatesClient, extractionClient } from '@/lib/knowledge-advanced';
import { KnowAiPanel } from '@/components/knowledge/KnowAiPanel';

// Advanced Knowledge — Document templates + AI structured-data extraction (iteration-20 Cap I).
// Self-fetching like DeveloperWorkspace: the parent supplies workspaceId + an optional toast handler.
// The library lists/creates workspace-scoped templates; the extraction panel turns free-form text into
// a fields table, badged with the AI Control Plane verdict (RB-40 §2 — "AI" vs "Offline" fallback).
export default function KnowledgeTemplatesView({ workspaceId, onUseTemplate, onToast }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', body: '' });
  const [creating, setCreating] = useState(false);

  const [text, setText] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const notify = useCallback((msg, kind) => { if (onToast) onToast(msg, kind); }, [onToast]);

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    templatesClient.list(workspaceId)
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || 'Could not load templates.'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const createTemplate = useCallback(() => {
    if (!form.name.trim()) { notify('A template name is required.', 'error'); return; }
    setCreating(true);
    templatesClient.create(workspaceId, form)
      .then((created) => {
        setTemplates((prev) => [...prev, created]);
        setForm({ name: '', category: '', description: '', body: '' });
        notify('Template created.', 'success');
      })
      .catch((e) => notify(e.message || 'Could not create template.', 'error'))
      .finally(() => setCreating(false));
  }, [workspaceId, form, notify]);

  const deleteTemplate = useCallback((id) => {
    templatesClient.remove(workspaceId, id)
      .then(() => {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setExpandedId((prev) => (prev === id ? null : prev));
        notify('Template deleted.', 'success');
      })
      .catch((e) => notify(e.message || 'Could not delete template.', 'error'));
  }, [workspaceId, notify]);

  const runExtract = useCallback(() => {
    if (!text.trim()) { notify('Enter some text to extract from.', 'error'); return; }
    setExtracting(true);
    extractionClient.extract(workspaceId, text)
      .then((res) => setExtraction(res))
      .catch((e) => notify(e.message || 'Could not extract fields.', 'error'))
      .finally(() => setExtracting(false));
  }, [workspaceId, text, notify]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Advanced Knowledge</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Reusable document templates and AI structured-data extraction.
        </p>
      </div>

      {workspaceId && (
        <div className="mb-6">
          <KnowAiPanel workspaceId={workspaceId} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Templates library ── */}
        <section className="lg:col-span-2" aria-labelledby="templates-heading">
          <h2 id="templates-heading" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Document templates
          </h2>
          {loading ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg animate-pulse bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-sm text-semantic-danger" role="alert">
              <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : templates.length === 0 ? (
            <EmptyState icon={FileText} title="No templates yet"
              subtitle="Create a reusable template with {{placeholders}} that authors start new articles from." />
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {t.category && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-brand-navy/10 text-brand-navy">{t.category}</span>
                        )}
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{t.name}</span>
                      </div>
                      {t.description && <p className="text-xs text-neutral-500 mt-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {t.body && (
                        <button
                          type="button"
                          onClick={() => setExpandedId((prev) => (prev === t.id ? null : t.id))}
                          aria-expanded={expandedId === t.id}
                          className="flex items-center gap-0.5 text-xs text-neutral-500 hover:text-brand-navy px-1.5 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                        >
                          {expandedId === t.id
                            ? <><ChevronUp aria-hidden="true" className="h-3 w-3" />Hide</>
                            : <><ChevronDown aria-hidden="true" className="h-3 w-3" />Body</>}
                        </button>
                      )}
                      {onUseTemplate && (
                        <Button variant="secondary" size="sm" onClick={() => onUseTemplate(t)}>Use</Button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id)}
                        aria-label={`Delete template "${t.name}"`}
                        className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {expandedId === t.id && t.body && (
                    <pre className="mt-3 text-xs font-mono bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 max-h-48">
                      {t.body}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Create template ── */}
        <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit"
          aria-labelledby="new-template-heading">
          <h2 id="new-template-heading" className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" /> New template
          </h2>
          <div className="space-y-3">
            <Field label="Name">
              <input className="input w-full text-sm" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category">
              <input className="input w-full text-sm" placeholder="RUNBOOK" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Description">
              <input className="input w-full text-sm" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Body (markdown)">
              <textarea className="input w-full text-sm font-mono" rows={5} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <Button variant="action" fullWidth disabled={creating} onClick={createTemplate}>
              {creating ? 'Creating…' : 'Create template'}
            </Button>
          </div>
        </section>
      </div>

      {/* ── Structured extraction ── */}
      <section className="mt-8" aria-labelledby="extract-heading">
        <h2 id="extract-heading" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-brand-orange" aria-hidden="true" /> Structured extraction
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          Pull emails, dates, identifiers and key:value fields out of free-form text.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Field label="Text">
              <textarea className="input w-full text-sm" rows={8} value={text}
                placeholder={'Owner: Deepak Pandey\nContact: dev@bcits.in\nDue: 2026-06-07\nTracking WRK-123'}
                onChange={(e) => setText(e.target.value)} />
            </Field>
            <Button variant="action" disabled={extracting} onClick={runExtract}>
              {extracting ? 'Extracting…' : 'Extract fields'}
            </Button>
          </div>
          <div>
            {!extraction ? (
              <EmptyState icon={Sparkles} title="No extraction yet"
                subtitle="Paste structured-looking text and extract its fields. Works offline; AI adds a narrative." />
            ) : (
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Extracted fields</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${extraction.fallback
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    : 'bg-brand-navy/10 text-brand-navy'}`}>
                    {extraction.fallback ? 'Offline' : `AI · ${extraction.tier}`}
                  </span>
                </div>
                <FieldsTable fields={extraction.fields} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Renders the extracted fields map as a simple two-column table; arrays/objects are flattened to text.
function FieldsTable({ fields }) {
  const entries = Object.entries(fields || {});
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">No structured fields were found.</p>;
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-neutral-100 dark:border-neutral-700 last:border-0">
            <th scope="row" className="text-left align-top py-1.5 pr-3 font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{key}</th>
            <td className="py-1.5 text-neutral-900 dark:text-neutral-100 font-mono break-words">{formatValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
  return String(value);
}
