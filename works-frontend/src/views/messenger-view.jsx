import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, MessageSquare, Plus, FileText, AlertCircle, Users, Hash } from 'lucide-react';
import { Button } from '@/components/works/button';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { PageLayout } from '@/components/works/templates/page-layout';
import { smartDate } from '@/lib/format';
import { internalChatClient } from '@/lib/internalChat';
import { connectRealtime } from '@/lib/realtime';

export default function MessengerView({ workspaceId }) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [newType, setNewType] = useState('DIRECT');
  const [newSubject, setNewSubject] = useState('');
  const replyRef = useRef(null);

  const loadList = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    internalChatClient.listConversations(workspaceId)
      .then((rows) => setConversations(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message || 'Could not load conversations.'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadList(); }, [loadList]);

  const loadThread = useCallback((id) => {
    if (!workspaceId) return;
    setBusy(true);
    internalChatClient.getConversation(workspaceId, id)
      .then((res) => {
        setThread(res.conversation);
        setMessages(Array.isArray(res.messages) ? res.messages : []);
        setActiveId(id);
        setShowNewConv(false);
        setTimeout(() => {
          if (replyRef.current) replyRef.current.focus();
        }, 50);
      })
      .catch((err) => {
        console.error(err);
        setActiveId(null);
        setThread(null);
      })
      .finally(() => setBusy(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;
    const dispose = connectRealtime(workspaceId, {
      event: (data) => {
        if (typeof data?.eventType === 'string' && data.eventType.startsWith('CHAT_')) {
          loadList();
          if (activeId && data.eventType === 'CHAT_MESSAGE_RECEIVED' && data.payload?.conversationId === activeId) {
            loadThread(activeId);
          }
        }
      },
    });
    return dispose;
  }, [workspaceId, loadList, activeId, loadThread]);

  const handleSend = () => {
    if (!reply.trim() || !activeId) return;
    setBusy(true);
    internalChatClient.sendMessage(workspaceId, activeId, reply)
      .then(() => {
        setReply('');
        return loadThread(activeId);
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || 'Could not send message.');
      })
      .finally(() => setBusy(false));
  };

  const handleCreateConv = () => {
    if (!newSubject.trim()) return;
    setBusy(true);
    internalChatClient.createConversation(workspaceId, { type: newType, subject: newSubject })
      .then((res) => {
        loadList();
        loadThread(res.id);
        setNewSubject('');
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || 'Could not create conversation.');
      })
      .finally(() => setBusy(false));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DIRECT': return <Users className="h-4 w-4" />;
      case 'GROUP': return <Users className="h-4 w-4" />;
      case 'PROJECT': return <Hash className="h-4 w-4" />;
      case 'INCIDENT': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <PageLayout
      title="Messenger"
      icon={<MessageSquare />}
      description="Internal team messaging and collaboration"
    >
      <AsyncBoundary loading={loading} error={error} onRetry={loadList}>
        <div className="flex h-[calc(100vh-160px)] gap-4 mt-4">
          <div className="w-1/3 flex flex-col border rounded-lg bg-white overflow-hidden">
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="font-medium text-sm text-slate-700">Conversations</h2>
              <Button size="sm" onClick={() => setShowNewConv(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 italic">No conversations yet</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadThread(c.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadThread(c.id); }}
                    className={`w-full text-left p-3 rounded flex items-start gap-3 transition-colors ${activeId === c.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <div className="mt-0.5 text-slate-500">
                      {getTypeIcon(c.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium text-sm text-slate-900 truncate pr-2">{c.subject}</span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{smartDate(c.lastMessageAt || c.createdAt)}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {c.type}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="w-2/3 flex flex-col border rounded-lg bg-white overflow-hidden">
            {showNewConv ? (
              <div className="p-6">
                <h2 className="text-lg font-medium mb-4">New Conversation</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label htmlFor="new-conv-type" className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      id="new-conv-type"
                      className="w-full border-slate-300 rounded-md sm:text-sm"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <option value="DIRECT">Direct Message</option>
                      <option value="GROUP">Group Chat</option>
                      <option value="PROJECT">Project Discussion</option>
                      <option value="INCIDENT">Incident Room</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-conv-subject" className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      id="new-conv-subject"
                      type="text"
                      className="w-full border-slate-300 rounded-md sm:text-sm"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Q3 Planning"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateConv();
                      }}
                    />
                  </div>
                  <Button onClick={handleCreateConv} disabled={busy || !newSubject.trim()}>Start Conversation</Button>
                </div>
              </div>
            ) : !activeId ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8 text-slate-300" />}
                title="No conversation selected"
                description="Select a conversation from the sidebar or start a new one."
              />
            ) : (
              <>
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded">
                      {getTypeIcon(thread?.type)}
                    </div>
                    <div>
                      <h2 className="font-medium text-slate-900">{thread?.subject}</h2>
                      <div className="text-xs text-slate-500">
                        {thread?.type} • Created {smartDate(thread?.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {messages.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 italic mt-8">No messages yet.</div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="bg-white border rounded p-3">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-medium text-sm text-slate-700">
                            {m.senderType === 'SYSTEM' ? 'System' : 'Agent'}
                          </span>
                          <span className="text-xs text-slate-400" title={m.createdAt}>
                            {smartDate(m.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</div>
                        {m.artifactType && (
                          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm flex items-start gap-2">
                            <FileText className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-indigo-900 mb-0.5">
                                Generated {m.artifactType === 'TASK' ? 'Task' : 'Decision'} Artifact
                              </div>
                              <div className="text-indigo-700 text-xs font-mono bg-white/50 px-1 py-0.5 rounded border border-indigo-100/50 inline-block">
                                ref: {m.artifactRef.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <input
                      ref={replyRef}
                      type="text"
                      className="flex-1 rounded-md border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-50"
                      placeholder="Type a message..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSend();
                      }}
                      disabled={busy}
                    />
                    <Button onClick={handleSend} disabled={busy || !reply.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </AsyncBoundary>
    </PageLayout>
  );
}
