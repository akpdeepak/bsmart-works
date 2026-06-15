import { useEffect, useState, useCallback } from 'react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Code2, Key, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { developerPortalClient } from '@/lib/marketplace';

// Developer Portal view (iteration 20, Cap R). Documentation, SDK manifest and a sandbox for
// third-party developers building Works extensions. Self-fetching: the SDK manifest loads in an
// effect; generating sandbox credentials is an explicit action. Loading / error states per RB-30 §6.
export default function DeveloperPortalView({ workspaceId }) {
  const [sdk, setSdk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sandbox, setSandbox] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setSdk(await developerPortalClient.sdk(workspaceId));
    } catch (e) {
      setError(e.message || 'Failed to load the developer portal.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  async function generateSandbox() {
    setGenerating(true);
    setError(null);
    try {
      setSandbox(await developerPortalClient.sandboxCredentials(workspaceId));
    } catch (e) {
      setError(e.message || 'Could not generate sandbox credentials.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageLayout
      title="Developer Portal"
      description="Everything you need to build a Works extension — the SDK, extension points, scopes and a sandbox."
      width="dashboard"
    >

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : sdk ? (
        <>
          <section aria-labelledby="sdk-heading" className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="h-5 w-5 text-brand-navy" aria-hidden="true" />
              <h2 id="sdk-heading" className="text-xl font-semibold text-neutral-900">SDK</h2>
              <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">v{sdk.sdkVersion}</span>
            </div>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Languages</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(sdk.languages || []).map((lang) => (
                <span key={lang} className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-900 rounded-sm px-2 py-1">{lang}</span>
              ))}
            </div>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Extension points</p>
            <ul className="space-y-2">
              {(sdk.extensionPoints || []).map((ep) => (
                <li key={ep.id} className="text-sm">
                  <span className="font-medium text-neutral-900">{ep.name}</span>
                  <span className="text-neutral-600 dark:text-neutral-400"> — {ep.description}</span>
                </li>
              ))}
            </ul>
          </section>

          {sdk.docs && sdk.docs.length > 0 && (
            <section aria-labelledby="docs-heading" className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4">
              <h2 id="docs-heading" className="text-xl font-semibold text-neutral-900 mb-3">Documentation</h2>
              <ul className="space-y-1">
                {sdk.docs.map((doc) => (
                  <li key={doc.url}>
                    <a href={doc.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-navy-tint hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded-sm">
                      {doc.title}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sdk.exampleManifest && (
            <section aria-labelledby="manifest-heading" className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4">
              <h2 id="manifest-heading" className="text-xl font-semibold text-neutral-900 mb-3">Example manifest</h2>
              <pre className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 text-xs font-mono text-neutral-900 dark:text-neutral-100 overflow-x-auto">
                {JSON.stringify(sdk.exampleManifest, null, 2)}
              </pre>
            </section>
          )}

          <section aria-labelledby="sandbox-heading" className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-5 w-5 text-brand-navy" aria-hidden="true" />
              <h2 id="sandbox-heading" className="text-xl font-semibold text-neutral-900">Sandbox</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Generate ephemeral credentials to test your extension against an isolated sandbox environment.
            </p>
            <Button variant="action" size="sm" onClick={generateSandbox} loading={generating}>
              Generate sandbox credentials
            </Button>
            {sandbox && (
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Sandbox token</p>
                  <code className="block bg-neutral-100 dark:bg-neutral-900 rounded-sm px-3 py-2 font-mono text-xs text-neutral-900 dark:text-neutral-100 break-all">
                    {sandbox.sandboxToken}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Base URL</p>
                  <code className="block bg-neutral-100 dark:bg-neutral-900 rounded-sm px-3 py-2 font-mono text-xs text-neutral-900 dark:text-neutral-100 break-all">
                    {sandbox.sandboxBaseUrl}
                  </code>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <Copy className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {sandbox.notice}
                </p>
              </div>
            )}
          </section>
        </>
      ) : !error ? (
        <EmptyState icon={Code2} title="Developer portal unavailable"
          subtitle="The SDK manifest could not be loaded for this workspace. Refresh the page, or contact a workspace admin if the problem persists." />
      ) : null}
    </PageLayout>
  );
}
