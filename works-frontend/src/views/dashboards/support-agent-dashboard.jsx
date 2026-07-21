import { Headset, MessageSquare, UserCheck, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/works/stat-card';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { getTimeOfDay as getGreeting } from '@/lib/utils';
import { TodayCard, Empty, TodaySurface } from './_shared';

const STATUS_TONE = {
  ESCALATED: 'danger',
  OPEN: 'warning',
  AI_HANDLED: 'info',
};

const SUPPORT_REGISTRY = {
  stat: (ctx, widget) => {
    const openInbox = () => ctx.setView('supportinbox');
    switch (widget.config?.k) {
      case 'open':
        return <StatCard label="Open conversations" value={ctx.openCount} sub="Waiting for progress"
          color="text-semantic-warning" icon={MessageSquare} onClick={openInbox} />;
      case 'assigned':
        return <StatCard label="Assigned to me" value={ctx.assignedCount} sub="Your active queue"
          color="text-brand-navy" icon={UserCheck} onClick={openInbox} />;
      case 'resolved':
        return <StatCard label="Resolved today" value={ctx.resolvedCount} sub="Quiet wins"
          color="text-semantic-success" icon={CheckCircle2} onClick={openInbox} />;
      default:
        return <StatCard label="Needs agent" value={ctx.escalatedCount} sub="Escalated customer chats"
          color="text-semantic-danger" icon={Headset} onClick={openInbox} />;
    }
  },
  'support-queue': (ctx) => (
    <TodayCard title="Customer conversations" icon={Headset} iconColor="text-brand-navy"
      action={() => ctx.setView('supportinbox')} actionLabel="Open inbox">
      {ctx.conversations.length === 0 ? <Empty msg="No customer conversations need attention." /> : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {ctx.conversations.slice(0, 5).map((conversation) => (
            <li key={conversation.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {conversation.subject || 'Customer conversation'}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {conversation.assigned_agent_id ? 'Assigned' : 'Unassigned'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[conversation.status] || 'neutral'}>{conversation.status}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => ctx.setView('supportinbox')}>
                  Open
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TodayCard>
  ),
};

export function SupportAgentToday({ data, currentUser, setView, layout, builtinLayout, edit }) {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const conversations = data?.conversations || [];
  const escalatedCount = Number(data?.escalatedCount || 0);
  const openCount = Number(data?.openCount || 0);
  const assignedCount = Number(data?.assignedToMeCount || 0);
  const resolvedCount = Number(data?.resolvedTodayCount || 0);
  const subtitle = escalatedCount > 0
    ? `${escalatedCount} customer conversation${escalatedCount === 1 ? '' : 's'} need an agent`
    : 'The customer queue is under control';

  return (
    <TodaySurface
      header={{
        greeting: getGreeting(), firstName, rolePill: 'Support Agent', subtitle,
        cta: 'Open support inbox', onCta: () => setView('supportinbox'),
      }}
      registry={SUPPORT_REGISTRY}
      ctx={{ conversations, escalatedCount, openCount, assignedCount, resolvedCount, setView }}
      layout={layout} builtinLayout={builtinLayout} edit={edit}
    />
  );
}
