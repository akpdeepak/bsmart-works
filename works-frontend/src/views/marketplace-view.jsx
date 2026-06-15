import { useEffect, useState, useCallback, useRef } from 'react';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Package, Plug, Check, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { marketplaceClient, parseScopes } from '@/lib/marketplace';

// App Marketplace view (iteration 20, Cap R). Browse the global catalog, install extensions with an
// explicit scope-approval step (permission scoping — granted ⊆ requested), and manage installed
// extensions (enable/disable, uninstall). Self-fetching: the catalog and installs are loaded in an
// effect, keyed by workspaceId. Loading / empty / error states per RB-30 §6; keyboard operable.
export default function MarketplaceView({ workspaceId }) {
  const [listings, setListings] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null); // listing being installed (scope-approval open)
  const [approvedScopes, setApprovedScopes] = useState([]);
  const dialogCloseRef = useRef(null);

  const closeDialog = useCallback(() => { setPending(null); setApprovedScopes([]); }, []);

  // Move focus into the scope-approval dialog when it opens and close it on Escape (keyboard
  // operability + focus management, RB-30 §6).
  useEffect(() => {
    if (!pending) return undefined;
    if (dialogCloseRef.current && typeof dialogCloseRef.current.focus === 'function') {
      dialogCloseRef.current.focus();
    }
    const onKey = (e) => { if (e.key === 'Escape') closeDialog(); };
    if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
    return () => { if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey); };
  }, [pending, closeDialog]);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [cat, inst] = await Promise.all([
        marketplaceClient.listings(workspaceId),
        marketplaceClient.installed(workspaceId),
      ]);
      setListings(Array.isArray(cat) ? cat : []);
      setInstalled(Array.isArray(inst) ? inst : []);
    } catch (e) {
      setError(e.message || 'Failed to load the marketplace.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const installedListingIds = new Set(installed.map((i) => i.listingId));

  function beginInstall(listing) {
    const scopes = parseScopes(listing.requestedScopes);
    setPending(listing);
    setApprovedScopes(scopes); // default: approve all requested scopes
  }

  function toggleScope(scope) {
    setApprovedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  }

  async function confirmInstall() {
    if (!pending) return;
    try {
      await marketplaceClient.install(workspaceId, {
        listingId: pending.id,
        grantedScopes: approvedScopes,
      });
      closeDialog();
      await load();
    } catch (e) {
      setError(e.message || 'Install failed.');
    }
  }

  async function toggleEnabled(ext) {
    try {
      await marketplaceClient.setEnabled(workspaceId, ext.id, !ext.enabled);
      await load();
    } catch (e) {
      setError(e.message || 'Could not update the extension.');
    }
  }

  async function uninstall(ext) {
    try {
      await marketplaceClient.uninstall(workspaceId, ext.id);
      await load();
    } catch (e) {
      setError(e.message || 'Uninstall failed.');
    }
  }

  return (
    <PageLayout
      title="App Marketplace"
      description="Install third-party extensions into your workspace. You approve exactly which permissions each extension may use."
      width="dashboard"
    >

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Installed section */}
          <section aria-labelledby="installed-heading" className="mb-8">
            <h2 id="installed-heading" className="text-xl font-semibold text-neutral-900 mb-3">Installed</h2>
            {installed.length === 0 ? (
              <EmptyState icon={Plug} title="No extensions installed"
                subtitle="Install an extension from the catalog below to extend your workspace." />
            ) : (
              <div className="space-y-2">
                {installed.map((ext) => {
                  const listing = listings.find((l) => l.id === ext.listingId);
                  return (
                    <div key={ext.id}
                      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 flex items-center gap-4">
                      <Package className="h-5 w-5 text-brand-navy flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{listing ? listing.name : ext.listingId}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                          Scopes: {ext.grantedScopes || 'none'}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${ext.enabled ? 'text-semantic-success bg-semantic-success/10' : 'text-neutral-600 bg-neutral-100 dark:bg-neutral-700'}`}>
                        {ext.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => toggleEnabled(ext)}>
                        {ext.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => uninstall(ext)}
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        aria-label={`Uninstall ${listing ? listing.name : ext.listingId}`}>
                        Uninstall
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Catalog section */}
          <section aria-labelledby="catalog-heading">
            <h2 id="catalog-heading" className="text-xl font-semibold text-neutral-900 mb-3">Catalog</h2>
            {listings.length === 0 ? (
              <EmptyState icon={Package} title="No extensions available"
                subtitle="The marketplace catalog is empty right now. Check back soon." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((l) => {
                  const isInstalled = installedListingIds.has(l.id);
                  return (
                    <div key={l.id}
                      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-brand-navy" aria-hidden="true" />
                        <h3 className="text-base font-semibold text-neutral-900 truncate">{l.name}</h3>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-1 mb-3">{l.summary}</p>
                      <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                        <span>{l.publisher}</span>
                        {l.version && <span className="font-mono">v{l.version}</span>}
                      </div>
                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-semantic-success">
                          <Check className="h-4 w-4" aria-hidden="true" /> Installed
                        </span>
                      ) : (
                        <Button variant="action" size="sm" onClick={() => beginInstall(l)}>
                          Install
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Scope-approval dialog */}
      {pending && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-brand-navy/40 p-4"
          role="dialog" aria-modal="true" aria-labelledby="scope-dialog-title">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 w-full max-w-md">
            <h2 id="scope-dialog-title" className="text-xl font-semibold text-neutral-900 mb-1">
              Install {pending.name}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Approve the permissions this extension may use. Only the scopes you approve will be granted.
            </p>
            <fieldset className="space-y-2 mb-5">
              <legend className="sr-only">Requested permissions</legend>
              {parseScopes(pending.requestedScopes).map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-neutral-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approvedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded-sm border-neutral-400 text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              ))}
              {parseScopes(pending.requestedScopes).length === 0 && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">This extension requests no permissions.</p>
              )}
            </fieldset>
            <div className="flex items-center justify-end gap-2">
              <Button ref={dialogCloseRef} variant="secondary" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button variant="action" size="sm" onClick={confirmInstall}>
                Install with {approvedScopes.length} scope{approvedScopes.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
