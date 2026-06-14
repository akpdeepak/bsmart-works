import { Construction } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { RAISE_LABELS } from './_shared';

export function ImpedimentsTab({
  impediments, newImpediment, setNewImpediment, createImpediment, updateImpediment, cockpitContext,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-2">
        {impediments.length === 0
          ? <EmptyState icon={Construction} title="No impediments" subtitle="Blockers raised here are tracked with owner, severity and age — not buried in chat." />
          : impediments.map(imp => (
            <div key={imp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.severity === 'CRITICAL' ? 'bg-semantic-danger text-white' : imp.severity === 'HIGH' ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{imp.severity}</span>
                    {imp.raiseType && imp.raiseType !== 'IMPEDIMENT' && <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-navy/10 text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">{RAISE_LABELS[imp.raiseType] || imp.raiseType}</span>}
                    {imp.slaBreached && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-semantic-danger text-white" title="Critical and unresolved for more than a day">SLA breach</span>}
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{imp.title}</span>
                  </div>
                  {imp.description && <p className="text-xs text-neutral-500 mb-1">{imp.description}</p>}
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{imp.category || 'Uncategorized'} · raised {imp.raisedAt ? new Date(imp.raisedAt).toLocaleDateString() : '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.status === 'RESOLVED' ? 'bg-semantic-success text-white' : imp.status === 'ESCALATED' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{imp.status}</span>
                  {imp.status !== 'RESOLVED' && (
                    <div className="flex gap-2">
                      {imp.status !== 'ESCALATED' && <button onClick={() => updateImpediment(imp, { status: 'ESCALATED', escalated: true })} className="text-xs text-semantic-danger hover:underline">Escalate</button>}
                      <button onClick={() => updateImpediment(imp, { status: 'RESOLVED' })} className="text-xs text-brand-navy hover:underline">Resolve</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">Raise</h3>
        <div className="space-y-3">
          <Field label="Type">
            <select className="input w-full text-sm" value={newImpediment.raiseType} onChange={e => setNewImpediment({ ...newImpediment, raiseType: e.target.value })}>
              {(cockpitContext?.allowedRaiseTypes || Object.keys(RAISE_LABELS)).map(t => <option key={t} value={t}>{RAISE_LABELS[t] || t}</option>)}
            </select>
          </Field>
          <Field label="Title"><input className="input w-full text-sm" value={newImpediment.title} onChange={e => setNewImpediment({ ...newImpediment, title: e.target.value })} placeholder="What is blocked?" /></Field>
          <Field label="Severity">
            <select className="input w-full text-sm" value={newImpediment.severity} onChange={e => setNewImpediment({ ...newImpediment, severity: e.target.value })}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Category"><input className="input w-full text-sm" value={newImpediment.category} onChange={e => setNewImpediment({ ...newImpediment, category: e.target.value })} placeholder="e.g. Environment, Dependency" /></Field>
          <Field label="Detail"><textarea className="input w-full text-sm" rows={2} value={newImpediment.description} onChange={e => setNewImpediment({ ...newImpediment, description: e.target.value })} /></Field>
          <Button variant="action" fullWidth onClick={createImpediment}>Raise</Button>
        </div>
      </div>
    </div>
  );
}
