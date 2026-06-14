import { ArrowLeft, CalendarCheck, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CEREMONY_LABELS, ATTENDANCE_GROUPS } from './_shared';

export function CeremoniesTab({
  ceremonies, activeCeremony, canManage, newCeremony, setNewCeremony, scheduleCeremony,
  openCeremony, setActiveCeremony, startCeremony, joinCeremony, completeCeremony, excuseCeremony,
  users, currentUserId,
}) {
  return (
    <div>
      {!activeCeremony ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-2">
            {(ceremonies || []).length === 0
              ? <EmptyState icon={CalendarCheck} title="No ceremonies yet" subtitle="Schedule a standup, planning, review, retro or refinement — attendance is tracked per member." />
              : ceremonies.map(c => (
                <button key={c.session.id} onClick={() => openCeremony(c.session.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{CEREMONY_LABELS[c.session.ceremonyType] || c.session.ceremonyType}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.session.status === 'COMPLETED' ? 'bg-semantic-success text-white' : c.session.status === 'LIVE' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{c.session.status}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {c.session.scheduledAt ? new Date(c.session.scheduledAt).toLocaleString() : 'Unscheduled'}
                    {' · '}{c.counts?.joined ?? 0} joined{(c.counts?.absent ?? 0) > 0 ? ` · ${c.counts.absent} absent` : ''}
                  </p>
                </button>))}
          </div>
          {canManage && (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">Schedule ceremony</h3>
              <div className="space-y-3">
                <Field label="Type">
                  <select className="input w-full text-sm" value={newCeremony.ceremonyType} onChange={e => setNewCeremony({ ...newCeremony, ceremonyType: e.target.value })}>
                    {Object.entries(CEREMONY_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </Field>
                <Field label="When"><input type="datetime-local" className="input w-full text-sm" value={newCeremony.scheduledAt} onChange={e => setNewCeremony({ ...newCeremony, scheduledAt: e.target.value })} /></Field>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">All workspace members are expected; attendance is recorded when they join.</p>
                <Button variant="action" fullWidth onClick={scheduleCeremony}>Schedule</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-reading">
          <button onClick={() => setActiveCeremony(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All ceremonies</button>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{CEREMONY_LABELS[activeCeremony.session.ceremonyType] || activeCeremony.session.ceremonyType} — {activeCeremony.session.status}</h3>
            <div className="flex gap-2 flex-wrap">
              {canManage && activeCeremony.session.status === 'SCHEDULED' && <Button variant="action" onClick={() => startCeremony(activeCeremony.session.id)}>Start</Button>}
              {activeCeremony.session.status === 'LIVE' && <Button variant="action" onClick={() => joinCeremony(activeCeremony.session.id)}>Join</Button>}
              {canManage && activeCeremony.session.status === 'LIVE' && <Button variant="secondary" onClick={() => completeCeremony(activeCeremony.session.id)}>Complete</Button>}
            </div>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
            {activeCeremony.session.scheduledAt ? `Scheduled ${new Date(activeCeremony.session.scheduledAt).toLocaleString()}` : 'Unscheduled'}
            {activeCeremony.session.startedAt ? ` · started ${new Date(activeCeremony.session.startedAt).toLocaleTimeString()}` : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ATTENDANCE_GROUPS.map(group => {
              const rows = (activeCeremony.attendance || []).filter(a => a.status === group.status);
              if (group.status === 'ABSENT' && rows.length === 0) return null;
              return (
                <div key={group.status} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {group.status === 'JOINED'
                      ? <UserCheck className="h-4 w-4 text-semantic-success" aria-hidden="true" />
                      : group.status === 'ABSENT'
                        ? <UserX className="h-4 w-4 text-semantic-danger" aria-hidden="true" />
                        : <UserX className="h-4 w-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />}
                    <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{group.label}</h4>
                    <span className="text-sm font-bold text-brand-navy dark:text-white ml-auto">{rows.length}</span>
                  </div>
                  <div className="space-y-1">
                    {rows.map(a => {
                      const name = (users.find(u => u.id === a.userId) || {}).fullName || a.userId;
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-2 py-0.5">
                          <span className={`text-xs truncate ${a.userId === currentUserId ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-200'}`}>{name}{a.userId === currentUserId ? ' (you)' : ''}</span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            {a.status === 'JOINED' && a.joinedAt && <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(a.joinedAt).toLocaleTimeString()}</span>}
                            {canManage && a.status === 'EXPECTED' && activeCeremony.session.status !== 'COMPLETED' && (
                              <button onClick={() => excuseCeremony(activeCeremony.session.id, a.userId)} className="text-xs text-brand-navy hover:underline">Mark excused</button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {rows.length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">{group.status === 'EXPECTED' ? 'Everyone has responded.' : 'None.'}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
