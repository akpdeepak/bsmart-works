import { useState } from 'react';
import { Gauge, Users, ClipboardList, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Field } from '@/components/works/field';
import { StatCard } from '@/components/works/stat-card';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { CockpitSkeleton } from './cockpit-skeleton';

// Sprint Cockpit — Capacity tab. Plans capacity across every team member: per-member availability
// in working-days (sprint days − time off × focus factor) converted to a story-points budget, shown
// against allocated work. Managers (canManage) edit the inputs inline; everyone else sees the board
// read-only — the server enforces manage_sprints regardless (RB-40 §1).

// Inner colour of a member's utilization bar — status by colour AND a label/icon, never colour alone.
const BAR_TONE = { over: 'bg-semantic-danger', under: 'bg-semantic-warning', ok: 'bg-brand-navy' };
const STATUS_LABEL = { over: 'Over', under: 'Under', ok: 'On track' };
const STATUS_TONE = {
  over: 'text-semantic-danger',
  under: 'text-semantic-warning',
  ok: 'text-semantic-success',
};

function MemberRow({ member, sprintWorkingDays, canManage, onSave }) {
  const [draft, setDraft] = useState({
    workingDays: member.workingDays ?? '',
    timeOffDays: member.timeOffDays ?? 0,
    focusFactor: member.focusFactor ?? 80,
  });

  function commit(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(member.userId, {
      workingDays: next.workingDays === '' || next.workingDays === null ? null : Number(next.workingDays),
      timeOffDays: Number(next.timeOffDays) || 0,
      focusFactor: Number(next.focusFactor),
    });
  }

  const util = member.utilizationPct;
  const barWidth = Math.min(100, util > 900 ? 100 : util);

  return (
    <div className="py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.name}</span>
        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">{member.roleKey}</span>
        <span className={`ml-auto flex items-center gap-1 text-xs font-semibold ${STATUS_TONE[member.status] || STATUS_TONE.ok}`}>
          {member.status === 'over' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            : member.status === 'under' ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {STATUS_LABEL[member.status] || STATUS_LABEL.ok}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-3 rounded-sm bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
          <div className={`h-full rounded-sm ${BAR_TONE[member.status] || BAR_TONE.ok}`} style={{ width: `${barWidth}%` }} />
        </div>
        <span className="text-xs font-mono text-neutral-900 dark:text-neutral-100 w-24 text-right">
          {member.allocatedPoints}/{member.capacityPoints} pts
        </span>
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 w-12 text-right">
          {util > 900 ? '∞' : `${util}%`}
        </span>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Working days">
          <input type="number" min="0" className="input text-sm w-20" disabled={!canManage}
            placeholder={String(sprintWorkingDays)} value={draft.workingDays}
            onChange={e => setDraft({ ...draft, workingDays: e.target.value })}
            onBlur={() => commit({})}
            onKeyDown={e => { if (e.key === 'Enter') commit({}); }} />
        </Field>
        <Field label="Time off (days)">
          <input type="number" min="0" className="input text-sm w-20" disabled={!canManage}
            value={draft.timeOffDays}
            onChange={e => setDraft({ ...draft, timeOffDays: e.target.value })}
            onBlur={() => commit({})}
            onKeyDown={e => { if (e.key === 'Enter') commit({}); }} />
        </Field>
        <Field label="Focus (%)">
          <input type="number" min="0" max="100" className="input text-sm w-20" disabled={!canManage}
            value={draft.focusFactor}
            onChange={e => setDraft({ ...draft, focusFactor: e.target.value })}
            onBlur={() => commit({})}
            onKeyDown={e => { if (e.key === 'Enter') commit({}); }} />
        </Field>
        <span className="text-xs text-neutral-600 dark:text-neutral-400 pb-2">
          = {member.remainingPoints} pts remaining
        </span>
      </div>
    </div>
  );
}

export function CapacityTab({ capacityBoard, cockpitLoading, saveMemberCapacity, canManage }) {
  if (cockpitLoading.capacity && !capacityBoard) return <CockpitSkeleton />;
  if (!capacityBoard) {
    return <EmptyState icon={Gauge} title="Capacity planning"
      subtitle="Per-member availability in days, converted to a points budget, vs. allocated work. Open with an active sprint selected." />;
  }
  if ((capacityBoard.members || []).length === 0) {
    return <EmptyState icon={Users} title="No team members"
      subtitle="Assign team roles on this project to plan per-member capacity." />;
  }

  const remainingColor = capacityBoard.teamRemainingPoints < 0 ? 'text-semantic-danger' : 'text-semantic-success';

  return (
    <div className="space-y-4">
      {capacityBoard.datesMissing && (
        <div className="flex items-start gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-semantic-warning" aria-hidden="true" />
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            This sprint has no start/end dates yet, so capacity falls back to an even velocity split. Set the sprint dates to plan by working days, time off and focus.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team capacity" value={capacityBoard.teamCapacityPoints} sub="points budget" color="text-brand-navy" icon={Gauge} />
        <StatCard label="Allocated" value={capacityBoard.teamAllocatedPoints} sub={`${capacityBoard.unassignedPoints} unassigned`} color="text-brand-navy" icon={ClipboardList} />
        <StatCard label="Remaining" value={capacityBoard.teamRemainingPoints} sub="capacity − allocated" color={remainingColor} icon={CheckCircle2} />
        <StatCard label="Avg utilization" value={`${capacityBoard.avgUtilizationPct}%`} sub={`${capacityBoard.memberCount} members`} color="text-brand-navy" icon={Gauge} />
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Team capacity</h4>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            velocity {capacityBoard.averageVelocity} pts · {capacityBoard.sprintWorkingDays} working days
          </span>
        </div>
        {capacityBoard.averageVelocity === 0 && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            No completed-sprint history yet, so the points budget needs velocity to compute. Complete a sprint to seed it.
          </p>
        )}
        {capacityBoard.members.map(m => (
          <MemberRow key={m.userId} member={m} sprintWorkingDays={capacityBoard.sprintWorkingDays}
            canManage={canManage} onSave={saveMemberCapacity} />
        ))}
      </div>
    </div>
  );
}
