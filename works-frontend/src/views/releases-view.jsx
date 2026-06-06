import { Rocket } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';

// Releases view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-preserving:
// the parent owns release data + mutations; this renders the two-pane list/detail. A11y nudge
// (finding D3): the previously placeholder-only search box and project filter now carry aria-labels.
export default function ReleasesView({
  releases,
  releaseSearch,
  selectedRelease,
  releaseItems,
  projects,
  workItems,
  setIsReleaseOpen,
  setReleaseSearch,
  setSelectedRelease,
  setSelectedItem,
  fetchReleases,
  fetchReleaseItems,
  updateRelease,
  deleteRelease,
  removeItemFromRelease,
  addItemToRelease,
  onPressKey,
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Releases</h2>
            <button onClick={() => setIsReleaseOpen(true)} aria-label="New release" className="w-6 h-6 flex items-center justify-center rounded bg-brand-navy text-white text-sm hover:opacity-80">+</button>
          </div>
          <input type="text" placeholder="Search releases..." aria-label="Search releases" value={releaseSearch} onChange={e => setReleaseSearch(e.target.value)} className="input text-xs py-1.5 w-full" />
        </div>
        <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
          <select className="input text-xs w-full py-1" aria-label="Filter releases by project" onChange={e => fetchReleases(e.target.value || null)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {releases.filter(r => !releaseSearch || r.name?.toLowerCase().includes(releaseSearch.toLowerCase()) || r.version?.includes(releaseSearch)).map(r => (
            <button key={r.id} onClick={() => { setSelectedRelease(r); fetchReleaseItems(r.id); }}
              className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-colors border ${selectedRelease?.id === r.id ? 'bg-brand-navy/10 border-brand-navy/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 border-transparent'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{r.name}</span>
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 ml-1">v{r.version}</span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${r.status === 'RELEASED' ? 'bg-semantic-success text-white' : r.status === 'IN_PROGRESS' ? 'bg-brand-navy text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{r.status}</span>
              {r.releaseDate && <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-2">{new Date(r.releaseDate).toLocaleDateString()}</span>}
            </button>
          ))}
          {releases.length === 0 && <p className="text-xs text-neutral-600 text-center py-6">No releases yet. Create one to get started.</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedRelease ? (
          <EmptyState icon={Rocket} title="Select a release" subtitle="Choose a release from the left to view its details and linked work items." action={<Button variant="action" onClick={() => setIsReleaseOpen(true)}>New Release</Button>} />
        ) : (
          <div>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-brand-navy dark:text-white">{selectedRelease.name}</h1>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">v{selectedRelease.version}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedRelease.status === 'RELEASED' ? 'bg-semantic-success text-white' : selectedRelease.status === 'IN_PROGRESS' ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-500'}`}>{selectedRelease.status}</span>
                </div>
                {selectedRelease.description && <p className="text-sm text-neutral-500">{selectedRelease.description}</p>}
                {selectedRelease.releaseDate && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Target: {new Date(selectedRelease.releaseDate).toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-2 items-center">
                {selectedRelease.status !== 'RELEASED' && <Button variant="action" onClick={() => updateRelease(selectedRelease.id, { ...selectedRelease, status: 'RELEASED' })}>Mark Released</Button>}
                {selectedRelease.status === 'PLANNED' && <Button variant="secondary" onClick={() => updateRelease(selectedRelease.id, { ...selectedRelease, status: 'IN_PROGRESS' })}>Start</Button>}
                <button onClick={() => deleteRelease(selectedRelease.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
              </div>
            </div>
            {releaseItems.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Progress</span>
                  <span className="text-xs text-neutral-500">{releaseItems.filter(i => i.status === 'Done').length}/{releaseItems.length} done</span>
                </div>
                <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full bg-semantic-success rounded-full" style={{ width: `${Math.round(releaseItems.filter(i => i.status === 'Done').length * 100 / releaseItems.length)}%` }} />
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Work Items ({releaseItems.length})</h3>
              {releaseItems.length === 0 ? <p className="text-sm text-neutral-600 text-center py-4">No work items linked yet.</p>
                : releaseItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <TypeBadge type={item.type} compact />
                    <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
                    <span role="button" tabIndex={0} onKeyDown={onPressKey} className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate cursor-pointer hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => setSelectedItem(item)}>{item.title}</span>
                    <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                    <button onClick={() => removeItemFromRelease(selectedRelease.id, item.id)} className="text-xs text-semantic-danger hover:underline">Remove</button>
                  </div>
                ))
              }
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Add Items to Release</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {workItems.filter(wi => !releaseItems.find(ri => ri.id === wi.id)).slice(0, 20).map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <TypeBadge type={item.type} compact />
                    <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
                    <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                    <button onClick={() => addItemToRelease(selectedRelease.id, item.id)} className="text-xs text-brand-navy hover:underline">+ Add</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
