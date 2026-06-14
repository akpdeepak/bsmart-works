import { ArrowLeft, RefreshCw, ChevronUp, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Field } from '@/components/works/field';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { api } from '@/lib/apiClient';
import { useI18n } from '@/lib/i18n';
import { RETRO_COLUMNS } from './_shared';

export function RetroTab({
  activeRetro, retros, openRetro, newRetro, setNewRetro, createRetro, setActiveRetro, clusterRetro,
  retroClusters, retroNoteDraft, setRetroNoteDraft, addRetroNote, voteRetroNote, convertRetroNote,
}) {
  const { t } = useI18n();
  return (
    <div>
      {!activeRetro ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-2">
            {retros.length === 0
              ? <EmptyState icon={RefreshCw} title="No retros yet" subtitle="Pick a template, gather the team, and turn outcomes into tracked action items." />
              : retros.map(r => (
                <button key={r.id} onClick={() => openRetro(r.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.title}</span>
                  <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">{r.template}</span>
                  <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${r.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{r.status}</span>
                </button>))}
          </div>
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
            <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">New retro</h3>
            <div className="space-y-3">
              <Field label="Title"><input className="input w-full text-sm" value={newRetro.title} onChange={e => setNewRetro({ ...newRetro, title: e.target.value })} /></Field>
              <Field label="Template">
                <select className="input w-full text-sm" value={newRetro.template} onChange={e => setNewRetro({ ...newRetro, template: e.target.value })}>
                  <option value="START_STOP_CONTINUE">Start / Stop / Continue</option>
                  <option value="FOUR_LS">4 Ls (Liked/Learned/Lacked/Longed for)</option>
                  <option value="MAD_SAD_GLAD">Mad / Sad / Glad</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" checked={newRetro.anonymous} onChange={e => setNewRetro({ ...newRetro, anonymous: e.target.checked })} /> Anonymous
              </label>
              <Button variant="action" fullWidth onClick={createRetro}>Create retro</Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setActiveRetro(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All retros</button>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{activeRetro.session.title}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={clusterRetro}>✦ Cluster themes</Button>
              {activeRetro.session.status !== 'COMPLETED' && <Button variant="secondary" onClick={() => { api.send(`/retros/${activeRetro.session.id}/complete`, { method: 'POST' }).then(() => openRetro(activeRetro.session.id)); }}>Complete</Button>}
            </div>
          </div>
          {retroClusters && (retroClusters.themes || []).length > 0 && (
            <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-brand-navy dark:text-neutral-200" aria-hidden="true" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Themes</h4>
              </div>
              {retroClusters.narrative && retroClusters.meta?.fallback === false && (
                <p className="text-sm text-neutral-700 dark:text-neutral-200 mb-2">{retroClusters.narrative}</p>
              )}
              <div className="space-y-1.5">
                {(retroClusters.themes || []).map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex-1 truncate">{t.theme}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t.noteCount} notes</span>
                    <span className="text-xs font-mono text-brand-navy dark:text-neutral-200">{t.votes} votes</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RETRO_COLUMNS[activeRetro.session.template].map(col => (
              <div key={col.key} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
                <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">{t(`deliver.cockpit.retro.${col.key}`)}</h4>
                <div className="space-y-2 mb-2">
                  {activeRetro.notes.filter(n => n.columnKey === col.key).map(n => (
                    <div key={n.id} className="bg-neutral-50 dark:bg-neutral-700 rounded-md p-2">
                      <p className="text-xs text-neutral-800 dark:text-neutral-100">{n.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => voteRetroNote(n.id)} className="text-xs text-brand-navy hover:underline" aria-label="Upvote"><ChevronUp className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> {n.votes}</button>
                        {!n.convertedActionItemId && <button onClick={() => convertRetroNote(n.id)} className="text-xs text-semantic-success hover:underline" aria-label="Convert to action item"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />Action</button>}
                        {n.convertedActionItemId && <span className="text-xs text-neutral-600 dark:text-neutral-400"><Check className="inline-block h-3 w-3 align-text-bottom" aria-hidden="true" /> action</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {activeRetro.session.status !== 'COMPLETED' && (
                  <div className="flex gap-1">
                    <input className="input flex-1 text-xs" placeholder="Add…" value={retroNoteDraft[col.key] || ''} onChange={e => setRetroNoteDraft({ ...retroNoteDraft, [col.key]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addRetroNote(col.key); }} />
                    <button onClick={() => addRetroNote(col.key)} className="px-2 rounded-md bg-brand-navy text-white text-sm">+</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
