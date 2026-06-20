import { describe, it, expect } from 'vitest';
import { buildMessageActionDraft, messageActionOptions } from './message-actions';

describe('message actions', () => {
  it('offers conversion actions only for customer messages with content', () => {
    expect(messageActionOptions({ senderType: 'CUSTOMER', body: 'Need refund help' }).map(a => a.id)).toEqual([
      'task',
      'decision',
      'risk',
      'commitment',
    ]);
    expect(messageActionOptions({ senderType: 'AGENT', body: 'We will check' })).toEqual([]);
    expect(messageActionOptions({ senderType: 'CUSTOMER', body: '   ' })).toEqual([]);
  });

  it('builds a source-cited draft without creating an official record', () => {
    const draft = buildMessageActionDraft(
      { id: 'MSG-1', senderType: 'CUSTOMER', body: 'Please confirm that the billing correction will happen before Monday.' },
      'commitment',
      { id: 'CHAT-1', subject: 'Billing issue', customerName: 'Asha' },
    );

    expect(draft).toMatchObject({
      actionId: 'commitment',
      title: 'Customer commitment draft',
      source: {
        conversationId: 'CHAT-1',
        messageId: 'MSG-1',
        customer: 'Asha',
        subject: 'Billing issue',
      },
      citation: 'Asha in Billing issue, message MSG-1',
    });
    expect(draft.summary).toContain('Customer commitment: Please confirm');
  });
});
