import { useEffect, useState } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { Avatar } from '@/components/works/atoms/avatar';
import { Badge } from '@/components/works/atoms/badge';
import { Button } from '@/components/works/button';

// Organism — the EPIC-22 People Graph surface. The skills model and the "who holds skill X" query
// shipped server-side (V126, SkillService) with no way to reach them; this is that surface.
//
// Reads are workspace-scoped by the server (a non-member gets a 404, never another tenant's
// catalogue) and every path this component builds carries the active workspace id. Writes gate on
// create_items — the server is the enforcement point, so the form is hidden rather than relied upon.

const PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const CARD = 'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mt-6';

function SkillsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />
      ))}
    </div>
  );
}

export function SkillsPanel({ workspaceId, members = [], can = () => true, onToast = () => {} }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [holders, setHolders] = useState([]);
  const [holdersError, setHoldersError] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [personId, setPersonId] = useState('');
  const [proficiency, setProficiency] = useState('INTERMEDIATE');
  const [tick, setTick] = useState(0);
  const [holderTick, setHolderTick] = useState(0);

  const manage = can('create_items');

  // setState only in the promise continuation, never synchronously in the effect body
  // (react-hooks/set-state-in-effect); writes re-run the load by bumping the tick.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    api.send(`/workspaces/${workspaceId}/skills`)
      .then((list) => {
        if (!active) return;
        setSkills(Array.isArray(list) ? list : []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      });
    return () => { active = false; };
  }, [workspaceId, tick]);

  useEffect(() => {
    if (!workspaceId || !selected) return undefined;
    let active = true;
    api.send(`/workspaces/${workspaceId}/skills/${selected.id}/people`)
      .then((list) => {
        if (!active) return;
        setHolders(Array.isArray(list) ? list : []);
        setHoldersError(null);
      })
      .catch((err) => { if (active) setHoldersError(err); });
    return () => { active = false; };
  }, [workspaceId, selected, holderTick]);

  if (!workspaceId) return null;

  const nameOf = (userId) => members.find((m) => m.id === userId)?.fullName || userId;

  const createSkill = () => {
    if (!name.trim()) return;
    api.send(`/workspaces/${workspaceId}/skills`, {
      method: 'POST',
      body: { name: name.trim(), category: category.trim() },
    })
      .then(() => {
        setName('');
        setCategory('');
        setTick((t) => t + 1);
        onToast('Skill added');
      })
      .catch((err) => onToast(err.message, 'error'));
  };

  const addToPerson = () => {
    if (!selected || !personId) return;
    api.send(`/workspaces/${workspaceId}/people/${personId}/skills`, {
      method: 'POST',
      body: { skillId: selected.id, proficiency },
    })
      .then(() => {
        setPersonId('');
        setHolderTick((t) => t + 1);
        onToast('Skill recorded');
      })
      .catch((err) => onToast(err.message, 'error'));
  };

  return (
    <div className={CARD}>
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Skills &amp; People Graph</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        The skills this workspace tracks, and who holds them
      </p>

      <AsyncBoundary
        loading={loading}
        error={error}
        empty={!loading && !error && skills.length === 0}
        label="Loading skills"
        skeleton={<SkillsSkeleton />}
        emptyIcon={Sparkles}
        emptyTitle="No skills yet"
        emptySubtitle={manage
          ? 'Add the first skill below, then record who holds it.'
          : 'An admin has not added any skills to this workspace yet.'}
        onRetry={() => { setLoading(true); setError(null); setTick((t) => t + 1); }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Catalogue</h3>
            <ul className="space-y-1">
              {skills.map((s) => (
                <li key={s.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={selected?.id === s.id}
                    onClick={() => setSelected(s)}
                    className={`w-full justify-between text-left ${selected?.id === s.id ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`}
                  >
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">{s.name}</span>
                    {s.category ? <Badge>{s.category}</Badge> : null}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              {selected ? `Who holds ${selected.name}` : 'Who holds it'}
            </h3>
            {!selected && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Select a skill to see who holds it.
              </p>
            )}
            {selected && holdersError && (
              <p className="text-sm text-semantic-danger">{holdersError.message}</p>
            )}
            {selected && !holdersError && holders.length === 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Nobody has been recorded with this skill yet.
              </p>
            )}
            {selected && !holdersError && holders.length > 0 && (
              <ul aria-label={`People with ${selected.name}`} className="space-y-1">
                {holders.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-1.5">
                    <Avatar name={nameOf(h.userId)} size={7} />
                    <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">{nameOf(h.userId)}</span>
                    <Badge>{h.proficiency}</Badge>
                  </li>
                ))}
              </ul>
            )}

            {selected && manage && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor="skill-person" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Person</label>
                  <select id="skill-person" value={personId} onChange={(e) => setPersonId(e.target.value)}
                    className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-2 py-1 text-neutral-700">
                    <option value="">Select a person</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="skill-proficiency" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Proficiency</label>
                  <select id="skill-proficiency" value={proficiency} onChange={(e) => setProficiency(e.target.value)}
                    className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-2 py-1 text-neutral-700">
                    {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <Button variant="secondary" size="sm" disabled={!personId}
                  leftIcon={<Users aria-hidden="true" className="h-4 w-4" />} onClick={addToPerson}>
                  Add to person
                </Button>
              </div>
            )}
          </div>
        </div>
      </AsyncBoundary>

      {manage && !loading && !error && (
        <div className="mt-6 border-t border-neutral-100 dark:border-neutral-700 pt-4">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Add a skill</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-40">
              <label htmlFor="skill-name" className="sr-only">Skill name</label>
              <input id="skill-name" value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createSkill()}
                placeholder="PostgreSQL" className="input w-full text-sm" />
            </div>
            <div className="flex-1 min-w-40">
              <label htmlFor="skill-category" className="sr-only">Category</label>
              <input id="skill-category" value={category} onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createSkill()}
                placeholder="Category (optional)" className="input w-full text-sm" />
            </div>
            <Button variant="action" disabled={!name.trim()} onClick={createSkill}>Add skill</Button>
          </div>
        </div>
      )}
    </div>
  );
}
