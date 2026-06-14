import { useState } from 'react';
import { Download, Upload, Save } from 'lucide-react';
import { configClient, toggleIn } from '@/lib/customization';
import {
  BTN_PRIMARY, BTN_GHOST, INPUT, LABEL, CARD,
  Section, Field,
} from './shared';
import { navigatorDownload } from './helpers';

const WORKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const COLOR_TOKENS = ['brand-navy', 'brand-navy-tint', 'brand-orange', 'neutral-600', 'neutral-900'];

// ── Settings tab ──────────────────────────────────────────────────────────────
export function SettingsTab({ doc, setPath, toggleLock, canManage, canLock, saving, summary, setSummary, onSave, workspaceId, toast, onImported }) {
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
