import { Headset, Building2, Archive, Timer, Star } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Modal } from '@/components/works/molecules/modal';
import { PortalFormDesigner } from '@/components/PortalFormDesigner';

/**
 * ServiceView — service desk: queues, customers, request types, SLA tiers, CSAT.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function ServiceView({
  serviceTab,
  serviceQueue,
  serviceRequests,
  serviceCustomers,
  serviceTypes,
  serviceTiers,
  serviceCsat,
  newCustomer,
  formDesignerTypeId,
  can,
  setServiceTab,
  setServiceQueue,
  setNewCustomer,
  setFormDesignerTypeId,
  fetchServiceRequests,
  fetchServiceCustomers,
  fetchServiceTypes,
  fetchServiceTiers,
  fetchServiceCsat,
  assignServiceRequest,
  transitionServiceRequest,
  createServiceCustomer,
  showToast,
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-5 border-b border-neutral-200 dark:border-neutral-700">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Service Desk</h1>
          <p className="text-sm text-neutral-500">Customer requests, agent queues, SLAs and satisfaction — the external face of Works.</p>
        </div>
        <div className="flex gap-1">
          {[
            { key: 'queues', label: 'Queues', load: () => fetchServiceRequests(serviceQueue) },
            { key: 'customers', label: 'Customers', load: () => fetchServiceCustomers() },
            { key: 'types', label: 'Request types', load: () => fetchServiceTypes() },
            { key: 'slas', label: 'SLA tiers', load: () => fetchServiceTiers() },
            { key: 'csat', label: 'CSAT', load: () => fetchServiceCsat() },
          ].map(t => (
            <button key={t.key} onClick={() => { setServiceTab(t.key); t.load(); }}
              className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${serviceTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {serviceTab === 'queues' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['open', 'mine', 'unassigned', 'high'].map(q => (
                <button key={q} onClick={() => { setServiceQueue(q); fetchServiceRequests(q); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border ${serviceQueue === q ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'}`}>
                  {q === 'open' ? 'All open' : q === 'mine' ? 'Mine' : q === 'unassigned' ? 'Unassigned' : 'High priority'}
                </button>
              ))}
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              {serviceRequests.length === 0
                ? <EmptyState icon={Headset} title="Queue is clear" subtitle="No requests match this queue right now." />
                : serviceRequests.map(({ request: r, sla }) => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded w-16 text-center bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200">{r.priority}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{r.subject}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{r.typeKey} · {r.id}{r.assigneeId ? ` · ${r.assigneeId}` : ' · unassigned'}</p>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sla.breached ? 'bg-semantic-danger text-white' : sla.state === 'AT_RISK' ? 'bg-semantic-warning text-white' : sla.state === 'NONE' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200' : 'bg-semantic-success text-white'}`}>{sla.state === 'NONE' ? 'No SLA' : sla.state}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">{(r.status || '').replace('_', ' ')}</span>
                    {can('work_service') && (
                      <>
                        {!r.assigneeId && <button onClick={() => assignServiceRequest(r.id)} className="text-xs text-brand-navy hover:underline">Pick up</button>}
                        {r.status !== 'RESOLVED' && r.status !== 'CLOSED' && <button onClick={() => transitionServiceRequest(r.id, 'RESOLVED')} className="text-xs text-semantic-success hover:underline">Resolve</button>}
                        {r.status === 'RESOLVED' && <button onClick={() => transitionServiceRequest(r.id, 'CLOSED')} className="text-xs text-neutral-500 hover:underline">Close</button>}
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {serviceTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Customer accounts ({serviceCustomers.length})</h3>
              {can('manage_service') && <Button variant="action" onClick={() => setNewCustomer({ name: '', tier: 'SILVER', primaryColor: '', subdomain: '' })}>New customer</Button>}
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              {serviceCustomers.length === 0
                ? <EmptyState icon={Building2} title="No customers yet" subtitle="Add a customer organization to start serving them through the portal." />
                : serviceCustomers.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{c.name}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{c.subdomain ? `${c.subdomain} · ` : ''}{c.id}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-navy text-white">{c.tier}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 text-neutral-600'}`}>{c.active ? 'ACTIVE' : 'INACTIVE'}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {serviceTab === 'types' && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            {serviceTypes.length === 0
              ? <EmptyState icon={Archive} title="No request types" subtitle="Incident, Change and Service types power the portal forms." />
              : serviceTypes.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{t.name}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{t.typeKey} · default {t.defaultPriority}</p>
                  </div>
                  {t.isSystem && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200">SYSTEM</span>}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${t.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 text-neutral-600'}`}>{t.active ? 'ACTIVE' : 'INACTIVE'}</span>
                  {can('manage_service') && (
                    <Button variant="secondary" size="sm" onClick={() => setFormDesignerTypeId(t.id)}>
                      Design Form
                    </Button>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* B15 — Portal Form Designer slide-over (opened from the Request types tab) */}
        {formDesignerTypeId && (
          <div role="dialog" aria-label="Portal form designer" aria-modal="true"
            className="fixed inset-0 z-modal flex">
            <button type="button" aria-label="Close designer" onClick={() => setFormDesignerTypeId(null)}
              className="absolute inset-0 bg-neutral-900/40 focus-visible:outline-none" />
            <div className="relative ml-auto w-full max-w-5xl h-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col">
              <PortalFormDesigner
                requestTypeId={formDesignerTypeId}
                onClose={() => setFormDesignerTypeId(null)}
                onSaved={() => { showToast('Form saved'); fetchServiceTypes(); }}
              />
            </div>
          </div>
        )}

        {serviceTab === 'slas' && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            {serviceTiers.length === 0
              ? <EmptyState icon={Timer} title="No SLA tiers" subtitle="Define response and resolution targets per customer tier." />
              : serviceTiers.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded w-20 text-center bg-brand-navy text-white">{t.tier}</span>
                  <div className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                    Respond in {t.responseMinutes}m · Resolve in {t.resolutionMinutes}m
                  </div>
                </div>
              ))}
          </div>
        )}

        {serviceTab === 'csat' && (
          <div className="space-y-4">
            {!serviceCsat ? <EmptyState icon={Star} title="No CSAT yet" subtitle="Ratings appear here once customers rate resolved requests." />
              : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Responses', value: serviceCsat.summary?.count ?? 0 },
                      { label: 'Average', value: Number(serviceCsat.summary?.average ?? 0).toFixed(1) },
                      { label: '% Satisfied', value: `${serviceCsat.summary?.percentSatisfied ?? 0}%` },
                    ].map(c => (
                      <div key={c.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                        <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-semibold">{c.label}</p>
                        <p className="text-3xl font-bold mt-1 text-brand-navy">{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rating distribution */}
                  {serviceCsat.summary?.distribution && (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Rating distribution</h3>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = serviceCsat.summary.distribution[star] ?? 0;
                        const total = serviceCsat.summary.count || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={star} className="flex items-center gap-3 py-1">
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 w-12 shrink-0 flex items-center gap-0.5">
                              {star} <Star className="h-3 w-3 text-brand-orange fill-current" aria-hidden="true" />
                            </span>
                            <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-orange rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 w-12 text-right">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Recent feedback</h3>
                    {(serviceCsat.responses || []).length === 0
                      ? <p className="text-sm text-neutral-500">No comments yet.</p>
                      : serviceCsat.responses.slice(0, 10).map(r => (
                        <div key={r.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-brand-orange text-sm inline-flex items-center" aria-label={`Rated ${r.rating} of 5`}>{Array.from({ length: 5 }).map((_, si) => <Star key={si} className={`h-3.5 w-3.5 ${si < r.rating ? 'fill-current' : ''}`} aria-hidden="true" />)}</span>
                          <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200 truncate">{r.comment || '—'}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
          </div>
        )}
      </div>

      {newCustomer && (
        <Modal title="New customer" onClose={() => setNewCustomer(null)} size="lg">
            <div className="space-y-3">
              <div>
                <label htmlFor="cust-name" className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                <input id="cust-name" className="input w-full" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cust-tier" className="block text-xs font-medium text-neutral-500 mb-1">Tier</label>
                  <select id="cust-tier" className="input w-full" value={newCustomer.tier} onChange={e => setNewCustomer({ ...newCustomer, tier: e.target.value })}>
                    {['PLATINUM', 'GOLD', 'SILVER'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cust-subdomain" className="block text-xs font-medium text-neutral-500 mb-1">Subdomain</label>
                  <input id="cust-subdomain" className="input w-full" value={newCustomer.subdomain} onChange={e => setNewCustomer({ ...newCustomer, subdomain: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setNewCustomer(null)}>Cancel</Button>
              <Button variant="action" onClick={createServiceCustomer}>Create customer</Button>
            </div>
        </Modal>
      )}
    </div>
  );
}
