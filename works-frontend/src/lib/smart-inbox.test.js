import { describe, expect, it } from 'vitest';
import {
  classifyInboxItem, countActionableNotifications, getActionableInboxItems, groupInboxItems,
} from './smart-inbox';

describe('smart inbox projection helpers', () => {
  it('uses notification types instead of message-text heuristics for compatibility callers', () => {
    expect(classifyInboxItem({ type: 'MENTION', message: 'opaque' }).id).toBe('reply');
    expect(classifyInboxItem({ type: 'ASSIGNED', message: 'opaque' }).id).toBe('assign');
    expect(classifyInboxItem({ type: 'SLA_ESCALATION', message: 'opaque' }).id).toBe('escalate');
    expect(classifyInboxItem({ type: 'REPORT_DELIVERED', message: 'approval words do not matter' }).id).toBe('activity');
  });

  it('keeps informational and read notifications out of compatibility action counts', () => {
    const notifications = [
      { id: 'N1', type: 'MENTION', read: false },
      { id: 'N2', type: 'ASSIGNED', read: true },
      { id: 'N3', type: 'WATCH', read: false },
    ];
    expect(countActionableNotifications(getActionableInboxItems(notifications))).toBe(1);
  });

  it('groups server items in the product action order', () => {
    const groups = groupInboxItems([
      { key: 'n:1', intent: 'ESCALATE' },
      { key: 'n:2', intent: 'REPLY' },
      { key: 'n:3', intent: 'APPROVE' },
    ]);
    expect(groups.map((group) => group.id)).toEqual(['approve', 'reply', 'escalate']);
  });
});
