import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Headset } from 'lucide-react';
import { Button } from '@/components/works/button';
import { Badge } from '@/components/works/atoms/badge';
import { portalChatClient, chatStatusTone, chatStatusLabel } from '@/lib/supportChat';

// Customer chat support widget (iteration 20, Cap N). A self-contained launcher + panel for the
// customer portal: the customer types, the backend's AI tier-1 auto-responder replies, and the
// thread escalates to a human agent when AI is off/over-budget or the customer asks for a person.
// Tokens only (RB-30 §1/§2), all five states covered, keyboard-operable (Enter to send, focus moves
// to the input when the panel opens). The integrator mounts this inside CustomerPortal.jsx.
//
// Props:
//   token        — the customer portal session token (threaded through like the rest of the portal)
//   workspaceId  — the serving workspace (for symmetry / future use; the token already scopes it)
//   accountId    — optional customer account id
//   customerName — optional display name attached to the first message
//
// Persistence: the active conversation id is stored in localStorage under the key below so a
// returning customer can resume their thread without losing agent replies that arrived while the
// widget was unmounted.
const STORAGE_KEY = 'bsmart_chat_convo_id';
const POLL_INTERVAL_MS = 8000;

export function SupportChatWidget({ token, workspaceId, accountId, customerName }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const client = portalChatClient(token);
  const inputRef = useRef(null);
  const listEndRef = useRef(null);
  const pollRef = useRef(null);

  const escalated = conversation?.status === 'ESCALATED';

  // Move focus into the input when the panel opens (keyboard / a11y).
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && listEndRef.current) listEndRef.current.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  const apply = useCallback((res) => {
    setConversation(res.conversation);
    setMessages(Array.isArray(res.messages) ? res.messages : []);
    // Persist the conversation id so a returning customer can resume this thread.
    if (res.conversation?.id) {
      try { localStorage.setItem(STORAGE_KEY, res.conversation.id); } catch { /* storage unavailable */ }
    }
  }, []);

  // On mount, attempt to resume an existing conversation from localStorage. This ensures that
  // agent replies received while the widget was unmounted (e.g. the customer navigated away) are
  // loaded when they return. Only runs once per mount.
  useEffect(() => {
    let storedId;
    try { storedId = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    if (!storedId || !token) return;
    client.getConversation(storedId)
      .then(apply)
      .catch(() => {
        // Stale id (conversation deleted / different workspace token) — clear it silently.
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // While the panel is open and a conversation exists, poll every 8 s for agent replies.
  // The poll is cleared on close or unmount so it does not keep running in the background.
  useEffect(() => {
    if (!open || !conversation?.id) {
      clearInterval(pollRef.current);
      return undefined;
    }
    const convoId = conversation.id;
    pollRef.current = setInterval(() => {
      client.getConversation(convoId)
        .then(apply)
        .catch(() => { /* best-effort; errors are silent so the UX is not disrupted */ });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  // client is re-created from `token` each render; exclude it to avoid restart on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversation?.id, apply]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    // Optimistically show the customer's own bubble while the round-trip runs.
    const optimistic = { id: `local-${Date.now()}`, senderType: 'CUSTOMER', body: text, optimistic: true };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const res = conversation
        ? await client.postMessage(conversation.id, text)
        : await client.start(text, { customerName, subject: null });
      apply(res);
    } catch (err) {
      setError(err.message || 'Could not send your message. Please try again.');
      // Drop the optimistic bubble so the user can retry cleanly.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }, [draft, busy, conversation, client, apply, customerName]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const askForHuman = () => {
    setDraft('I would like to talk to a human agent.');
    if (inputRef.current) inputRef.current.focus();
  };

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-modal" data-workspace={workspaceId} data-account={accountId}>
        <Button type="button" size="lg" leftIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setOpen(true)} aria-label="Open support chat">
          Chat with support
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-modal flex h-[80vh] w-96 max-w-[calc(100vw-3rem)] flex-col rounded-xl border border-neutral-200 bg-white shadow-xl"
      role="dialog" aria-label="Support chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl bg-brand-navy px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Headset className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">Support</span>
          {conversation && (
            <Badge tone={chatStatusTone(conversation.status)}>{chatStatusLabel(conversation.status)}</Badge>
          )}
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat"
          className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Escalation banner */}
      {escalated && (
        <div className="flex items-center gap-2 border-b border-semantic-warning-surface bg-semantic-warning-surface px-4 py-2 text-xs font-medium text-semantic-warning">
          <Headset className="h-3.5 w-3.5" aria-hidden="true" />
          A support agent has been notified and will join this chat shortly.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-neutral-700">How can we help?</p>
            <p className="mt-1 text-xs text-neutral-600">
              Ask about billing, outages, meter readings or account access. Our assistant answers
              instantly and brings in a human when you need one.
            </p>
          </div>
        )}
        {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
        {busy && (
          <div className="flex justify-start">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-neutral-100" aria-label="Assistant is typing" />
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-md bg-semantic-danger-surface px-3 py-2 text-xs text-semantic-danger" role="alert">
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-neutral-200 p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="support-chat-input" className="sr-only">Type your message</label>
          <textarea
            id="support-chat-input" ref={inputRef} rows={1} value={draft}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Type your message…"
            className="max-h-24 flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <Button type="button" size="icon" onClick={send} loading={busy} disabled={!draft.trim()}
            aria-label="Send message">
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {!escalated && (
          <button type="button" onClick={askForHuman}
            className="mt-2 text-xs font-medium text-brand-navy-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            Talk to a human
          </button>
        )}
      </div>
    </div>
  );
}

// A single chat bubble — customer right, AI/agent left, with the author icon.
function ChatBubble({ message }) {
  const isCustomer = message.senderType === 'CUSTOMER';
  const isAi = message.senderType === 'AI';
  const Icon = isAi ? Bot : isCustomer ? User : Headset;
  const author = isAi ? 'Assistant' : isCustomer ? 'You' : 'Agent';
  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isCustomer ? 'items-end' : 'items-start'}`}>
        {!isCustomer && (
          <div className="mb-0.5 flex items-center gap-1 text-xs font-medium text-neutral-600">
            <Icon className="h-3 w-3" aria-hidden="true" />
            {author}
          </div>
        )}
        <div
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
            isCustomer
              ? 'bg-brand-navy text-white'
              : 'bg-neutral-100 text-neutral-900'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

export default SupportChatWidget;
