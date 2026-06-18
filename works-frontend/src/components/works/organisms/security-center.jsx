// Security Center — the iteration 19 (Cap T) enterprise-security admin surface (RB-40 §4).
// Passkeys, conditional access, a tamper-evident audit log, data residency + BYOK, AI anomaly
// detection, GDPR/DPDP data rights, the pen-test register, and one-click SOC 2 / ISO 27001 evidence
// — all over the /security API. All HTTP goes through securityClient → apiClient (CLAUDE.md §3).
// Reads need view_audit_log, writes need manage_security (gated here AND enforced server-side).
// Tokens only, five interactive states, WCAG-AA (RB-30).

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, KeyRound, MapPin, Activity, ScrollText, FileCheck2, Fingerprint,
  RefreshCw, Lock, Trash2, AlertTriangle, CheckCircle2, Plus, Download, Radio,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { securityClient } from '@/lib/security';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { registerPasskey, passkeysSupported } from '@/lib/passkey';
import { exportRowsToCsv } from '@/lib/export';
import { PageLayout } from '@/components/works/templates/page-layout';

const REGIONS = [
  { id: 'IN', label: 'India (Mumbai)' }, { id: 'EU', label: 'EU (Frankfurt)' },
  { id: 'US', label: 'US (Virginia)' }, { id: 'AP', label: 'Asia-Pacific (Singapore)' },
  { id: 'UK', label: 'UK (London)' },
];
const TABS = [
  { id: 'overview', label: 'Overview', Icon: ShieldCheck },
  { id: 'audit', label: 'Audit log', Icon: ScrollText },
  { id: 'access', label: 'Conditional access', Icon: Lock },
  { id: 'anomalies', label: 'Anomalies', Icon: Activity },
  { id: 'data', label: 'Data & residency', Icon: MapPin },
  { id: 'assurance', label: 'Compliance', Icon: FileCheck2 },
  { id: 'passkeys', label: 'Passkeys', Icon: Fingerprint },
];
const SEVERITY_STYLE = {
  HIGH: 'bg-semantic-danger/10 text-semantic-danger',
  MEDIUM: 'bg-semantic-warning/10 text-semantic-warning',
  LOW: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
};

function Card({ title, subtitle, icon, action, children }) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon && <span className="text-brand-navy dark:text-neutral-300 mt-0.5" aria-hidden="true">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Switch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
        'duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        checked ? 'bg-semantic-success' : 'bg-neutral-300 dark:bg-neutral-600',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-fast',
        checked ? 'translate-x-5' : 'translate-x-0.5'].join(' ')} />
    </button>
  );
}

function StatPill({ label, value, tone = 'neutral' }) {
  const tones = {
    good: 'text-semantic-success', warn: 'text-semantic-warning', neutral: 'text-neutral-900 dark:text-neutral-100',
  };
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
      <p className="text-xs text-neutral-600 dark:text-neutral-400">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export function SecurityCenter({ workspaceId, can, onToast }) {
  const isAdmin = typeof can === 'function' ? can('manage_security') : false;
  const notify = useCallback((msg, type) => onToast?.(msg, type), [onToast]);

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [audit, setAudit] = useState([]);
  const [chain, setChain] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [pentests, setPentests] = useState([]);
  const [dataReqs, setDataReqs] = useState([]);
  const [passkeys, setPasskeys] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = useCallback((ref) => {
    if (!workspaceId) return;
    const live = () => !ref || ref.alive;
    Promise.all([
      securityClient.settings(workspaceId),
      securityClient.policies(workspaceId),
      securityClient.anomalies(workspaceId, 'OPEN'),
      securityClient.auditLog(workspaceId, { size: DEFAULT_PAGE_SIZE }),
      securityClient.verifyAuditLog(workspaceId),
      securityClient.evidence(workspaceId),
      securityClient.pentests(workspaceId),
      securityClient.dataRequests(workspaceId),
      securityClient.passkeys().catch(() => []),
    ])
      .then(([s, p, an, a, c, ev, pen, dr, pk]) => {
        if (!live()) return;
        setSettings(s || null);
        setPolicies(Array.isArray(p) ? p : []);
        setAnomalies(Array.isArray(an) ? an : []);
        setAudit(a?.items || []);
        setChain(c || null);
        setEvidence(Array.isArray(ev) ? ev : []);
        setPentests(Array.isArray(pen) ? pen : []);
        setDataReqs(Array.isArray(dr) ? dr : []);
        setPasskeys(Array.isArray(pk) ? pk : []);
        setError(null);
      })
      .catch((e) => { if (live()) setError(e.message || 'Could not load security settings.'); })
      .finally(() => { if (live()) setLoading(false); });
  }, [workspaceId]);

  useEffect(() => {
    const ref = { alive: true };
    load(ref);
    return () => { ref.alive = false; };
  }, [load]);

  const refresh = useCallback(() => { setLoading(true); setError(null); load(); }, [load]);

  const saveSettings = useCallback((patch) => {
    if (!isAdmin || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setBusy('settings');
    securityClient.saveSettings(workspaceId, next)
      .then((s) => { setSettings(s); notify('Security settings saved.', 'success'); })
      .catch((e) => { notify(e.message || 'Could not save settings.', 'error'); refresh(); })
      .finally(() => setBusy(null));
  }, [isAdmin, settings, workspaceId, notify, refresh]);

  const generateEvidence = useCallback((framework) => {
    setBusy(framework);
    securityClient.generateEvidence(workspaceId, framework)
      .then(() => securityClient.evidence(workspaceId))
      .then((ev) => { setEvidence(Array.isArray(ev) ? ev : []); notify('Evidence bundle generated.', 'success'); })
      .catch((e) => notify(e.message || 'Could not generate bundle.', 'error'))
      .finally(() => setBusy(null));
  }, [workspaceId, notify]);

  const resolveAnomaly = useCallback((id, dismiss) => {
    setBusy(id);
    securityClient.resolveAnomaly(workspaceId, id, dismiss)
      .then(() => setAnomalies((list) => list.filter((a) => a.id !== id)))
      .catch((e) => notify(e.message || 'Could not update anomaly.', 'error'))
      .finally(() => setBusy(null));
  }, [workspaceId, notify]);

  const addPasskey = useCallback(() => {
    if (!passkeysSupported()) { notify('This browser does not support passkeys.', 'error'); return; }
    setBusy('passkey');
    registerPasskey({
      begin: () => securityClient.beginRegisterPasskey(),
      finish: (body) => securityClient.finishRegisterPasskey(body),
      label: `Passkey · ${new Date().toLocaleDateString()}`,
      workspaceId,
    })
      .then(() => securityClient.passkeys())
      .then((pk) => { setPasskeys(Array.isArray(pk) ? pk : []); notify('Passkey registered on this device.', 'success'); })
      .catch((e) => notify(e.message || 'Could not register passkey.', 'error'))
      .finally(() => setBusy(null));
  }, [workspaceId, notify]);

  const removePasskey = useCallback((id) => {
    setBusy(id);
    securityClient.deletePasskey(id)
      .then(() => setPasskeys((list) => list.filter((p) => p.id !== id)))
      .catch((e) => notify(e.message || 'Could not remove passkey.', 'error'))
      .finally(() => setBusy(null));
  }, [notify]);

  const exportAudit = useCallback(() => {
    securityClient.exportAuditLog(workspaceId)
      .then((rows) => {
        exportRowsToCsv('security-audit-log', (rows || []).map((r) => ({
          seq: r.seq, occurredAt: r.occurredAt, actor: r.actorId, action: r.action,
          target: `${r.targetType || ''}:${r.targetId || ''}`, detail: r.detail || '', hash: r.entryHash,
        })));
        notify('Audit log exported.', 'success');
      })
      .catch((e) => notify(e.message || 'Could not export.', 'error'));
  }, [workspaceId, notify]);

  if (loading) {
    return (
      <PageLayout header={null} className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </PageLayout>
    );
  }
  if (error) {
    return (
      <PageLayout header={null}>
        <EmptyState
          icon={AlertTriangle} title="Couldn’t load the Security Center" subtitle={error}
          action={(
            <Button variant="secondary" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />Try again
            </Button>
          )}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={null}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />Security Center
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
            Enterprise security &amp; compliance — SOC 2 Type 2 / ISO 27001 ready.
          </p>
        </div>
        <Button variant="ghost" onClick={refresh} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {!isAdmin && (
        <div className="mb-4 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          You have read access. Changes require the <span className="font-medium">manage_security</span> permission.
        </div>
      )}

      <div role="tablist" aria-label="Security sections" className="flex flex-wrap gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id} role="tab" type="button" aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded-t',
              tab === id
                ? 'border-brand-navy text-brand-navy dark:text-white dark:border-white'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card title="Security posture" subtitle="Live snapshot across the controls" icon={<ShieldCheck className="h-5 w-5" />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatPill label="Data residency" value={settings?.dataResidencyRegion || 'IN'} />
              <StatPill label="Encryption at rest" value={settings?.encryptionAlgorithm || 'AES-256-GCM'} tone="good" />
              <StatPill label="Customer keys (BYOK)" value={settings?.byokEnabled ? settings.byokProvider : 'Platform'} tone={settings?.byokEnabled ? 'good' : 'neutral'} />
              <StatPill label="Anomaly detection" value={settings?.anomalyDetectionEnabled ? 'On' : 'Off'} tone={settings?.anomalyDetectionEnabled ? 'good' : 'warn'} />
              <StatPill label="Audit trail" value={chain?.intact ? `Verified · ${chain.verifiedCount}` : 'Check failed'} tone={chain?.intact ? 'good' : 'warn'} />
              <StatPill label="Open anomalies" value={anomalies.length} tone={anomalies.length ? 'warn' : 'good'} />
              <StatPill label="Passkeys (you)" value={passkeys.length} />
              <StatPill label="Conditional policies" value={policies.length} />
            </div>
          </Card>

          <Card
            title="Compliance evidence" icon={<FileCheck2 className="h-5 w-5" />}
            subtitle="One-click SOC 2 Type 2 / ISO 27001 evidence bundle — send under NDA"
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={() => generateEvidence('SOC2_TYPE2')} disabled={!isAdmin || busy === 'SOC2_TYPE2'}>
                Generate SOC 2 Type 2
              </Button>
              <Button variant="secondary" onClick={() => generateEvidence('ISO_27001')} disabled={!isAdmin || busy === 'ISO_27001'}>
                Generate ISO 27001
              </Button>
            </div>
            {evidence.length === 0
              ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No bundles generated yet.</p>
              : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {evidence.map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {b.framework === 'SOC2_TYPE2' ? 'SOC 2 Type 2' : 'ISO 27001'}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {new Date(b.generatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-semantic-success/10 text-semantic-success">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card
          title="Tamper-evident audit log" icon={<ScrollText className="h-5 w-5" />}
          subtitle="Append-only, cryptographically chained — every entry verifies against the previous"
          action={(
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${chain?.intact ? 'bg-semantic-success/10 text-semantic-success' : 'bg-semantic-danger/10 text-semantic-danger'}`}>
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {chain?.intact ? `Chain verified (${chain.verifiedCount})` : 'Chain broken'}
              </span>
              <Button variant="secondary" onClick={exportAudit}>
                <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />Export
              </Button>
            </div>
          )}
        >
          {audit.length === 0
            ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No audit entries yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">When</th>
                      <th className="py-2 pr-3 font-medium">Actor</th>
                      <th className="py-2 pr-3 font-medium">Action</th>
                      <th className="py-2 pr-3 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((e) => (
                      <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-2 pr-3 font-mono text-xs text-neutral-500">{e.seq}</td>
                        <td className="py-2 pr-3 whitespace-nowrap text-neutral-700 dark:text-neutral-300">{new Date(e.occurredAt).toLocaleString()}</td>
                        <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">{e.actorId}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-xs">{e.action}</span></td>
                        <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-400">{e.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {tab === 'access' && (
        <Card title="Conditional access policies" icon={<Lock className="h-5 w-5" />}
          subtitle="IP allow-list, geo, device trust and time-of-day — per workspace and per role">
          {policies.length === 0
            ? <EmptyState icon={Lock} title="No policies yet" subtitle="Restrict access by network, location, device or hours." />
            : (
              <ul className="space-y-2">
                {policies.map((p) => (
                  <li key={p.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.enabled ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {p.appliesToRole ? `Role: ${p.appliesToRole}` : 'All roles'}
                      {p.ipAllowlist ? ` · IPs: ${p.ipAllowlist}` : ''}
                      {p.geoAllowlist ? ` · Geo: ${p.geoAllowlist}` : ''}
                      {p.requireDeviceTrust ? ' · Trusted device required' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
            Policies are most-restrictive-wins and enforced server-side at sign-in.
          </p>
        </Card>
      )}

      {tab === 'anomalies' && (
        <Card title="Access anomalies" icon={<Activity className="h-5 w-5" />}
          subtitle="New geography, mass export, privilege escalation, impossible travel">
          {anomalies.length === 0
            ? <EmptyState icon={CheckCircle2} title="No open anomalies" subtitle="Unusual access patterns will appear here for review." />
            : (
              <ul className="space-y-2">
                {anomalies.map((a) => (
                  <li key={a.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.LOW}`}>{a.severity}</span>
                          <span className="font-mono text-xs text-neutral-500">{a.type}</span>
                        </div>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 mt-1">{a.summary}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{a.subjectUserId} · {new Date(a.detectedAt).toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="secondary" onClick={() => resolveAnomaly(a.id, false)} disabled={busy === a.id}>Resolve</Button>
                          <Button variant="ghost" onClick={() => resolveAnomaly(a.id, true)} disabled={busy === a.id}>Dismiss</Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      )}

      {tab === 'data' && (
        <div className="space-y-4">
          <Card title="Data residency &amp; encryption" icon={<MapPin className="h-5 w-5" />}
            subtitle="Where this workspace's data lives, and the keys that protect it">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Residency region</span>
                <select
                  value={settings?.dataResidencyRegion || 'IN'} disabled={!isAdmin || busy === 'settings'}
                  onChange={(e) => saveSettings({ dataResidencyRegion: e.target.value })}
                  className="mt-1 block w-full max-w-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-50"
                >
                  {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Customer-managed keys (BYOK)</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {settings?.byokEnabled ? `${settings.byokProvider} · ${settings.byokKeyRef}` : 'Using platform-managed keys'}
                  </p>
                </div>
                <Switch
                  checked={settings?.byokEnabled} disabled={!isAdmin || busy === 'settings'}
                  label="Toggle customer-managed keys"
                  onChange={(v) => saveSettings({
                    byokEnabled: v,
                    byokProvider: v ? (settings?.byokProvider || 'AWS_KMS') : null,
                    byokKeyRef: v ? (settings?.byokKeyRef || 'arn:aws:kms:ap-south-1:000000000000:key/replace-me') : null,
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">AI anomaly detection</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Flag unusual access patterns for review</p>
                </div>
                <Switch
                  checked={settings?.anomalyDetectionEnabled} disabled={!isAdmin || busy === 'settings'}
                  label="Toggle anomaly detection"
                  onChange={(v) => saveSettings({ anomalyDetectionEnabled: v })}
                />
              </div>
            </div>
          </Card>

          <Card title="Data subject requests (GDPR / DPDP)" icon={<ScrollText className="h-5 w-5" />}
            subtitle="Right to access (export) and right to be forgotten (crypto-shred erasure)">
            {dataReqs.length === 0
              ? <p className="text-sm text-neutral-600 dark:text-neutral-400">No requests yet. Use the member list to export or erase a subject’s data.</p>
              : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {dataReqs.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {r.type === 'EXPORT' ? 'Data export' : 'Erasure'} · {r.subjectUserId}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(r.requestedAt).toLocaleString()}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">{r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      )}

      {tab === 'assurance' && (
        <Card title="Penetration-test register" icon={<FileCheck2 className="h-5 w-5" />}
          subtitle="Third-party pen tests, red-team and bug-bounty engagements (reports held under NDA)">
          {pentests.length === 0
            ? <EmptyState icon={FileCheck2} title="No engagements recorded" subtitle="Track pen tests and bug-bounty programs here." />
            : (
              <ul className="space-y-2">
                {pentests.map((p) => (
                  <li key={p.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.vendor}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">{p.status}</span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {p.engagementType} · {p.scope || 'scope n/a'}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-semantic-danger">Critical {p.findingsCritical}</span>
                      <span className="text-semantic-warning">High {p.findingsHigh}</span>
                      <span className="text-neutral-600 dark:text-neutral-400">Medium {p.findingsMedium}</span>
                      <span className="text-neutral-500">Low {p.findingsLow}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      )}

      {tab === 'passkeys' && (
        <Card title="Your passkeys" icon={<Fingerprint className="h-5 w-5" />}
          subtitle="Phishing-resistant, passwordless sign-in bound to this device"
          action={(
            <Button onClick={addPasskey} disabled={busy === 'passkey'}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />Add passkey
            </Button>
          )}
        >
          {passkeys.length === 0
            ? <EmptyState icon={KeyRound} title="No passkeys yet" subtitle="Add a passkey to sign in without a password." />
            : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {passkeys.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="h-4 w-4 text-brand-navy dark:text-neutral-300" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.label}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {p.algorithm} · added {p.createdAt && p.createdAt !== 'null' ? new Date(p.createdAt).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => removePasskey(p.id)} disabled={busy === p.id} aria-label={`Remove ${p.label}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 flex items-center gap-1">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            The private key never leaves this device; the server stores only the public key.
          </p>
        </Card>
      )}
    </PageLayout>
  );
}
