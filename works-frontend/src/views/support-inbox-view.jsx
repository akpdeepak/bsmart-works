import { useState, useEffect, useCallback, useRef } from 'react';
import { Headset, Send, CheckCircle2, UserPlus, Bot, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { smartDate } from '@/lib/format';
import { agentChatClient, chatStatusTone, chatStatusLabel } from '@/lib/supportChat';

// Support inbox — the AGENT-side view for customer chat support (iteration 20, Cap N). Agents work
// the conversation list (filterable by status), open a thread, claim it, reply, and resolve. Self-
// contained: fetches its own data through the single apiClient via agentChatClient; the backend
// enforces work_service RBAC and workspace scope. Tokens only, all five states, keyboard-operable.
const STATUS_FILTERS = [
  ['', 'All'],
  ['ESCALATED', 'Needs agent'],
  ['AI_HANDLED', 'AI handled'],
  ['OPEN', 'Open'],
  ['RESOLVED', 'Resolved'],
];

export default function SupportInboxView({ workspaceId }) {
  const [filter, setFilter] = useState('ESCALATED');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const replyRef = useRef(null);

  const loadList = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    agentChatClient.listConversations(workspaceId, filter || null)
      .then((rows) => setConversations(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message || 'Could not load conversations.'))
      .finally(() => setLoading(false));
  }, [workspaceId, filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadList(); }, [loadList]);

  const openThread = useCallback((id) => {
    setActiveId(id);
    setError('');
    agentChatClient.getConversation(workspaceId, id)
      .then((res) => { setThread(res.conversation); setMessages(res.messages || []); })
      .catch((err) => setError(err.message || 'Could not open the conversation.'));
  }, [workspaceId]);

  const refreshActive = useCallback(() => {
    if (activeId) openThread(activeId);
    loadList();
  }, [activeId, openThread, loadList]);

  const claim = () => {
    if (!thread) return;
    setBusy(true);
    agentChatClient.assign(workspaceId, thread.id)
      .then(() => refreshActive())
      .catch((err) => setError(err.message || 'Could not assign.'))
      .finally(() => setBusy(false));
  };

  const sendReply = () => {
    const body = reply.trim();
    if (!body || !thread || busy) return;
    setBusy(true);
    agentChatClient.reply(workspaceId, thread.id, body)
      .then(() => { setReply(''); refreshActive(); })
      .catch((err) => setError(err.message || 'Could not send the reply.'))
      .finally(() => setBusy(false));
  };

  const resolve = () => {
    if (!thread) return;
    setBusy(true);
    agentChatClient.resolve(workspaceId, thread.id)
      .then(() => refreshActive())
      .catch((err) => setError(err.message || 'Could not resolve.'))
      .finally(() => setBusy(false));
  };

  const onReplyKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Support inbox</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Customer chat conversations — AI handles tier-1; you take over when they escalate.
        </p>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key || 'all'} type="button" onClick={() => setFilter(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? 'border-brand-navy text-brand-navy dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-semantic-danger-surface px-3 py-2 text-sm text-semantic-danger" role="alert">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation list */}
        <div className="min-h-0 overflow-y-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-1">
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />)}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations"
              subtitle="Customer chats matching this filter will appear here." />
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openThread(c.id)}
                    aria-current={activeId === c.id}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700 ${
                      activeId === c.id ? 'bg-neutral-50 dark:bg-neutral-700' : ''
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {c.subject || 'Conversation'}
                      </span>
                      <Badge tone={chatStatusTone(c.status)}>{chatStatusLabel(c.status)}</Badge>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {c.customerName || 'Customer'} · {c.lastMessageAt ? smartDate(c.lastMessageAt) : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active thread */}
        <div className="flex min-h-0 flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-2">
          {!thread ? (
            <EmptyState icon={Headset} title="Select a conversation"
              subtitle="Open a chat from the list to read the history and reply." />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {thread.subject || 'Conversation'}
                  </p>
                  <p className="text-xs text-neutral-500">{thread.customerName || 'Customer'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={chatStatusTone(thread.status)}>{chatStatusLabel(thread.status)}</Badge>
                  <Button type="button" size="sm" variant="secondary" onClick={claim} loading={busy}
                    leftIcon={<UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}>
                    Assign to me
                  </Button>
                  {thread.status !== 'RESOLVED' && (
                    <Button type="button" size="sm" onClick={resolve} loading={busy}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 ? (
                  <p className="text-sm text-neutral-500">No messages yet.</p>
                ) : (
                  messages.map((m) => <AgentBubble key={m.id} message={m} />)
                )}
              </div>

              <div className="border-t border-neutral-200 p-3 dark:border-neutral-700">
                <div className="flex items-end gap-2">
                  <label htmlFor="agent-reply" className="sr-only">Reply to customer</label>
                  <textarea
                    id="agent-reply" ref={replyRef} rows={1} value={reply}
                    onChange={(e) => setReply(e.target.value)} onKeyDown={onReplyKey}
                    placeholder="Reply to the customer…"
                    className="max-h-24 flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <Button type="button" size="icon" onClick={sendReply} loading={busy} disabled={!reply.trim()}
                    aria-label="Send reply">
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Agent-side bubble — customer left (incoming), AI/agent right (outgoing from the desk's side).
function AgentBubble({ message }) {
  const isCustomer = message.senderType === 'CUSTOMER';
  const isAi = message.senderType === 'AI';
  const Icon = isAi ? Bot : isCustomer ? User : Headset;
  const author = isAi ? 'AI assistant' : isCustomer ? 'Customer' : 'Agent';
  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[80%]">
        <div className="mb-0.5 flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {author}
        </div>
        <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isCustomer
            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
            : isAi
              ? 'bg-semantic-info-surface text-neutral-900'
              : 'bg-brand-navy text-white'
        }`}>
          {message.body}
        </div>
      </div>
    </div>
  );
}
