import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';

export function MyDayTab({ myDay, standupDraft, setStandupDraft, submitMyStandup, selectTab }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">My standup — today</h3>
        {!myDay?.todayStandup ? (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">No standup session today yet. When one is started, record your update here — before the meeting if you like.</p>
        ) : !myDay.myStandupEntry ? (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">You're not on today's standup roster. Ask your scrum master to add you.</p>
        ) : myDay.myStandupEntry.status === 'RECORDED' ? (
          <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
            <p className="text-semantic-success font-semibold">Recorded ✓</p>
            <p><span className="font-semibold">Yesterday:</span> {myDay.myStandupEntry.yesterday || '—'}</p>
            <p><span className="font-semibold">Today:</span> {myDay.myStandupEntry.today || '—'}</p>
            {myDay.myStandupEntry.blockers && <p className="text-semantic-danger"><span className="font-semibold">Blockers:</span> {myDay.myStandupEntry.blockers}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Yesterday"><input className="input w-full text-xs" value={standupDraft.yesterday} onChange={e => setStandupDraft({ ...standupDraft, yesterday: e.target.value })} /></Field>
            <Field label="Today"><input className="input w-full text-xs" value={standupDraft.today} onChange={e => setStandupDraft({ ...standupDraft, today: e.target.value })} /></Field>
            <Field label="Blockers (optional)"><input className="input w-full text-xs" value={standupDraft.blockers} onChange={e => setStandupDraft({ ...standupDraft, blockers: e.target.value })} /></Field>
            <Button variant="action" fullWidth onClick={submitMyStandup}>Record my update</Button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">My items ({(myDay?.myItems || []).length})</h3>
        {(myDay?.myItems || []).length === 0
          ? <p className="text-xs text-neutral-600 dark:text-neutral-400">Nothing assigned to you in this project yet.</p>
          : <div className="space-y-1.5">
              {(myDay.myItems || []).map(i => (
                <div key={i.id} className="flex items-center gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                  {i.staleDays >= 3 && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-semantic-warning text-white" title={`No status change in ${i.staleDays} days`}>{i.staleDays}d stale</span>}
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.status}</span>
                  {i.storyPoints != null && <span className="text-xs font-mono text-brand-navy dark:text-neutral-200">{i.storyPoints} pts</span>}
                </div>
              ))}
            </div>}
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">My impediments ({(myDay?.myImpediments || []).length})</h3>
          <Button variant="secondary" onClick={() => selectTab('impediments')}>Raise impediment</Button>
        </div>
        {(myDay?.myImpediments || []).length === 0
          ? <p className="text-xs text-neutral-600 dark:text-neutral-400">No open impediments raised by or assigned to you. Blocked on something? Raise it so it gets an owner and an age.</p>
          : <div className="space-y-1.5">
              {(myDay.myImpediments || []).map(imp => (
                <div key={imp.id} className="flex items-center gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{imp.title}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.severity === 'CRITICAL' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{imp.severity}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{imp.status}</span>
                </div>
              ))}
            </div>}
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">My action items ({(myDay?.myActions || []).length})</h3>
        {(myDay?.myActions || []).length === 0
          ? <p className="text-xs text-neutral-600 dark:text-neutral-400">No open actions from retros or meetings are assigned to you.</p>
          : <div className="space-y-1.5">
              {(myDay.myActions || []).map(a => (
                <div key={a.id} className="flex items-center gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{a.title}</span>
                  {a.dueDate && <span className="text-xs text-neutral-600 dark:text-neutral-400">due {new Date(a.dueDate).toLocaleDateString()}</span>}
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{a.status}</span>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}
