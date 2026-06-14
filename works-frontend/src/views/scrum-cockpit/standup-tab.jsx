import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { anyCapabilityEnabled } from '@/lib/ai';
import { devClient } from '@/lib/developer';

export function StandupTab({
  activeStandup, standups, canManage, startStandup, openStandup, setActiveStandup,
  advanceStandup, completeStandup, standupDraft, setStandupDraft, recordStandup,
  users, aiCapabilities, aiLoading, aiAction, activeWorkspaceId, showToast,
}) {
  return (
    <div>
      {!activeStandup ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standups</h3>
            {canManage && <Button variant="action" onClick={startStandup}>Start standup</Button>}
          </div>
          {standups.length === 0
            ? <EmptyState icon={MessageCircle} title="No standups yet" subtitle="Start a sequential, time-boxed standup — each member's turn is recorded." />
            : <div className="space-y-2">{standups.map(s => (
                <button key={s.id} onClick={() => openStandup(s.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : s.id}</span>
                  <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${s.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{s.status}</span>
                </button>))}</div>}
        </div>
      ) : (
        <div className="max-w-reading">
          <button onClick={() => setActiveStandup(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All standups</button>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standup — {activeStandup.session.status}</h3>
            {activeStandup.session.status !== 'COMPLETED' && (
              <div className="flex gap-2 flex-wrap">
                {canManage && <Button variant="secondary" onClick={advanceStandup}>Next member</Button>}
                {canManage && <Button variant="action" onClick={completeStandup}>Complete</Button>}
                {anyCapabilityEnabled(aiCapabilities) && (
                  <Button
                    variant="secondary"
                    disabled={!!aiLoading['standup-draft']}
                    onClick={() => aiAction(
                      'standup-draft',
                      () => devClient.standup(activeWorkspaceId),
                      res => {
                        const draft = res?.draft || '';
                        if (draft) { setStandupDraft(d => ({ ...d, today: draft })); showToast('AI drafted standup update', 'info'); }
                        if (res?.meta?.fallback) showToast('AI standup draft used fallback.', 'info');
                      },
                      'Enable AI to draft standup updates',
                    )}
                  >
                    {aiLoading['standup-draft'] ? 'Drafting…' : '✦ Draft standup'}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {activeStandup.entries.map(e => {
              const isCurrent = e.memberId === activeStandup.session.currentMemberId;
              const name = (users.find(u => u.id === e.memberId) || {}).fullName || e.memberId;
              return (
                <div key={e.id} className={`rounded-xl p-3 border ${isCurrent ? 'border-brand-navy bg-brand-navy/5' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.status === 'RECORDED' ? 'bg-semantic-success text-white' : e.status === 'MISSING' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{e.status}</span>
                  </div>
                  {e.status === 'RECORDED' && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 space-y-0.5">
                      <p><span className="font-semibold">Yesterday:</span> {e.yesterday || '—'}</p>
                      <p><span className="font-semibold">Today:</span> {e.today || '—'}</p>
                      {e.blockers && <p className="text-semantic-danger"><span className="font-semibold">Blockers:</span> {e.blockers}</p>}
                    </div>
                  )}
                  {canManage && isCurrent && e.status !== 'RECORDED' && activeStandup.session.status !== 'COMPLETED' && (
                    <div className="mt-2 space-y-2">
                      <input className="input w-full text-xs" placeholder="Yesterday" value={standupDraft.yesterday} onChange={ev => setStandupDraft({ ...standupDraft, yesterday: ev.target.value })} />
                      <input className="input w-full text-xs" placeholder="Today" value={standupDraft.today} onChange={ev => setStandupDraft({ ...standupDraft, today: ev.target.value })} />
                      <input className="input w-full text-xs" placeholder="Blockers (optional)" value={standupDraft.blockers} onChange={ev => setStandupDraft({ ...standupDraft, blockers: ev.target.value })} />
                      <Button variant="action" onClick={() => recordStandup(e.id)}>Record & next</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
