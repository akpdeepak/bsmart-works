import { Table } from '@/components/works/atoms/table';
import { StatCard } from '@/components/works/stat-card';
import { DonutChart } from '@/components/works/molecules';
import { activeMemberCount } from '@/lib/today-metrics';
import { Users, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { TodayCard, HealthRing, MiniBar, Empty, TodaySurface } from './_shared';
import { getTimeOfDay as getGreeting } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// Focus: "Is the platform healthy?" — member activity, security posture, audit
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_REGISTRY = {
  stat: (ctx, w) => {
    switch (w.config?.k) {
      case 'members':
        return <StatCard label="Members" value={ctx.memberCount}
          sub={`${activeMemberCount(ctx.data?.members)} active this week`}
          color="text-brand-navy" icon={Users} onClick={() => ctx.setView('workspace')} />;
      case 'mfa':
        return <StatCard label="MFA adoption" value={`${ctx.mfaPct}%`} sub={`${ctx.mfa.mfa_enabled}/${ctx.mfa.total} enabled`} color={ctx.mfaColor} icon={ShieldCheck} />;
      case 'events':
        return <StatCard label="Events this week" value={ctx.totalEvents} sub="Platform activity" color="text-neutral-600 dark:text-neutral-400" icon={Activity} />;
      default:
        return <StatCard label="Audit entries" value={ctx.auditLog.length} sub="Recent role changes" color={ctx.auditLog.length > 0 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'} icon={AlertTriangle} onClick={() => ctx.setView('security')} />;
    }
  },
  activity: (ctx) => (
    <TodayCard title="Activity this week" icon={Activity} iconColor="text-brand-navy">
      {ctx.activityStats.length === 0
        ? <Empty msg="No platform activity recorded this week." />
        : (
          <div className="space-y-3">
            {ctx.activityStats.slice(0, 8).map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-44 flex-shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-400">{e.event_type}</span>
                <div className="flex-1">
                  <MiniBar value={e.count || 0} max={ctx.maxEvents} color="bg-brand-navy" />
                </div>
                <span className="w-8 flex-shrink-0 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">{e.count}</span>
              </div>
            ))}
          </div>
        )}
    </TodayCard>
  ),
  // Security posture + role distribution stacked — kept as one widget so the tall activity card
  // sits beside both (a flat grid can't otherwise reproduce the stacked right column).
  'security-roles': (ctx) => (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          <ShieldCheck className="h-4 w-4 text-semantic-success" aria-hidden="true" />Security posture
        </h3>
        <div className="flex items-center gap-4">
          <HealthRing pct={ctx.mfaPct} size={72} stroke={ctx.mfaStroke} label="MFA" />
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">MFA adoption</p>
            <p className="text-xs text-neutral-500">{ctx.mfa.mfa_enabled} of {ctx.mfa.total} users</p>
            {ctx.mfaPct < 80 && (
              <p className="mt-1 text-xs text-semantic-danger">Below 80% target</p>
            )}
          </div>
        </div>
      </div>
      {ctx.roleDist.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">Role distribution</h3>
          <DonutChart data={ctx.roleDist.map(r => ({ label: r.role || '—', value: Number(r.count) || 0 }))} />
        </div>
      )}
    </div>
  ),
  'audit-log': (ctx) => (
    <TodayCard title="Recent audit log" icon={AlertTriangle} iconColor="text-semantic-warning"
      action={() => ctx.setView('security')} className="overflow-hidden">
      {ctx.auditLog.length === 0
        ? <Empty msg="No recent role changes." />
        : (
          <Table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                <th scope="col" className="px-5 py-2">Member</th>
                <th scope="col" className="px-3 py-2">Change</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">By</th>
                <th scope="col" className="hidden px-3 py-2 md:table-cell">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {ctx.auditLog.slice(0, 6).map(a => (
                <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td className="px-5 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{a.target_name}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className="text-semantic-warning">{a.old_role}</span>
                    <span className="mx-1 text-neutral-400">→</span>
                    <span className="text-semantic-success">{a.new_role}</span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs text-neutral-500 sm:table-cell">{a.actor_name}</td>
                  <td className="hidden px-3 py-2.5 text-xs text-neutral-500 md:table-cell">{a.changed_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
    </TodayCard>
  ),
};

export function AdminToday({ data, currentUser, setView, layout, builtinLayout, edit }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const memberCount = data?.memberCount ?? 0;
  const mfa = data?.mfaStats || { total: 0, mfa_enabled: 0 };
  const mfaPct = mfa.total > 0 ? Math.round(mfa.mfa_enabled * 100 / mfa.total) : 0;
  const totalEvents = data?.totalEventsWeek ?? 0;
  const activityStats = data?.activityStats || [];
  const auditLog = data?.recentAuditLog || [];
  const roleDist = data?.roleDistribution || [];
  const maxEvents = Math.max(...activityStats.map(e => e.count || 0), 1);

  const mfaStroke = mfaPct >= 80 ? 'stroke-semantic-success' : mfaPct >= 50 ? 'stroke-semantic-warning' : 'stroke-semantic-danger';
  const mfaColor  = mfaPct >= 80 ? 'text-semantic-success'  : mfaPct >= 50 ? 'text-semantic-warning'  : 'text-semantic-danger';

  const subtitle = [
    `${memberCount} member${memberCount !== 1 ? 's' : ''}`,
    `${mfaPct}% MFA adoption`,
    `${totalEvents} events this week`,
  ].join(' · ');

  const ctx = {
    data, memberCount, mfa, mfaPct, mfaStroke, mfaColor, totalEvents,
    activityStats, auditLog, roleDist, maxEvents, setView,
  };

  return (
    <TodaySurface
      header={{ greeting: getGreeting(), firstName, rolePill: 'Admin', subtitle, cta: 'Manage members', onCta: () => setView('workspace') }}
      registry={ADMIN_REGISTRY} ctx={ctx} layout={layout} builtinLayout={builtinLayout} edit={edit} />
  );
}
