const ACTIONS = {
  task: {
    label: 'Create task draft',
    title: 'Task draft',
    prefix: 'Follow up',
  },
  decision: {
    label: 'Decision draft',
    title: 'Decision draft',
    prefix: 'Decision needed',
  },
  risk: {
    label: 'Risk draft',
    title: 'Risk draft',
    prefix: 'Risk to review',
  },
  commitment: {
    label: 'Commitment draft',
    title: 'Customer commitment draft',
    prefix: 'Customer commitment',
  },
};

function compact(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function excerpt(text, limit = 140) {
  const value = compact(text);
  return value.length > limit ? `${value.slice(0, limit - 1).trim()}...` : value;
}

export function messageActionOptions(message) {
  if (!message || message.senderType !== 'CUSTOMER' || !compact(message.body)) return [];
  return Object.entries(ACTIONS).map(([id, action]) => ({ id, label: action.label }));
}

export function buildMessageActionDraft(message, actionId, conversation = {}) {
  const action = ACTIONS[actionId] || ACTIONS.task;
  const body = excerpt(message?.body || '');
  const subject = compact(conversation?.subject || 'Customer conversation');
  const customer = compact(conversation?.customerName || 'Customer');

  return {
    actionId: ACTIONS[actionId] ? actionId : 'task',
    title: action.title,
    summary: `${action.prefix}: ${body}`,
    source: {
      conversationId: conversation?.id,
      messageId: message?.id,
      customer,
      subject,
    },
    citation: `${customer} in ${subject}${message?.id ? `, message ${message.id}` : ''}`,
  };
}
