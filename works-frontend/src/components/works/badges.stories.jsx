import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { RoleBadge } from './role-badge';
import { LapseBadge } from './atoms/lapse-badge';

export default {
  title: 'Works/Badges',
  tags: ['autodocs'],
  parameters: { a11y: { test: 'error' } },
};

export const Status = {
  name: 'StatusBadge — all tones',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED'].map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};

export const Priority = {
  name: 'PriorityBadge — all levels',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
        <PriorityBadge key={p} priority={p} />
      ))}
    </div>
  ),
};

export const Role = {
  name: 'RoleBadge — all roles',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['OWNER', 'ADMIN', 'LEAD', 'MEMBER', 'VIEWER'].map((r) => (
        <RoleBadge key={r} role={r} />
      ))}
    </div>
  ),
};

export const RoleSmall = {
  name: 'RoleBadge — small variant',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {['OWNER', 'ADMIN', 'LEAD', 'MEMBER', 'VIEWER'].map((r) => (
        <RoleBadge key={r} role={r} small />
      ))}
    </div>
  ),
};

export const Lapse = {
  name: 'LapseBadge — all states',
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      <LapseBadge lapse={{ state: 'on_track', elapsedSec: 3600 }} />
      <LapseBadge lapse={{ state: 'at_risk',  elapsedSec: 7200 }} />
      <LapseBadge lapse={{ state: 'breached', elapsedSec: 14400 }} />
      <LapseBadge lapse={{ state: 'neutral',  elapsedSec: 1800 }} />
    </div>
  ),
};

export const LapseCompact = {
  name: 'LapseBadge — compact (no label)',
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      <LapseBadge lapse={{ state: 'on_track', elapsedSec: 3600 }} compact />
      <LapseBadge lapse={{ state: 'at_risk',  elapsedSec: 7200 }} compact />
      <LapseBadge lapse={{ state: 'breached', elapsedSec: 14400 }} compact />
    </div>
  ),
};

export const AllBadges = {
  name: 'All badge families side-by-side',
  render: () => (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map((s) => <StatusBadge key={s} status={s} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Priority</p>
        <div className="flex flex-wrap gap-2">
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <PriorityBadge key={p} priority={p} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Role</p>
        <div className="flex flex-wrap gap-2">
          {['OWNER', 'ADMIN', 'LEAD', 'MEMBER', 'VIEWER'].map((r) => <RoleBadge key={r} role={r} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Time in status</p>
        <div className="flex flex-wrap gap-2">
          <LapseBadge lapse={{ state: 'on_track', elapsedSec: 3600 }} />
          <LapseBadge lapse={{ state: 'at_risk',  elapsedSec: 7200 }} />
          <LapseBadge lapse={{ state: 'breached', elapsedSec: 14400 }} />
        </div>
      </div>
    </div>
  ),
};
