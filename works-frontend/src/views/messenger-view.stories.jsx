import MessengerView from './messenger-view';
import { I18nProvider } from '@/lib/i18n';
import { internalChatClient } from '@/lib/internalChat';

export default {
  title: 'Views/MessengerView',
  component: MessengerView,
  decorators: [
    (Story) => (
      <I18nProvider>
        <div className="h-screen bg-neutral-50 p-6">
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
};

const Template = (args) => <MessengerView {...args} />;

// ── Mock Helpers ─────────────────────────────────────────────────────────────

function setupMocks(options) {
  const { conversations = [], thread = null, listError = null, unauthorized = false } = options;
  
  if (unauthorized) {
    internalChatClient.listConversations = async () => Promise.reject({ status: 403 });
    return;
  }
  
  if (listError) {
    internalChatClient.listConversations = async () => Promise.reject(new Error(listError));
    return;
  }

  internalChatClient.listConversations = async () => conversations;
  internalChatClient.getConversation = async () => thread || { conversation: {}, messages: [] };
}

// ── Stories ──────────────────────────────────────────────────────────────────

export const EmptyState = Template.bind({});
EmptyState.args = { workspaceId: 'ws-1' };
EmptyState.parameters = {
  msw: {
    handlers: [
      /* MSW could be used here in a real setup, but we mock the client directly */
    ]
  }
};
EmptyState.decorators = [
  (Story) => {
    setupMocks({ conversations: [] });
    return <Story />;
  }
];

export const Unauthorized = Template.bind({});
Unauthorized.args = { workspaceId: 'ws-1' };
Unauthorized.decorators = [
  (Story) => {
    setupMocks({ unauthorized: true });
    return <Story />;
  }
];

export const PopulatedThread = Template.bind({});
PopulatedThread.args = { workspaceId: 'ws-1' };
PopulatedThread.decorators = [
  (Story) => {
    const conv = { id: 'c-1', subject: 'Q3 Planning', type: 'DIRECT', createdAt: new Date().toISOString() };
    setupMocks({
      conversations: [
        conv,
        { id: 'c-2', subject: 'Production Incident', type: 'INCIDENT', createdAt: new Date(Date.now() - 86400000).toISOString() }
      ],
      thread: {
        conversation: conv,
        messages: [
          { id: 'm-1', body: 'Hey, are we ready for the planning meeting?', senderType: 'AGENT', senderName: 'Alice', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'm-2', body: 'Yes, I prepared the doc.', senderType: 'AGENT', senderName: 'Bob', createdAt: new Date(Date.now() - 1800000).toISOString(), reactions: [{ emoji: '👍' }] },
          { id: 'm-3', body: '/task Finalize slide deck', senderType: 'AGENT', senderName: 'Alice', createdAt: new Date(Date.now() - 900000).toISOString(), artifactType: 'TASK', artifactRef: 'ACT-1024' },
        ],
        participants: [
          { id: 'p-1', userId: 'Alice', role: 'MEMBER' },
          { id: 'p-2', userId: 'Bob', role: 'MEMBER' },
        ],
        pinnedMessages: [
          { messageId: 'm-1' }
        ]
      }
    });
    
    // Auto-select the first conversation after rendering for the story
    setTimeout(() => {
      const btn = document.querySelector('button[aria-label="Q3 Planning, DIRECT"]');
      if (btn) btn.click();
    }, 100);

    return <Story />;
  }
];
