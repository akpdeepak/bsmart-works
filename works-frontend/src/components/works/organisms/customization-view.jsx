import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SlidersHorizontal, History, LayoutTemplate, FlaskConical, FormInput, LayoutGrid, Code2,
  Download, Upload, RotateCcw, Plus, Trash2, Lock, Unlock, AlertTriangle, CheckCircle2, Save,
} from 'lucide-react';
import { configClient, parseDocument, normalizeDoc, writePath, toggleIn } from '@/lib/customization';
import { absoluteDateTime } from '@/lib/format';

// Organism — Universal Customization Engine surface (iteration 17, Cap R). One configuration place
// for a workspace: centralized Settings (branding/locale/timezone/working calendar/defaults) with
// lockable settings, Versions (history + diff + rollback), Templates (save/apply for onboarding),
// Sandbox (preview before promotion), and the Forms / Pages / Extensions builders — all backed by
// one versioned document so every change is diffable, rollback-able and auditable. All HTTP via the
// configClient (apiClient); token classes only; every interactive element labelled; loading / empty
// / error states explicit (RB-30 §6). Writes are gated server-side by manage_workspace and (locked
// settings) owner tier (RB-40 §1) — the UI hides write controls when canManage is false, the API is
// the real guard.

const TABS = [
  { id: 'settings', label: 'Settings', Icon: SlidersHorizontal },
  { id: 'versions', label: 'Versions', Icon: History },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'sandbox', label: 'Sandbox', Icon: FlaskConical },
  { id: 'forms', label: 'Forms', Icon: FormInput },
  { id: 'pages', label: 'Pages', Icon: LayoutGrid },
  { id: 'extensions', label: 'Extensions', Icon: Code2 },
];

const WORKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const COLOR_TOKENS = ['brand-navy', 'brand-navy-tint', 'brand-orange', 'neutral-600', 'neutral-900'];

const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';
const BTN_DANGER = 'inline-flex items-center gap-2 rounded-lg border border-semantic-danger/30 px-3 py-2 text-sm font-medium text-semantic-danger transition-colors hover:bg-semantic-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 disabled:opacity-50';
const INPUT = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-1';
const CARD = 'rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900';

export function CustomizationView({ workspaceId, canManage = false, isOwner = false, onToast }) {
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState(null);
  const [doc, setDoc] = useState({});
  const [summary, setSummary] = useState('');
  const [versions, setVersions] = useState([]);
  const [diffRows, setDiffRows] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [sandboxes, setSandboxes] = useState([]);
  const [extPoints, setExtPoints] = useState([]);
  const [impact, setImpact] = useState(null); // { document, onConfirm, report, title }

  const toast = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      if (tab === 'settings' || tab === 'forms' || tab === 'pages' || tab === 'extensions') {
        const c = await configClient.settings(workspaceId);
        setConfig(c);
        setDoc(normalizeDoc(parseDocument(c.document)));
        if (tab === 'extensions') {
          setExtPoints(await configClient.extensionPoints(workspaceId).catch(() => []));
        }
      } else if (tab === 'versions') {
        setVersions(await configClient.versions(workspaceId));
        setDiffRows(null);
      } else if (tab === 'templates') {
        setTemplates(await configClient.templates(workspaceId));
      } else if (tab === 'sandbox') {
        setSandboxes(await configClient.sandboxes(workspaceId));
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load configuration.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, tab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function selectTab(id) {
    if (id === tab) return;
    setLoading(true);
    setError(null);
    setTab(id);
  }

  function reload() {
    setLoading(true);
    load();
  }

  // ── Settings document mutation helpers ──────────────────────────────────────
  function setPath(path, value) {
    setDoc((prev) => writePath(prev, path, value));
  }

  function toggleLock(path) {
    setDoc((prev) => {
      const locks = Array.isArray(prev.locks) ? prev.locks : [];
      const next = locks.includes(path) ? locks.filter((p) => p !== path) : [...locks, path];
      return { ...prev, locks: next };
    });
  }

  async function saveDocument(nextDoc, msg) {
    if (!canManage) return;
    setSaving(true);
    try {
      const saved = await configClient.updateSettings(workspaceId, JSON.stringify(nextDoc ?? doc), msg ?? summary);
      setConfig(saved);
      setDoc(normalizeDoc(parseDocument(saved.document)));
      setSummary('');
      toast(`Configuration saved (version ${saved.currentVersion}).`, 'success');
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Run impact analysis, then ask to confirm before a mutating apply/promote/save.
  async function withImpact(targetDocument, title, onConfirm) {
    try {
      const report = await configClient.impact(workspaceId, targetDocument);
      setImpact({ report, title, onConfirm });
    } catch (e) {
      toast(e.message || 'Impact analysis failed.', 'error');
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Customization</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Tune every workspace behavior without engineering tickets — versioned, sandboxed and
            recoverable.
            {config ? <span className="ml-1 font-medium text-neutral-900 dark:text-neutral-200">Live version {config.currentVersion}.</span> : null}
          </p>
        </div>
        {!canManage && (
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800">
            Read-only — needs workspace admin
          </span>
        )}
      </header>

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700" aria-label="Customization sections">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={tabClass(tab === id)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {tab === 'settings' && (
            <SettingsTab
              doc={doc} setPath={setPath} toggleLock={toggleLock}
              canManage={canManage} canLock={isOwner} saving={saving} summary={summary} setSummary={setSummary}
              onSave={() => saveDocument()} workspaceId={workspaceId} toast={toast} onImported={reload}
            />
          )}
          {tab === 'versions' && (
            <VersionsTab
              workspaceId={workspaceId} versions={versions} diffRows={diffRows} setDiffRows={setDiffRows}
              canManage={canManage} toast={toast} onChanged={reload}
            />
          )}
          {tab === 'templates' && (
            <TemplatesTab
              workspaceId={workspaceId} templates={templates} canManage={canManage}
              toast={toast} onChanged={reload} withImpact={withImpact}
            />
          )}
          {tab === 'sandbox' && (
            <SandboxTab
              workspaceId={workspaceId} sandboxes={sandboxes} canManage={canManage}
              toast={toast} onChanged={reload} withImpact={withImpact}
            />
          )}
          {tab === 'forms' && (
            <FormsTab doc={doc} setDoc={setDoc} canManage={canManage} saving={saving}
              onSave={(d) => saveDocument(d, 'Edited custom forms')} />
          )}
          {tab === 'pages' && (
            <PagesTab doc={doc} setDoc={setDoc} canManage={canManage} saving={saving}
              onSave={(d) => saveDocument(d, 'Edited custom pages')} />
          )}
          {tab === 'extensions' && (
            <ExtensionsTab doc={doc} setDoc={setDoc} extPoints={extPoints} canManage={canManage}
              saving={saving} onSave={(d) => saveDocument(d, 'Edited extensions')} />
          )}
        </>
      )}

      {impact && (
        <ImpactDialog
          impact={impact}
          onCancel={() => setImpact(null)}
          onConfirm={async () => {
            const fn = impact.onConfirm;
            setImpact(null);
            await fn();
          }}
        />
      )}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab({ doc, setPath, toggleLock, canManage, canLock, saving, summary, setSummary, onSave, workspaceId, toast, onImported }) {
  const s = doc.settings || {};
  const branding = s.branding || {};
  const cal = s.workingCalendar || {};
  const defaults = s.defaults || {};
  const locks = Array.isArray(doc.locks) ? doc.locks : [];
  const isLocked = (p) => locks.some((l) => p === l || p.startsWith(`${l}.`));

  const [importOpen, setImportOpen] = useState(false);

  async function doExport(format) {
    try {
      const res = await configClient.export(workspaceId, format);
      navigatorDownload(`workspace-config.${format === 'yaml' ? 'yaml' : 'json'}`, res.content);
      toast(`Exported configuration as ${format.toUpperCase()}.`, 'success');
    } catch (e) {
      toast(e.message || 'Export failed.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={() => doExport('json')}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export JSON
        </button>
        <button type="button" className={BTN_GHOST} onClick={() => doExport('yaml')}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export YAML
        </button>
        {canManage && (
          <button type="button" className={BTN_GHOST} onClick={() => setImportOpen((v) => !v)}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Import
          </button>
        )}
      </div>

      {importOpen && canManage && (
        <ImportPanel workspaceId={workspaceId} toast={toast} onDone={() => { setImportOpen(false); onImported(); }} />
      )}

      <Section title="Branding" lockPath="settings.branding" locked={isLocked('settings.branding')} canLock={canLock} onToggleLock={toggleLock}>
        <Field label="App name">
          <input className={INPUT} value={branding.appName || ''} disabled={!canManage}
            aria-label="App name"
            onChange={(e) => setPath('settings.branding.appName', e.target.value)} />
        </Field>
        <Field label="Primary color (token)">
          <select className={INPUT} value={branding.primaryColor || 'brand-navy'} disabled={!canManage}
            aria-label="Primary color token"
            onChange={(e) => setPath('settings.branding.primaryColor', e.target.value)}>
            {COLOR_TOKENS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Accent color (token)">
          <select className={INPUT} value={branding.accentColor || 'brand-orange'} disabled={!canManage}
            aria-label="Accent color token"
            onChange={(e) => setPath('settings.branding.accentColor', e.target.value)}>
            {COLOR_TOKENS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Logo URL">
          <input className={INPUT} value={branding.logoUrl || ''} disabled={!canManage}
            aria-label="Logo URL"
            onChange={(e) => setPath('settings.branding.logoUrl', e.target.value)} />
        </Field>
      </Section>

      <Section title="Locale & time" lockPath="settings.timezone" locked={isLocked('settings.timezone')} canLock={canLock} onToggleLock={toggleLock}>
        <Field label="Locale">
          <input className={INPUT} value={s.locale || ''} disabled={!canManage}
            aria-label="Locale"
            onChange={(e) => setPath('settings.locale', e.target.value)} />
        </Field>
        <Field label="Timezone">
          <input className={INPUT} value={s.timezone || ''} disabled={!canManage}
            aria-label="Timezone"
            onChange={(e) => setPath('settings.timezone', e.target.value)} />
        </Field>
      </Section>

      <Section title="Working calendar" lockPath="settings.workingCalendar" locked={isLocked('settings.workingCalendar')} canLock={canLock} onToggleLock={toggleLock}>
        <div className="sm:col-span-2">
          <span className={LABEL}>Workdays</span>
          <div className="flex flex-wrap gap-2">
            {WORKDAYS.map((d) => {
              const on = Array.isArray(cal.workdays) && cal.workdays.includes(d);
              return (
                <label key={d} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700">
                  <input type="checkbox" checked={on} disabled={!canManage}
                    aria-label={d}
                    onChange={() => setPath('settings.workingCalendar.workdays', toggleIn(cal.workdays, d))} />
                  {d}
                </label>
              );
            })}
          </div>
        </div>
        <Field label="Start hour">
          <input type="number" min="0" max="23" className={INPUT} value={cal.startHour ?? 9} disabled={!canManage}
            aria-label="Start hour"
            onChange={(e) => setPath('settings.workingCalendar.startHour', Number(e.target.value))} />
        </Field>
        <Field label="End hour">
          <input type="number" min="0" max="23" className={INPUT} value={cal.endHour ?? 18} disabled={!canManage}
            aria-label="End hour"
            onChange={(e) => setPath('settings.workingCalendar.endHour', Number(e.target.value))} />
        </Field>
      </Section>

      <Section title="Defaults" lockPath="settings.defaults" locked={isLocked('settings.defaults')} canLock={canLock} onToggleLock={toggleLock}>
        <Field label="Default work item type">
          <input className={INPUT} value={defaults.workItemType || ''} disabled={!canManage}
            aria-label="Default work item type"
            onChange={(e) => setPath('settings.defaults.workItemType', e.target.value)} />
        </Field>
        <Field label="Default priority">
          <input className={INPUT} value={defaults.priority || ''} disabled={!canManage}
            aria-label="Default priority"
            onChange={(e) => setPath('settings.defaults.priority', e.target.value)} />
        </Field>
      </Section>

      {canManage && (
        <div className={CARD}>
          <Field label="Change summary (optional)">
            <input className={INPUT} value={summary} placeholder="e.g. Switch to UTC for the new DISCOM"
              aria-label="Change summary"
              onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <div className="mt-3 flex justify-end">
            <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={onSave}>
              <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, lockPath, locked, canLock, onToggleLock, children }) {
  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {locked && !canLock && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked
          </span>
        )}
        {canLock && lockPath && (
          <button type="button" onClick={() => onToggleLock(lockPath)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${title}`}>
            {locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
            {locked ? 'Locked' : 'Unlocked'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

function ImportPanel({ workspaceId, toast, onDone }) {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState('json');
  const [busy, setBusy] = useState(false);
  async function doImport() {
    setBusy(true);
    try {
      const saved = await configClient.import(workspaceId, content, format, '');
      toast(`Imported configuration (version ${saved.currentVersion}).`, 'success');
      onDone();
    } catch (e) {
      toast(e.message || 'Import failed.', 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={CARD}>
      <div className="mb-2 flex items-center gap-2">
        <span className={LABEL}>Format</span>
        <select className="rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          value={format} aria-label="Import format" onChange={(e) => setFormat(e.target.value)}>
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
        </select>
      </div>
      <textarea className={`${INPUT} h-40 font-mono`} value={content} placeholder="Paste configuration…"
        aria-label="Import payload" onChange={(e) => setContent(e.target.value)} />
      <div className="mt-2 flex justify-end">
        <button type="button" className={BTN_PRIMARY} disabled={busy || !content.trim()} onClick={doImport}>
          <Upload className="h-4 w-4" aria-hidden="true" /> Import & save
        </button>
      </div>
    </div>
  );
}

// ── Versions tab ────────────────────────────────────────────────────────────────
function VersionsTab({ workspaceId, versions, diffRows, setDiffRows, canManage, toast, onChanged }) {
  async function showDiff(version) {
    try {
      const rows = await configClient.diff(workspaceId, version, 0);
      setDiffRows({ version, rows });
    } catch (e) {
      toast(e.message || 'Diff failed.', 'error');
    }
  }
  async function rollback(version) {
    try {
      const saved = await configClient.rollback(workspaceId, version);
      toast(`Rolled back to version ${version} (now version ${saved.currentVersion}).`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Rollback failed.', 'error');
    }
  }
  if (!versions.length) {
    return <Empty title="No versions yet" hint="Save a change in Settings to create the first version." />;
  }
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Version {v.versionNumber}
                <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800">{v.source}</span>
              </p>
              <p className="text-xs text-neutral-600">
                {v.summary || 'No summary'} · {absoluteDateTime(v.createdAt)}{v.createdBy ? ` · ${v.createdBy}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => showDiff(v.versionNumber)}>Diff vs live</button>
              {canManage && (
                <button type="button" className={BTN_GHOST} onClick={() => rollback(v.versionNumber)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Roll back
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {diffRows && <DiffTable title={`Version ${diffRows.version} → live`} rows={diffRows.rows} />}
    </div>
  );
}

function DiffTable({ title, rows }) {
  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-neutral-600">No differences.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-600">
              <th className="py-1 pr-3">Path</th><th className="py-1 pr-3">Change</th>
              <th className="py-1 pr-3">From</th><th className="py-1">To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.path}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-1 pr-3 font-mono text-xs text-neutral-900 dark:text-neutral-200">{r.path}</td>
                <td className="py-1 pr-3"><ChangeBadge op={r.op} /></td>
                <td className="py-1 pr-3 text-neutral-600">{r.oldValue || '—'}</td>
                <td className="py-1 text-neutral-900 dark:text-neutral-200">{r.newValue || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ChangeBadge({ op }) {
  const map = {
    ADDED: 'bg-semantic-success/10 text-semantic-success',
    REMOVED: 'bg-semantic-danger/10 text-semantic-danger',
    CHANGED: 'bg-semantic-warning/10 text-semantic-warning',
  };
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${map[op] || 'bg-neutral-100 text-neutral-600'}`}>{op}</span>;
}

// ── Templates tab ────────────────────────────────────────────────────────────────
function TemplatesTab({ workspaceId, templates, canManage, toast, onChanged, withImpact }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shareable, setShareable] = useState(false);

  async function save() {
    try {
      await configClient.saveTemplate(workspaceId, name, description, shareable);
      toast('Saved current configuration as a template.', 'success');
      setName(''); setDescription(''); setShareable(false);
      onChanged();
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    }
  }
  async function apply(t) {
    const tplDoc = t.document;
    withImpact(tplDoc, `Apply template "${t.name}"`, async () => {
      try {
        const saved = await configClient.applyTemplate(workspaceId, t.id);
        toast(`Applied "${t.name}" (version ${saved.currentVersion}).`, 'success');
        onChanged();
      } catch (e) {
        toast(e.message || 'Apply failed.', 'error');
      }
    });
  }
  async function remove(t) {
    try {
      await configClient.deleteTemplate(workspaceId, t.id);
      toast(`Deleted template "${t.name}".`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Delete failed.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className={CARD}>
          <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">Save current as template</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={INPUT} value={name} aria-label="Template name" onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Description"><input className={INPUT} value={description} aria-label="Template description" onChange={(e) => setDescription(e.target.value)} /></Field>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={shareable} onChange={(e) => setShareable(e.target.checked)} />
            Shareable (visible to every workspace)
          </label>
          <div className="mt-3 flex justify-end">
            <button type="button" className={BTN_PRIMARY} disabled={!name.trim()} onClick={save}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Save template
            </button>
          </div>
        </div>
      )}
      {!templates.length ? (
        <Empty title="No templates yet" hint="Save the current configuration as a template to reuse it." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className={CARD}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</p>
                  <p className="text-xs text-neutral-600">{t.description || 'No description'}</p>
                </div>
                {t.shareable && <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-xs font-medium text-brand-navy">Shareable</span>}
              </div>
              {canManage && (
                <div className="mt-3 flex gap-2">
                  <button type="button" className={BTN_PRIMARY} onClick={() => apply(t)}>Apply</button>
                  {t.ownerWorkspaceId === workspaceId && (
                    <button type="button" className={BTN_DANGER} onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sandbox tab ────────────────────────────────────────────────────────────────
function SandboxTab({ workspaceId, sandboxes, canManage, toast, onChanged, withImpact }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, document }

  async function create() {
    try {
      await configClient.createSandbox(workspaceId, name);
      toast(`Created sandbox "${name}".`, 'success');
      setName('');
      onChanged();
    } catch (e) {
      toast(e.message || 'Create failed.', 'error');
    }
  }
  async function open(s) {
    try {
      const full = await configClient.sandbox(workspaceId, s.id);
      setEditing({ id: s.id, document: pretty(full.document) });
    } catch (e) {
      toast(e.message || 'Could not open sandbox.', 'error');
    }
  }
  async function saveDraft() {
    try {
      await configClient.updateSandbox(workspaceId, editing.id, editing.document);
      toast('Sandbox draft saved.', 'success');
      setEditing(null);
      onChanged();
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    }
  }
  async function promote(s) {
    let full;
    try { full = await configClient.sandbox(workspaceId, s.id); } catch (e) { toast(e.message, 'error'); return; }
    withImpact(full.document, `Promote sandbox "${s.name}"`, async () => {
      try {
        const saved = await configClient.promoteSandbox(workspaceId, s.id);
        toast(`Promoted "${s.name}" to live (version ${saved.currentVersion}).`, 'success');
        onChanged();
      } catch (e) {
        toast(e.message || 'Promote failed.', 'error');
      }
    });
  }
  async function discard(s) {
    try {
      await configClient.discardSandbox(workspaceId, s.id);
      toast(`Discarded "${s.name}".`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Discard failed.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 p-3 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="inline-flex items-center gap-1 font-medium text-semantic-warning">
          <FlaskConical className="h-4 w-4" aria-hidden="true" /> Sandbox
        </span>{' '}
        — changes here stay isolated until you promote them. Promotion runs impact analysis first.
      </div>
      {canManage && (
        <div className={`${CARD} flex flex-wrap items-end gap-3`}>
          <div className="flex-1"><Field label="New sandbox name"><input className={INPUT} value={name} aria-label="Sandbox name" onChange={(e) => setName(e.target.value)} /></Field></div>
          <button type="button" className={BTN_PRIMARY} disabled={!name.trim()} onClick={create}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create from live
          </button>
        </div>
      )}
      {!sandboxes.length ? (
        <Empty title="No sandboxes" hint="Create a sandbox to preview config changes safely." />
      ) : (
        <ul className="space-y-2">
          {sandboxes.map((s) => (
            <li key={s.id} className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name}
                  <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800">{s.status}</span>
                </p>
                <p className="text-xs text-neutral-600">Forked from version {s.baseVersion} · {absoluteDateTime(s.createdAt)}</p>
              </div>
              {canManage && s.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <button type="button" className={BTN_GHOST} onClick={() => open(s)}>Edit</button>
                  <button type="button" className={BTN_PRIMARY} onClick={() => promote(s)}>Promote</button>
                  <button type="button" className={BTN_DANGER} onClick={() => discard(s)} aria-label={`Discard ${s.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className={CARD}>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Edit sandbox document</h3>
          <textarea className={`${INPUT} h-64 font-mono`} value={editing.document} aria-label="Sandbox document"
            onChange={(e) => setEditing({ ...editing, document: e.target.value })} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className={BTN_PRIMARY} onClick={saveDraft}>Save draft</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Forms / Pages / Extensions builders ──────────────────────────────────────────
function FormsTab({ doc, setDoc, canManage, saving, onSave }) {
  const forms = Array.isArray(doc.forms) ? doc.forms : [];
  const update = (next) => setDoc({ ...doc, forms: next });
  function addForm() { update([...forms, { id: rid('form'), name: 'New form', target: 'work_item', fields: [] }]); }
  function removeForm(i) { update(forms.filter((_, idx) => idx !== i)); }
  function setForm(i, patch) { update(forms.map((f, idx) => (idx === i ? { ...f, ...patch } : f))); }
  function addField(i) { setForm(i, { fields: [...(forms[i].fields || []), { key: rid('field'), label: 'Field', type: 'text', required: false }] }); }
  function setField(i, j, patch) { setForm(i, { fields: forms[i].fields.map((f, idx) => (idx === j ? { ...f, ...patch } : f)) }); }
  function removeField(i, j) { setForm(i, { fields: forms[i].fields.filter((_, idx) => idx !== j) }); }

  return (
    <BuilderShell title="Custom forms" description="Design data-entry forms with typed fields. Saved into the versioned config."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={addForm} addLabel="Add form" empty={!forms.length}>
      {forms.map((form, i) => (
        <div key={form.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Form name"><input className={INPUT} value={form.name} disabled={!canManage} aria-label="Form name" onChange={(e) => setForm(i, { name: e.target.value })} /></Field>
            <Field label="Target"><input className={INPUT} value={form.target || ''} disabled={!canManage} aria-label="Form target" onChange={(e) => setForm(i, { target: e.target.value })} /></Field>
          </div>
          <div className="mt-3 space-y-2">
            {(form.fields || []).map((fld, j) => (
              <div key={fld.key} className="flex flex-wrap items-end gap-2">
                <div className="flex-1"><Field label="Label"><input className={INPUT} value={fld.label} disabled={!canManage} aria-label="Field label" onChange={(e) => setField(i, j, { label: e.target.value })} /></Field></div>
                <Field label="Type">
                  <select className={INPUT} value={fld.type} disabled={!canManage} aria-label="Field type" onChange={(e) => setField(i, j, { type: e.target.value })}>
                    {['text', 'number', 'date', 'select', 'checkbox', 'textarea'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <label className="inline-flex items-center gap-1 px-1 pb-2 text-xs text-neutral-700 dark:text-neutral-300">
                  <input type="checkbox" checked={!!fld.required} disabled={!canManage} aria-label="Required" onChange={(e) => setField(i, j, { required: e.target.checked })} /> Req
                </label>
                {canManage && <button type="button" className={BTN_DANGER} onClick={() => removeField(i, j)} aria-label="Remove field"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 flex justify-between">
              <button type="button" className={BTN_GHOST} onClick={() => addField(i)}><Plus className="h-4 w-4" aria-hidden="true" /> Add field</button>
              <button type="button" className={BTN_DANGER} onClick={() => removeForm(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove form</button>
            </div>
          )}
        </div>
      ))}
    </BuilderShell>
  );
}

function PagesTab({ doc, setDoc, canManage, saving, onSave }) {
  const pages = Array.isArray(doc.pages) ? doc.pages : [];
  const update = (next) => setDoc({ ...doc, pages: next });
  function addPage() { update([...pages, { id: rid('page'), name: 'New page', roles: ['ADMIN'], widgets: [] }]); }
  function setPage(i, patch) { update(pages.map((p, idx) => (idx === i ? { ...p, ...patch } : p))); }
  function removePage(i) { update(pages.filter((_, idx) => idx !== i)); }
  function addWidget(i) { setPage(i, { widgets: [...(pages[i].widgets || []), { type: 'list', title: 'Widget' }] }); }
  function setWidget(i, j, patch) { setPage(i, { widgets: pages[i].widgets.map((w, idx) => (idx === j ? { ...w, ...patch } : w)) }); }
  function removeWidget(i, j) { setPage(i, { widgets: pages[i].widgets.filter((_, idx) => idx !== j) }); }

  return (
    <BuilderShell title="Custom pages" description="Build landing pages from widgets with per-role assignment."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={addPage} addLabel="Add page" empty={!pages.length}>
      {pages.map((page, i) => (
        <div key={page.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Page name"><input className={INPUT} value={page.name} disabled={!canManage} aria-label="Page name" onChange={(e) => setPage(i, { name: e.target.value })} /></Field>
            <Field label="Roles (comma-separated)"><input className={INPUT} value={(page.roles || []).join(', ')} disabled={!canManage} aria-label="Page roles" onChange={(e) => setPage(i, { roles: e.target.value.split(',').map((r) => r.trim()).filter(Boolean) })} /></Field>
          </div>
          <div className="mt-3 space-y-2">
            {(page.widgets || []).map((w, j) => (
              <div key={`${page.id}-w-${j}`} className="flex flex-wrap items-end gap-2">
                <div className="flex-1"><Field label="Title"><input className={INPUT} value={w.title} disabled={!canManage} aria-label="Widget title" onChange={(e) => setWidget(i, j, { title: e.target.value })} /></Field></div>
                <Field label="Type">
                  <select className={INPUT} value={w.type} disabled={!canManage} aria-label="Widget type" onChange={(e) => setWidget(i, j, { type: e.target.value })}>
                    {['list', 'chart', 'stat', 'text', 'table'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                {canManage && <button type="button" className={BTN_DANGER} onClick={() => removeWidget(i, j)} aria-label="Remove widget"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 flex justify-between">
              <button type="button" className={BTN_GHOST} onClick={() => addWidget(i)}><Plus className="h-4 w-4" aria-hidden="true" /> Add widget</button>
              <button type="button" className={BTN_DANGER} onClick={() => removePage(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove page</button>
            </div>
          )}
        </div>
      ))}
    </BuilderShell>
  );
}

function ExtensionsTab({ doc, setDoc, extPoints, canManage, saving, onSave }) {
  const exts = Array.isArray(doc.extensions) ? doc.extensions : [];
  const hooks = extPoints.length ? extPoints : [{ id: 'work_item.before_create', label: 'Before work item created' }];
  const update = (next) => setDoc({ ...doc, extensions: next });
  function add() { update([...exts, { id: rid('ext'), name: 'New extension', hook: hooks[0].id, code: '', enabled: false }]); }
  function setExt(i, patch) { update(exts.map((e, idx) => (idx === i ? { ...e, ...patch } : e))); }
  function remove(i) { update(exts.filter((_, idx) => idx !== i)); }

  return (
    <BuilderShell title="Code extensions" description="Bind JavaScript to a named extension point for cases the UI cannot express."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={add} addLabel="Add extension" empty={!exts.length}>
      <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 p-3 text-sm text-neutral-700 dark:text-neutral-300">
        Extensions are stored, versioned and audited here. Execution runs in an isolated sandbox
        (security-reviewed) and is delivered as a follow-up — definitions saved now will not run yet.
      </div>
      {exts.map((ext, i) => (
        <div key={ext.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={INPUT} value={ext.name} disabled={!canManage} aria-label="Extension name" onChange={(e) => setExt(i, { name: e.target.value })} /></Field>
            <Field label="Extension point">
              <select className={INPUT} value={ext.hook} disabled={!canManage} aria-label="Extension point" onChange={(e) => setExt(i, { hook: e.target.value })}>
                {hooks.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Code (JavaScript)">
              <textarea className={`${INPUT} h-32 font-mono`} value={ext.code} disabled={!canManage} aria-label="Extension code"
                onChange={(e) => setExt(i, { code: e.target.value })} />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={!!ext.enabled} disabled={!canManage} aria-label="Enabled" onChange={(e) => setExt(i, { enabled: e.target.checked })} /> Enabled
            </label>
            {canManage && <button type="button" className={BTN_DANGER} onClick={() => remove(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>}
          </div>
        </div>
      ))}
    </BuilderShell>
  );
}

function BuilderShell({ title, description, canManage, saving, onSave, onAdd, addLabel, empty, children }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button type="button" className={BTN_GHOST} onClick={onAdd}><Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}</button>
            <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={onSave}><Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>
      {empty ? <Empty title={`No ${title.toLowerCase()} yet`} hint={canManage ? `Use “${addLabel}” to create one.` : 'An admin can add these.'} /> : children}
    </div>
  );
}

// ── Impact dialog ────────────────────────────────────────────────────────────────
function ImpactDialog({ impact, onCancel, onConfirm }) {
  const { report, title } = impact;
  const cancelRef = useRef(null);
  // a11y (RB-30 §6): a modal must be keyboard-operable — focus moves into it on open and Escape
  // dismisses it. Without these the dialog could only be closed by tabbing to the Cancel button.
  // The Escape listener lives on document (not the dialog node) because `role="dialog"` is a
  // non-interactive element and jsx-a11y forbids key handlers on it.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-neutral-900/40 p-4"
      role="dialog" aria-modal="true" aria-labelledby="impact-dialog-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <h3 id="impact-dialog-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="mt-1 text-sm text-neutral-600">Impact analysis before this change lands:</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat n={report.affectedItems} label="Items" />
          <Stat n={report.affectedUsers} label="Users" />
          <Stat n={report.affectedAutomations} label="Automations" />
        </div>
        {report.warnings?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {report.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" aria-hidden="true" /> {w}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-neutral-600">{report.changes?.length || 0} field change(s) total.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className={BTN_GHOST} onClick={onCancel}>Cancel</button>
          <button type="button" className={BTN_PRIMARY} onClick={onConfirm}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Continue</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <p className="text-2xl font-bold text-brand-navy dark:text-neutral-100">{n}</p>
      <p className="text-xs uppercase tracking-wide text-neutral-600">{label}</p>
    </div>
  );
}

// ── Shared states ────────────────────────────────────────────────────────────────
function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-semantic-danger" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{message}</p>
      <button type="button" className={`${BTN_GHOST} mt-3`} onClick={onRetry}>Try again</button>
    </div>
  );
}

function Empty({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <SlidersHorizontal className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-600">{hint}</p>
    </div>
  );
}

function tabClass(active) {
  return [
    'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-brand-navy text-brand-navy dark:text-neutral-100'
      : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200',
  ].join(' ');
}

// ── Pure helpers ────────────────────────────────────────────────────────────────
function pretty(json) {
  try { return JSON.stringify(JSON.parse(json || '{}'), null, 2); } catch { return json || '{}'; }
}

function rid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function navigatorDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
