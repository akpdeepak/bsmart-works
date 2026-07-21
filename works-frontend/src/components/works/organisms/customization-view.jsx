import { useCallback, useEffect, useState } from 'react';
import {
  SlidersHorizontal, History, LayoutTemplate, FlaskConical, FormInput, LayoutGrid, Code2,
} from 'lucide-react';
import { configClient, parseDocument, normalizeDoc, writePath } from '@/lib/customization';
import { Loading, ErrorState, ImpactDialog } from './customization/shared';
import { tabClass } from './customization/helpers';
import { SettingsTab } from './customization/settings-tab';
import { VersionsTab } from './customization/versions-tab';
import { TemplatesTab } from './customization/templates-tab';
import { SandboxTab } from './customization/sandbox-tab';
import { FormsTab } from './customization/forms-tab';
import { PagesTab } from './customization/pages-tab';
import { ExtensionsTab } from './customization/extensions-tab';
import { PageLayout } from '@/components/works/templates/page-layout';

// Organism — Universal Customization Engine surface (iteration 17, Cap R). One configuration place
// for a workspace: centralized Settings (branding/locale/timezone/working calendar/defaults) with
// lockable settings, Versions (history + diff + rollback), Templates (save/apply for onboarding),
// Sandbox (preview before promotion), and the Forms / Pages / Extensions builders — all backed by
// one versioned document so every change is diffable, rollback-able and auditable. All HTTP via the
// configClient (apiClient); token classes only; every interactive element labelled; loading / empty
// / error states explicit (RB-30 §6). Writes are gated server-side by manage_workspace and (locked
// settings) owner tier (RB-40 §1) — the UI hides write controls when canManage is false, the API is
// the real guard.
//
// This file is a thin tab router + permission guard: it owns the shared versioned-document state
// bag, the per-surface `load` dispatcher, and the shared save / impact flow. Each tab's render and
// local state live in its own file under ./customization, reusing the presentational primitives,
// class tokens and the impact dialog from ./customization/shared.

const TABS = [
  { id: 'settings', label: 'Settings', Icon: SlidersHorizontal },
  { id: 'versions', label: 'Versions', Icon: History },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'sandbox', label: 'Sandbox', Icon: FlaskConical },
  { id: 'forms', label: 'Forms', Icon: FormInput },
  { id: 'pages', label: 'Pages', Icon: LayoutGrid },
  { id: 'extensions', label: 'Extensions', Icon: Code2 },
];

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

  if (loading) {
    return (
      <PageLayout header={null}>
        <Loading />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={null}>
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
    </PageLayout>
  );
}
