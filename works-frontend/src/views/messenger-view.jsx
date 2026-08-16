import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import {
  Send, MessageSquare, Plus, FileText, AlertCircle, Users, Hash,
  Sparkles, CheckSquare, Pin, Smile, Zap,
  ChevronRight, X, Loader2, Lock,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { Select } from '@/components/works/atoms/select';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { PageLayout } from '@/components/works/templates/page-layout';
import { Avatar } from '@/components/works/atoms/avatar';
import { Badge } from '@/components/works/atoms/badge';
import { smartDate } from '@/lib/format';
import { internalChatClient } from '@/lib/internalChat';
import { connectRealtime } from '@/lib/realtime';
import { useI18n } from '@/lib/i18n';

// ─── State machine ──────────────────────────────────────────────────────────

const initialState = {
  conversations: [],
  activeId: null,
  thread: null,
  messages: [],
  participants: [],
  pinnedMessages: [],
  listLoading: true,
  listError: '',
  threadLoading: false,
  sendBusy: false,
  reply: '',
  showNewConv: false,
  newType: 'DIRECT',
  newSubject: '',
  showParticipants: false,
  aiSummary: null,
  aiSummaryLoading: false,
  aiDrafts: null,
  aiDraftsLoading: false,
  unauthorized: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LIST_START':    return { ...state, listLoading: true, listError: '' };
    case 'LIST_OK':       return { ...state, listLoading: false, conversations: action.rows };
    case 'LIST_ERR':      return { ...state, listLoading: false, listError: action.err };
    case 'UNAUTHORIZED':  return { ...state, listLoading: false, unauthorized: true };
    case 'THREAD_START':  return { ...state, threadLoading: true };
    case 'THREAD_OK':     return {
      ...state, threadLoading: false,
      thread: action.thread,
      messages: action.messages,
      participants: action.participants || [],
      pinnedMessages: action.pinnedMessages || [],
      activeId: action.id,
      showNewConv: false,
      aiSummary: null,
      aiDrafts: null,
    };
    case 'THREAD_ERR':    return { ...state, threadLoading: false };
    case 'SEND_BUSY':     return { ...state, sendBusy: action.val };
    case 'SET_REPLY':     return { ...state, reply: action.val };
    case 'SHOW_NEW':      return { ...state, showNewConv: true, activeId: null };
    case 'HIDE_NEW':      return { ...state, showNewConv: false };
    case 'NEW_TYPE':      return { ...state, newType: action.val };
    case 'NEW_SUBJECT':   return { ...state, newSubject: action.val };
    case 'TOGGLE_PARTS':  return { ...state, showParticipants: !state.showParticipants };
    case 'AI_SUM_START':  return { ...state, aiSummaryLoading: true, aiSummary: null };
    case 'AI_SUM_OK':     return { ...state, aiSummaryLoading: false, aiSummary: action.data };
    case 'AI_ACTS_START': return { ...state, aiDraftsLoading: true, aiDrafts: null };
    case 'AI_ACTS_OK':    return { ...state, aiDraftsLoading: false, aiDrafts: action.data };
    default:              return state;
  }
}

// ─── Type metadata ──────────────────────────────────────────────────────────

const getTypeMeta = (t) => ({
  DIRECT:       { icon: Users,        label: t('messenger.type.direct',       'Direct'),       color: 'text-indigo-600' },
  GROUP:        { icon: Users,        label: t('messenger.type.group',        'Group'),         color: 'text-violet-600' },
  PROJECT:      { icon: Hash,         label: t('messenger.type.project',      'Project'),       color: 'text-sky-600' },
  INCIDENT:     { icon: AlertCircle,  label: t('messenger.type.incident',     'Incident'),      color: 'text-red-600' },
  WORK_ITEM:    { icon: CheckSquare,  label: t('messenger.type.workItem',     'Work Item'),     color: 'text-emerald-600' },
  RELEASE:      { icon: Zap,          label: t('messenger.type.release',      'Release'),       color: 'text-amber-600' },
  ANNOUNCEMENT: { icon: MessageSquare,label: t('messenger.type.announcement', 'Announcement'),  color: 'text-rose-600' },
});

function TypeIcon({ type, className }) {
  const { t } = useI18n();
  const meta = getTypeMeta(t)[type] || getTypeMeta(t).DIRECT;
  const Icon = meta.icon;
  return <Icon className={`h-4 w-4 ${meta.color} ${className ?? ''}`} />;
}

// ─── Quick emoji reactions ───────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '👀'];

function ReactionBar({ workspaceId, messageId, reactions, onReacted }) {
  const { t } = useI18n();
  const [showPicker, setShowPicker] = useState(false);

  const handleEmoji = async (emoji) => {
    setShowPicker(false);
    try {
      await internalChatClient.addReaction(workspaceId, messageId, emoji);
      onReacted?.();
    } catch { /* ignore */ }
  };

  // Group reactions by emoji
  const grouped = (reactions ?? []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
      {Object.entries(grouped).map(([emoji, count]) => (
        <Button unstyled type="button"
          key={emoji}
          onClick={() => handleEmoji(emoji)}
          className="inline-flex items-center gap-0.5 text-xs bg-neutral-100 hover:bg-indigo-50 border border-neutral-200 hover:border-indigo-300 rounded-full px-2 py-0.5 transition-colors"
          aria-label={`React with ${emoji} (${count})`}
        >
          <span>{emoji}</span>
          <span className="text-neutral-500 font-medium">{count}</span>
        </Button>
      ))}

      <div className="relative">
        <Button unstyled type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-0.5 text-xs text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full px-1.5 py-0.5 transition-colors"
          aria-label={t('messenger.reaction.add', 'Add reaction')}
        >
          <Smile className="h-3 w-3" />
        </Button>
        {showPicker && (
          <div
            className="absolute bottom-full left-0 mb-1 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 flex gap-1 z-50"
            role="dialog"
            aria-label={t('messenger.reaction.picker', 'Emoji picker')}
          >
            {QUICK_EMOJIS.map((e) => (
              <Button unstyled type="button"
                key={e}
                onClick={() => handleEmoji(e)}
                className="text-lg hover:scale-125 transition-transform p-0.5"
                aria-label={`React ${e}`}
              >
                {e}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single message bubble ───────────────────────────────────────────────────

function MessageBubble({ msg, workspaceId, isPinned, onReacted }) {
  const { t } = useI18n();
  return (
    <article
      className="group flex items-start gap-3"
      aria-label={`Message from ${msg.senderType === 'SYSTEM' ? t('messenger.sender.system', 'System') : t('messenger.sender.agent', 'Agent')}`}
    >
      <Avatar
        name={msg.senderType === 'SYSTEM' ? 'SYS' : (msg.senderId ?? 'AG')}
        size={8}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-sm font-semibold text-neutral-800">
            {msg.senderType === 'SYSTEM'
              ? t('messenger.sender.system', 'System')
              : (msg.senderName ?? t('messenger.sender.agent', 'Team member'))}
          </span>
          <time
            className="text-xs text-neutral-400"
            dateTime={msg.createdAt}
            title={msg.createdAt}
          >
            {smartDate(msg.createdAt)}
          </time>
          {isPinned && (
            <span className="text-xs text-amber-600 flex items-center gap-0.5">
              <Pin className="h-2.5 w-2.5" />
              {t('messenger.pinned', 'Pinned')}
            </span>
          )}
        </div>

        <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words leading-relaxed">
          {msg.body}
        </p>

        {msg.artifactType && (
          <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm flex items-start gap-2 max-w-sm">
            <FileText className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-indigo-900 text-xs mb-0.5">
                {msg.artifactType === 'TASK'
                  ? t('messenger.artifact.task', 'Task created')
                  : t('messenger.artifact.decision', 'Decision created')}
              </div>
              <code className="text-indigo-700 text-xs font-mono">
                {msg.artifactRef}
              </code>
            </div>
          </div>
        )}

        <ReactionBar
          workspaceId={workspaceId}
          messageId={msg.id}
          reactions={msg.reactions}
          onReacted={onReacted}
        />
      </div>
    </article>
  );
}

// ─── AI summary panel ────────────────────────────────────────────────────────

function AiPanel({ summary, drafts, onDismiss }) {
  const { t } = useI18n();
  if (!summary && !drafts) return null;
  return (
    <div
      role="region"
      aria-label={t('messenger.ai.panel', 'AI insights')}
      className="border-t border-indigo-100 bg-indigo-50/60 p-4 space-y-3"
    >
      {summary && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {summary.aiAvailable
                ? t('messenger.ai.summary', 'AI Summary')
                : t('messenger.ai.summaryFallback', 'Summary (AI unavailable)')}
            </h3>
            <Button unstyled type="button"
              onClick={() => onDismiss('summary')}
              aria-label={t('messenger.ai.dismiss', 'Dismiss')}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed">{summary.summary}</p>
          {!summary.aiAvailable && (
            <p className="text-xs text-indigo-500 mt-1 italic">
              {t('messenger.ai.fallbackNote', 'AI summary is not available. Showing a message count summary.')}
            </p>
          )}
        </div>
      )}

      {drafts && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {t('messenger.ai.actionDrafts', 'Suggested Action Items')}
              <Badge variant="warning" size="xs">{t('messenger.ai.reviewOnly', 'Review required')}</Badge>
            </h3>
            <Button unstyled type="button"
              onClick={() => onDismiss('drafts')}
              aria-label={t('messenger.ai.dismiss', 'Dismiss')}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {drafts.drafts.length === 0 ? (
            <p className="text-sm text-indigo-700 italic">
              {t('messenger.ai.noActions', 'No action items detected. AI may be unavailable.')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {drafts.drafts.map((d, i) => (
                <li
                  key={`${d.title}-${d.assignee || ''}-${d.dueHint || ''}-${i}`}
                  className="flex items-start gap-2 text-sm text-indigo-900"
                >
                  <CheckSquare className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{d.title}</span>
                    {d.assignee && <span className="text-indigo-500 ml-1">→ {d.assignee}</span>}
                    {d.dueHint && <span className="text-indigo-400 ml-1 text-xs">({d.dueHint})</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {t('messenger.ai.reviewNote', 'These are drafts only. Approve each to create a real work item.')}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export default function MessengerView({ workspaceId, users = [] }) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(reducer, initialState);
  const replyRef = useRef(null);
  const threadEndRef = useRef(null);

  const {
    conversations, activeId, thread, messages, participants, pinnedMessages,
    listLoading, listError, threadLoading, sendBusy, reply,
    showNewConv, newType, newSubject, showParticipants,
    aiSummary, aiSummaryLoading, aiDrafts, aiDraftsLoading, unauthorized,
  } = state;

  // ── Load conversation list ─────────────────────────────────────────────────

  const loadList = useCallback(() => {
    if (!workspaceId) return;
    dispatch({ type: 'LIST_START' });
    internalChatClient.listConversations(workspaceId)
      .then((rows) => dispatch({ type: 'LIST_OK', rows: Array.isArray(rows) ? rows : [] }))
      .catch((err) => {
        if (err?.status === 403 || err?.code === 403) {
          dispatch({ type: 'UNAUTHORIZED' });
        } else {
          dispatch({ type: 'LIST_ERR', err: err.message || t('messenger.error.loadList', 'Could not load conversations.') });
        }
      });
  }, [workspaceId]);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Load thread ────────────────────────────────────────────────────────────

  const loadThread = useCallback((id) => {
    if (!workspaceId) return;
    dispatch({ type: 'THREAD_START' });
    internalChatClient.getConversation(workspaceId, id)
      .then((res) => {
        dispatch({
          type: 'THREAD_OK',
          id,
          thread: res.conversation,
          messages: Array.isArray(res.messages) ? res.messages : [],
          participants: Array.isArray(res.participants) ? res.participants : [],
          pinnedMessages: Array.isArray(res.pinnedMessages) ? res.pinnedMessages : [],
        });
        setTimeout(() => {
          threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          replyRef.current?.focus();
        }, 50);
      })
      .catch(() => dispatch({ type: 'THREAD_ERR' }));
  }, [workspaceId]);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!workspaceId) return undefined;
    const dispose = connectRealtime(workspaceId, {
      event: (data) => {
        if (typeof data?.eventType === 'string' && data.eventType.startsWith('CHAT_')) {
          loadList();
          if (activeId && data.eventType === 'CHAT_MESSAGE_RECEIVED'
            && data.payload?.conversationId === activeId) {
            loadThread(activeId);
          }
        }
      },
    });
    return dispose;
  }, [workspaceId, loadList, activeId, loadThread]);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!reply.trim() || !activeId) return;
    dispatch({ type: 'SEND_BUSY', val: true });
    internalChatClient.sendMessage(workspaceId, activeId, reply)
      .then(() => {
        dispatch({ type: 'SET_REPLY', val: '' });
        return loadThread(activeId);
      })
      .catch(() => { /* toast in a real app */ })
      .finally(() => dispatch({ type: 'SEND_BUSY', val: false }));
  }, [reply, activeId, workspaceId, loadThread]);

  // ── Create conversation ────────────────────────────────────────────────────

  const handleCreateConv = useCallback(() => {
    if (!newSubject.trim()) return;
    dispatch({ type: 'SEND_BUSY', val: true });
    internalChatClient.createConversation(workspaceId, { type: newType, subject: newSubject })
      .then((res) => {
        dispatch({ type: 'NEW_SUBJECT', val: '' });
        loadList();
        loadThread(res.id);
      })
      .catch(() => { /* toast */ })
      .finally(() => dispatch({ type: 'SEND_BUSY', val: false }));
  }, [newSubject, newType, workspaceId, loadList, loadThread]);

  // ── AI actions ─────────────────────────────────────────────────────────────

  const handleSummarize = useCallback(async () => {
    if (!activeId) return;
    dispatch({ type: 'AI_SUM_START' });
    const data = await internalChatClient.summarizeConversation(workspaceId, activeId).catch(() => null);
    dispatch({ type: 'AI_SUM_OK', data });
  }, [activeId, workspaceId]);

  const handleExtractActions = useCallback(async () => {
    if (!activeId) return;
    dispatch({ type: 'AI_ACTS_START' });
    const data = await internalChatClient.extractActionItems(workspaceId, activeId).catch(() => null);
    dispatch({ type: 'AI_ACTS_OK', data });
  }, [activeId, workspaceId]);

  const handleDismissAi = useCallback((which) => {
    if (which === 'summary') dispatch({ type: 'AI_SUM_OK', data: null });
    if (which === 'drafts') dispatch({ type: 'AI_ACTS_OK', data: null });
  }, []);

  // ── Computed helpers ───────────────────────────────────────────────────────

  const pinnedIds = new Set(pinnedMessages.map((p) => p.messageId));

  // ─────────────────────────────── Render ───────────────────────────────────

  if (unauthorized) {
    return (
      <PageLayout
        title={t('messenger.title', 'Messenger')}
        icon={<MessageSquare />}
        description={t('messenger.description', 'Internal team messaging and collaboration')}
      >
        <EmptyState
          icon={<Lock className="h-10 w-10 text-neutral-300" />}
          title={t('messenger.error.unauthorized', 'Access denied')}
          subtitle={t('messenger.error.unauthorizedDesc', "You don't have permission to access Messenger.")}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t('messenger.title', 'Messenger')}
      icon={<MessageSquare />}
      description={t('messenger.description', 'Internal team messaging and collaboration')}
    >
      <AsyncBoundary loading={listLoading} error={listError} onRetry={loadList}>
        <div className="flex h-[calc(100vh-160px)] gap-0 mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">

          {/* ── Conversation list ──────────────────────────────────────────── */}
          <aside
            className="w-72 flex flex-col border-r border-neutral-100 bg-neutral-50/50 shrink-0"
            aria-label={t('messenger.panel.conversations', 'Conversations')}
          >
            <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-neutral-700">
                {t('messenger.panel.conversations', 'Conversations')}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                id="new-conversation-btn"
                onClick={() => dispatch({ type: 'SHOW_NEW' })}
                aria-label={t('messenger.action.newConversation', 'New conversation')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5" role="list">
              {conversations.length === 0 ? (
                <div className="p-6 text-center" role="listitem">
                  <MessageSquare className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400 italic">
                    {t('messenger.empty.conversations', 'No conversations yet')}
                  </p>
                </div>
              ) : (
                conversations.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <div
                      key={c.id}
                      role="listitem"
                    >
                      <Button unstyled type="button"
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all ${
                          isActive
                            ? 'bg-indigo-50 ring-1 ring-indigo-200'
                            : 'hover:bg-white hover:shadow-xs'
                        }`}
                        onClick={() => loadThread(c.id)}
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={`${c.subject}, ${c.type}`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-md ${isActive ? 'bg-indigo-100' : 'bg-neutral-100'}`}>
                          <TypeIcon type={c.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="font-medium text-sm text-neutral-900 truncate pr-2">
                              {c.subject}
                            </span>
                            <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                              {smartDate(c.lastMessageAt || c.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-neutral-500">
                              {getTypeMeta(t)[c.type]?.label ?? c.type}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 text-indigo-400 mt-1 shrink-0" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Thread area ────────────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden" aria-label={t('messenger.panel.thread', 'Message thread')}>
            {showNewConv ? (
              /* New conversation form */
              <div className="p-8 max-w-reading mx-auto mt-8">
                <h2 className="text-lg font-semibold text-neutral-900 mb-6">
                  {t('messenger.newConversation.title', 'New Conversation')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-conv-type" className="block text-sm font-medium text-neutral-700 mb-1.5">
                      {t('messenger.newConversation.type', 'Type')}
                    </label>
                    <select
                      id="new-conv-type"
                      className="input"
                      value={newType}
                      onChange={(e) => dispatch({ type: 'NEW_TYPE', val: e.target.value })}
                    >
                      {Object.entries(getTypeMeta(t))
                        .filter(([k]) => k !== 'SUPPORT')
                        .map(([k, m]) => (
                          <option key={k} value={k}>{m.label}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-conv-subject" className="block text-sm font-medium text-neutral-700 mb-1.5">
                      {t('messenger.newConversation.subject', 'Subject')}
                    </label>
                    <input
                      id="new-conv-subject"
                      type="text"
                      className="input"
                      value={newSubject}
                      onChange={(e) => dispatch({ type: 'NEW_SUBJECT', val: e.target.value })}
                      placeholder={t('messenger.newConversation.placeholder', 'e.g. Q3 Planning')}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateConv(); }}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      id="start-conversation-btn"
                      onClick={handleCreateConv}
                      disabled={sendBusy || !newSubject.trim()}
                    >
                      {sendBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('messenger.newConversation.start', 'Start Conversation')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => dispatch({ type: 'HIDE_NEW' })}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : !activeId && !threadLoading ? (
              /* No conversation selected */
              <EmptyState
                icon={<MessageSquare className="h-10 w-10 text-neutral-200" />}
                title={t('messenger.empty.select', 'No conversation selected')}
                subtitle={t('messenger.empty.selectDesc', 'Select a conversation from the list or start a new one.')}
                action={
                  <Button id="empty-new-conv-btn" size="sm" onClick={() => dispatch({ type: 'SHOW_NEW' })}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('messenger.action.newConversation', 'New conversation')}
                  </Button>
                }
              />
            ) : threadLoading ? (
              /* Thread loading skeleton */
              <div className="flex-1 flex items-center justify-center" aria-live="polite" aria-label={t('common.loading', 'Loading…')}>
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              </div>
            ) : (
              /* Thread */
              <>
                {/* Thread header */}
                <header className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-white z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <TypeIcon type={thread?.type} className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900">{thread?.subject}</h2>
                      <div className="text-xs text-neutral-500 flex items-center gap-2">
                        <span>{getTypeMeta(t)[thread?.type]?.label ?? thread?.type}</span>
                        <span>·</span>
                        <span>{participants.length} {t('messenger.members', 'members')}</span>
                        <span>·</span>
                        <span>{t('common.created', 'Created')} {smartDate(thread?.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* AI Summarize */}
                    <Button
                      size="sm"
                      variant="ghost"
                      id="summarize-btn"
                      onClick={handleSummarize}
                      disabled={aiSummaryLoading}
                      aria-label={t('messenger.action.summarize', 'Summarize conversation')}
                      title={t('messenger.action.summarize', 'Summarize conversation')}
                    >
                      {aiSummaryLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Sparkles className="h-4 w-4 text-indigo-500" />}
                    </Button>

                    {/* Extract Actions */}
                    <Button
                      size="sm"
                      variant="ghost"
                      id="extract-actions-btn"
                      onClick={handleExtractActions}
                      disabled={aiDraftsLoading}
                      aria-label={t('messenger.action.extractActions', 'Extract action items')}
                      title={t('messenger.action.extractActions', 'Extract action items')}
                    >
                      {aiDraftsLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckSquare className="h-4 w-4 text-indigo-500" />}
                    </Button>

                    {/* Participants toggle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      id="toggle-participants-btn"
                      onClick={() => dispatch({ type: 'TOGGLE_PARTS' })}
                      aria-label={t('messenger.action.participants', 'Show participants')}
                      aria-expanded={showParticipants}
                      title={t('messenger.action.participants', 'Show participants')}
                    >
                      <Users className="h-4 w-4 text-neutral-500" />
                    </Button>
                  </div>
                </header>

                {/* Pinned messages banner */}
                {pinnedMessages.length > 0 && (
                  <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 truncate">
                      <span className="font-medium">{t('messenger.pinned', 'Pinned')}: </span>
                      {pinnedMessages.map((p, i) => {
                        const m = messages.find((msg) => msg.id === p.messageId);
                        return m ? (
                          <span key={p.id || p.messageId} className="truncate">
                            {m.body?.substring(0, 60)}{m.body?.length > 60 ? '…' : ''}
                            {i < pinnedMessages.length - 1 ? ' · ' : ''}
                          </span>
                        ) : null;
                      })}
                    </p>
                  </div>
                )}

                {/* AI panel */}
                <AiPanel
                  summary={aiSummary}
                  drafts={aiDrafts}
                  onDismiss={handleDismissAi}
                />

                {/* Message list */}
                <div
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-neutral-50/40"
                  role="log"
                  aria-live="polite"
                  aria-label={t('messenger.panel.messages', 'Messages')}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <MessageSquare className="h-10 w-10 text-neutral-200 mb-3" />
                      <p className="text-sm text-neutral-400 italic">
                        {t('messenger.empty.messages', 'No messages yet. Start the conversation!')}
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        workspaceId={workspaceId}
                        isPinned={pinnedIds.has(m.id)}
                        onReacted={() => loadThread(activeId)}
                      />
                    ))
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Message composer */}
                <div className="px-4 py-3 border-t border-neutral-100 bg-white">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={replyRef}
                        id="message-composer"
                        rows={1}
                        className="input resize-none py-2.5 pr-10 min-h-10 max-h-40"
                        placeholder={t('messenger.composer.placeholder', 'Type a message… Use /task or /decision to create a work item')}
                        value={reply}
                        onChange={(e) => {
                          dispatch({ type: 'SET_REPLY', val: e.target.value });
                          // Auto-grow
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={sendBusy}
                        aria-label={t('messenger.composer.label', 'Message input')}
                      />

                    </div>
                    <Button
                      id="send-message-btn"
                      onClick={handleSend}
                      disabled={sendBusy || !reply.trim()}
                      aria-label={t('messenger.action.send', 'Send message')}
                    >
                      {sendBusy
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1.5">
                    {t('messenger.composer.hint', 'Enter to send · Shift+Enter for new line · /task title to create a task')}
                  </p>
                </div>
              </>
            )}
          </main>

          {/* ── Participants panel ─────────────────────────────────────────── */}
          {showParticipants && activeId && (
            <aside
              className="w-64 flex flex-col border-l border-neutral-100 bg-white shrink-0"
              aria-label={t('messenger.panel.participants', 'Participants')}
            >
              <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-neutral-700">
                  {t('messenger.panel.participants', 'Participants')}
                </h3>
                <Button unstyled type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_PARTS' })}
                  aria-label={t('common.close', 'Close')}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2" role="list" aria-label={t('messenger.panel.memberList', 'Member list')}>
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic py-4 text-center" role="listitem">
                    {t('messenger.empty.participants', 'No participants yet')}
                  </p>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} role="listitem" className="flex items-center gap-2.5 py-1">
                      <Avatar name={p.userId} size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{p.userId}</p>
                        <p className="text-xs text-neutral-400">{p.role}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-neutral-100">
                <Select
                  value=""
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) {
                      internalChatClient.addParticipant(workspaceId, activeId, userId)
                        .then(() => loadThread(activeId))
                        .catch(() => { /* toast */ });
                    }
                  }}
                >
                  <option value="" disabled>{t('messenger.action.addParticipant', 'Add member')}</option>
                  {users.filter(u => !participants.some(p => p.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </Select>
              </div>
            </aside>
          )}
        </div>
      </AsyncBoundary>
    </PageLayout>
  );
}
