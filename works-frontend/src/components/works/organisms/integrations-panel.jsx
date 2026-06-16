import { useEffect, useState } from 'react';
import { Plug, Webhook, KeyRound } from 'lucide-react';
import { integrationsClient } from '@/lib/integrations';
import { useDialog } from '@/lib/dialog';
import { Badge } from '@/components/works/atoms/badge';
import { Skeleton } from '@/components/works/atoms/skeleton';

// Organism — the iteration-13 Integrations surface (Cap Q / Cap A). Three tabs: connectors
// (Slack/GitHub/GitLab/email/calendar + SSO/SCIM), outbound webhooks, and public-API tokens.
// Tokens only, five interactive states, WCAG-AA. All HTTP via the integrations client (apiClient).

const TABS = [
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'tokens', label: 'API tokens', icon: KeyRound },
];

export function IntegrationsPanel({ workspaceId, can = () => true, onToast = () => {} }) {
  const { prompt } = useDialog();
  const [tab, setTab] = useState('connectors');
  const [providers, setProviders] = useState([]);
  const [connections, setConnections] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(Boolean(workspaceId));
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const manage = can('manage_integrations');
  const manageTokens = can('manage_api_tokens');
  const reload = () => setTick((t) => t + 1);

  // Arrow-key navigation across the tabs (WCAG tab pattern): Left/Right/Home/End move and select.
  function onTabKeyDown(e) {
    const idx = TABS.findIndex((t) => t.id === tab);
    if (idx < 0) return;
    const moves = {
      ArrowRight: (idx + 1) % TABS.length,
      ArrowLeft: (idx - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const nextId = TABS[moves[e.key]].id;
    setTab(nextId);
    const el = typeof document !== 'undefined' && document.getElementById(`integrations-tab-${nextId}`);
    if (el && typeof el.focus === 'function') el.focus();
  }

  // Fetch inlined with setState only in the .then continuation (never synchronously in the effect
  // body); handlers refresh via the tick dep — satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    Promise.all([
      integrationsClient.providers(workspaceId),
      integrationsClient.list(workspaceId),
      integrationsClient.webhooks(workspaceId),
      manageTokens ? integrationsClient.tokens(workspaceId) : Promise.resolve([]),
    ])
      .then(([prov, conns, hooks, tok]) => {
        if (!active) return;
        setProviders(prov);
        setConnections(conns);
        setWebhooks(hooks);
        setTokens(tok);
        setError(null);
      })
      .catch((e) => { if (active) setError(e.message || 'Could not load integrations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, manageTokens, tick]);

  function connectionFor(providerId) {
    return connections.find((c) => c.provider === providerId && c.status === 'CONNECTED');
  }

  async function connect(provider) {
    const fields = provider.requiredFields || [];
    const config = {};
    for (const f of fields) {
      const v = await prompt({ title: `Connect ${provider.label}`, label: f, placeholder: `Enter ${f}` });
      if (!v) return;
      config[f] = v;
    }
    try {
      await integrationsClient.connect(workspaceId, provider.id, provider.label, JSON.stringify(config));
      onToast(`${provider.label} connected.`, 'success');
      reload();
    } catch (e) {
      onToast(e.message || 'Connect failed.', 'error');
    }
  }

  async function issueToken() {
    const name = await prompt({ title: 'New API token', label: 'Token name', placeholder: 'e.g. CI pipeline', confirmLabel: 'Issue token' });
    if (!name) return;
    try {
      const res = await integrationsClient.issueToken(workspaceId, name, ['read']);
      onToast(`Token issued: ${res.plaintext} (copy now — shown once)`, 'success');
      reload();
    } catch (e) {
      onToast(e.message || 'Could not issue token.', 'error');
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Integrations</h1>
        <p className="mt-0.5 text-sm text-neutral-600">Connect Works to the tools your teams already use.</p>
      </div>

      <div role="tablist" aria-label="Integration area"
        className="mb-4 inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              id={`integrations-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`integrations-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onKeyDown={onTabKeyDown}
              onClick={() => setTab(t.id)}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-1 active:translate-y-px',
                selected ? 'bg-brand-navy text-white' : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-semantic-danger-surface p-4 text-sm text-semantic-danger">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading integrations">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : tab === 'connectors' ? (
        <div id="integrations-panel-connectors" role="tabpanel" aria-labelledby="integrations-tab-connectors"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.length === 0 && (
            <p className="text-sm text-neutral-600">No connectors are available for this workspace yet.</p>
          )}
          {providers.map((p) => {
            const conn = connectionFor(p.id);
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.label}</p>
                  <p className="text-xs capitalize text-neutral-600">{p.category}</p>
                </div>
                {conn ? (
                  <Badge tone="success">Connected</Badge>
                ) : manage ? (
                  <button type="button" onClick={() => connect(p)}
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                    Connect
                  </button>
                ) : (
                  <Badge tone="neutral">Not connected</Badge>
                )}
              </div>
            );
          })}
        </div>
      ) : tab === 'webhooks' ? (
        <div id="integrations-panel-webhooks" role="tabpanel" aria-labelledby="integrations-tab-webhooks">
          {webhooks.length === 0 ? (
            <p className="text-sm text-neutral-600">No webhook subscriptions yet.</p>
          ) : (
            <ul className="space-y-2">
              {webhooks.map((w) => (
                <li key={w.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{w.targetUrl}</p>
                    <p className="text-xs text-neutral-600">event: {w.eventType}</p>
                  </div>
                  <Badge tone={w.active ? 'success' : 'neutral'}>{w.active ? 'Active' : 'Inactive'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div id="integrations-panel-tokens" role="tabpanel" aria-labelledby="integrations-tab-tokens">
          {manageTokens && (
            <button type="button" onClick={issueToken}
              className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2 active:translate-y-px">
              <KeyRound aria-hidden="true" className="h-4 w-4" />
              Issue token
            </button>
          )}
          {tokens.length === 0 ? (
            <p className="text-sm text-neutral-600">No API tokens yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</p>
                    <p className="font-mono text-xs text-neutral-600">{t.tokenPrefix}…</p>
                  </div>
                  <Badge tone={t.revoked ? 'danger' : 'success'}>{t.revoked ? 'Revoked' : 'Active'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
