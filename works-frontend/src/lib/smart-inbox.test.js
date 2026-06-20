import { describe, it, expect } from 'vitest';
import { classifyInboxItem, countActionableNotifications, getActionableInboxItems, groupInboxItems } from './smart-inbox';

describe('smart inbox classification', () => {
  it('maps common notification signals to action groups', () => {
    expect(classifyInboxItem({ type: 'MENTION', message: 'Priya mentioned you' }).id).toBe('reply');
    expect(classifyInboxItem({ type: 'ASSIGNED', message: 'WRK-1 assigned to you' }).id).toBe('assign');
    expect(classifyInboxItem({ type: 'SLA_ESCALATION', message: 'Response SLA breached' }).id).toBe('escalate');
    expect(classifyInboxItem({ type: 'ARTICLE_APPROVAL', message: 'Approval requested' }).id).toBe('approve');
    expect(classifyInboxItem({ type: 'BQL_SUBSCRIPTION', message: 'Saved query changed' }).id).toBe('review');
  });

  it('counts actionable items, excluding read and snoozed activity', () => {
    const snoozedIds = new Set(['N2']);
    const notifications = [
      { id: 'N1', type: 'MENTION', message: 'You were mentioned', read: false },
      { id: 'N2', type: 'ASSIGNED', message: 'Assigned to you', read: false },
      { id: 'N3', type: 'REPORT_DELIVERED', message: 'Weekly report delivered', read: true },
      { id: 'N4', type: 'SYSTEM', message: 'FYI only', read: false },
    ];

    expect(countActionableNotifications(notifications, { snoozedIds })).toBe(1);
    expect(getActionableInboxItems(notifications, { snoozedIds }).map((item) => item.id)).toEqual(['N1']);
  });

  it('groups actionable items by required action', () => {
    const items = getActionableInboxItems([
      { id: 'N1', type: 'MENTION', message: 'You were mentioned', read: false },
      { id: 'N2', type: 'SLA_ESCALATION', message: 'SLA breached', read: false },
    ]);

    expect(groupInboxItems(items).map((group) => group.id)).toEqual(['reply', 'escalate']);
  });
});
