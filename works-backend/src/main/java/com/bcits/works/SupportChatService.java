package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Customer chat support (iteration 20, Cap N): real-time portal chat with an AI tier-1
 * auto-responder and human escalation. A conversation is opened from the portal; each customer turn
 * runs through {@link #autoRespond} which builds a deterministic tier-1 draft from a small FAQ /
 * intent classifier, then routes through {@link AiControlPlaneService#invoke} (capability
 * {@code "support_chat"}) so scope / budget / cache / audit and the deterministic fallback apply
 * once, centrally (RB-40 §2).
 *
 * <p>Fallback contract (RB-40 §2): when AI is off, over budget, or unavailable the control plane
 * returns a fallback outcome — the conversation is escalated to a human agent with a canned holding
 * reply. When AI is on, the deterministic answer is posted as the tier-1 reply and the conversation
 * is marked {@code AI_HANDLED}, unless the customer explicitly asks for a human (then it escalates).
 *
 * <p>Every read and mutation is workspace-scoped (RB-40 §1) — a conversation that does not belong to
 * the caller's workspace is reported as not-found. The agent-side actions are RBAC-gated by the
 * caller (controller) and audited as events (RB-10 §3). The FAQ / intent helpers are pure and static
 * so they can be unit-tested without a database and double as the deterministic tier-1 logic.
 */
@Service
public class SupportChatService {

    // Conversation lifecycle.
    static final String OPEN = "OPEN";
    static final String AI_HANDLED = "AI_HANDLED";
    static final String ESCALATED = "ESCALATED";
    static final String RESOLVED = "RESOLVED";

    // Message authorship.
    static final String CUSTOMER = "CUSTOMER";
    static final String AI = "AI";
    static final String AGENT = "AGENT";

    // The canned acknowledgement served (and the conversation escalated) when AI cannot answer.
    static final String HOLDING_REPLY =
        "Thanks for reaching out. I'm connecting you with a support agent who will reply shortly.";

    // A customer explicitly asking for a person escalates even when the AI answered.
    private static final Pattern HUMAN_REQUEST =
        Pattern.compile("\\b(human|agent|representative|talk to someone|real person|speak to someone)\\b",
            Pattern.CASE_INSENSITIVE);

    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final AiControlPlaneService controlPlane;
    private final EventService events;
    private final RbacService rbac;
    private final NotificationBatchService notificationBatch;
    private final CustomerAttributionPiiService attributionPii;

    public SupportChatService(ChatConversationRepository conversations, ChatMessageRepository messages,
                              AiControlPlaneService controlPlane, EventService events,
                              RbacService rbac, NotificationBatchService notificationBatch,
                              CustomerAttributionPiiService attributionPii) {
        this.conversations = conversations;
        this.messages = messages;
        this.controlPlane = controlPlane;
        this.events = events;
        this.rbac = rbac;
        this.notificationBatch = notificationBatch;
        this.attributionPii = attributionPii;
    }

    // ── Result envelope ──────────────────────────────────────────────────────────
    // The conversation plus the turns appended in this round (the AI/agent reply and any
    // escalation message), so the portal can render the new bubbles without a re-fetch.

    public record ChatResult(ChatConversation conversation, List<ChatMessage> newMessages) { }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Customer (portal) side
    // ══════════════════════════════════════════════════════════════════════════════

    /** Open a new conversation with the customer's first message, then run the tier-1 auto-response. */
    @Transactional
    public ChatResult startConversation(String workspaceId, String accountId, String customerId,
                                        String customerName, String subject, String firstMessage) {
        require(firstMessage, "MESSAGE_REQUIRED", "A message is required to start a chat.", "firstMessage");
        OffsetDateTime now = OffsetDateTime.now();
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-" + shortId());
        convo.setWorkspaceId(workspaceId);
        convo.setAccountId(accountId);
        convo.setCustomerName(customerName);
        // Tokenize the denormalised customer name into the vault + store the token; the agent inbox
        // resolves it at render and a crypto-shred renders "[erased]" (RB-40 §3 rule 3). The legacy
        // customer_name column stays authoritative until the deferred CONTRACT migration drops it.
        convo.setCustomerSubjectToken(attributionPii.ensureVaulted(workspaceId, null, customerName));
        convo.setSubject(subject == null || subject.isBlank() ? snippet(firstMessage) : subject.trim());
        convo.setStatus(OPEN);
        convo.setCreatedAt(now);
        convo.setUpdatedAt(now);
        convo.setLastMessageAt(now);
        conversations.save(convo);
        events.recordInWorkspace(workspaceId, convo.getId(), "CHAT_CONVERSATION_STARTED", customerId,
            Map.of("accountId", nv(accountId), "subject", nv(convo.getSubject())));

        List<ChatMessage> appended = new ArrayList<>();
        appended.add(append(convo, CUSTOMER, customerId, firstMessage, null));
        appended.addAll(autoRespond(convo, firstMessage, customerId));
        return new ChatResult(convo, appended);
    }

    /** Append a follow-up customer message to an existing conversation, then run the auto-response. */
    @Transactional
    public ChatResult postCustomerMessage(String workspaceId, String conversationId, String customerId, String body) {
        require(body, "MESSAGE_REQUIRED", "A message is required.", "body");
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        List<ChatMessage> appended = new ArrayList<>();
        appended.add(append(convo, CUSTOMER, customerId, body, null));
        // A resolved thread reopens when the customer writes again.
        if (RESOLVED.equals(convo.getStatus())) {
            convo.setStatus(OPEN);
        }
        // Skip AI auto-response when a human agent has already taken the thread — firing the AI
        // auto-responder on an escalated/agent-owned conversation wastes AI budget (RB-40 §2) and
        // creates confusing double-replies from two "senders".
        boolean alreadyEscalated = ESCALATED.equals(convo.getStatus());
        boolean agentAssigned = convo.getAssignedAgentId() != null;
        if (!alreadyEscalated && !agentAssigned) {
            appended.addAll(autoRespond(convo, body, customerId));
        }
        return new ChatResult(convo, appended);
    }

    /** Customer-facing read of a single conversation + its full transcript, workspace-scoped. */
    public ChatResult getConversation(String workspaceId, String conversationId) {
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        return new ChatResult(convo, messages.findByConversationIdOrderByCreatedAtAsc(convo.getId()));
    }

    /**
     * Tier-1 auto-response. Builds a deterministic FAQ answer from the customer's message and routes
     * it through the AI Control Plane. On fallback (AI off / over budget): post the canned holding
     * reply and escalate. On AI-on: post the answer ({@code AI_HANDLED}) — but if the customer asked
     * for a human, escalate instead. Returns only the turns appended in this round.
     */
    private List<ChatMessage> autoRespond(ChatConversation convo, String customerText, String customerId) {
        List<ChatMessage> appended = new ArrayList<>();
        String draft = faqAnswer(customerText);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            convo.getWorkspaceId(), customerId, "support_chat",
            "Support chat: " + nv(customerText), draft, null, true));

        if (out.fallback()) {
            // Fallback: deterministic acknowledgement + auto-escalate to a human (RB-40 §2).
            appended.add(append(convo, AI, null, HOLDING_REPLY, out.policyState()));
            escalate(convo, customerId, "ai_unavailable");
            return appended;
        }

        String answer = out.text() == null || out.text().isBlank() ? draft : out.text();
        appended.add(append(convo, AI, null, answer, aiMeta(out)));
        if (wantsHuman(customerText)) {
            escalate(convo, customerId, "customer_requested_human");
        } else if (!ESCALATED.equals(convo.getStatus())) {
            setStatus(convo, AI_HANDLED);
        }
        return appended;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Agent (internal, workspace member) side
    // ══════════════════════════════════════════════════════════════════════════════

    /** Agent inbox, optionally filtered by status. Workspace-scoped (RB-40 §1). */
    public List<ChatConversation> listConversations(String workspaceId, String statusFilter) {
        String status = nullIfBlank(statusFilter);
        return status == null
            ? conversations.findByWorkspaceIdOrderByLastMessageAtDesc(workspaceId)
            : conversations.findByWorkspaceIdAndStatusOrderByLastMessageAtDesc(workspaceId, status.toUpperCase(Locale.ROOT));
    }

    /** Agent read of a single conversation + its transcript, workspace-scoped. */
    public ChatResult getConversationForAgent(String workspaceId, String conversationId) {
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        return new ChatResult(convo, messages.findByConversationIdOrderByCreatedAtAsc(convo.getId()));
    }

    /** Claim a conversation: self-assign and move it into the ESCALATED (agent-owned) state. */
    @Transactional
    public ChatConversation assign(String workspaceId, String agentId, String conversationId) {
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        convo.setAssignedAgentId(agentId);
        if (!RESOLVED.equals(convo.getStatus())) {
            convo.setStatus(ESCALATED);
        }
        convo.setUpdatedAt(OffsetDateTime.now());
        conversations.save(convo);
        events.recordInWorkspace(workspaceId, convo.getId(), "CHAT_ASSIGNED", agentId,
            Map.of("agentId", agentId));
        return convo;
    }

    /** Agent replies to a conversation; the reply is an append-only AGENT turn. */
    @Transactional
    public ChatResult agentReply(String workspaceId, String agentId, String conversationId, String body) {
        require(body, "MESSAGE_REQUIRED", "A reply is required.", "body");
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        ChatMessage msg = append(convo, AGENT, agentId, body, null);
        // An agent reply implicitly takes ownership and moves a still-AI thread into ESCALATED.
        if (convo.getAssignedAgentId() == null) {
            convo.setAssignedAgentId(agentId);
        }
        if (!RESOLVED.equals(convo.getStatus())) {
            setStatus(convo, ESCALATED);
        }
        events.recordInWorkspace(workspaceId, convo.getId(), "CHAT_AGENT_REPLIED", agentId,
            Map.of("messageId", msg.getId()));
        return new ChatResult(convo, List.of(msg));
    }

    /** Resolve a conversation. Workspace-scoped + audited. */
    @Transactional
    public ChatConversation resolve(String workspaceId, String agentId, String conversationId) {
        ChatConversation convo = loadScoped(workspaceId, conversationId);
        convo.setStatus(RESOLVED);
        convo.setUpdatedAt(OffsetDateTime.now());
        conversations.save(convo);
        events.recordInWorkspace(workspaceId, convo.getId(), "CHAT_RESOLVED", agentId,
            Map.of("agentId", nv(agentId)));
        return convo;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure tier-1 FAQ / intent helpers — unit-testable, double as the deterministic answer
    // ══════════════════════════════════════════════════════════════════════════════

    /** Ordered intent → canned answer pairs. The first matching intent wins. */
    private static final List<Map.Entry<String[], String>> FAQ = List.of(
        Map.entry(new String[]{"bill", "billing", "invoice", "payment", "charge", "pay"},
            "For billing questions, open the portal and go to Billing > Statements to view or pay your "
            + "latest invoice. If a charge looks wrong, reply here and an agent will review it."),
        Map.entry(new String[]{"outage", "power cut", "no power", "blackout", "supply", "no electricity"},
            "We're sorry about the supply interruption. You can track outages and report a new one from "
            + "the portal under Outages. If it's an emergency, please call the 24x7 helpline."),
        Map.entry(new String[]{"meter", "reading", "consumption", "usage", "units"},
            "You can view your meter readings and consumption history in the portal under Reports > "
            + "Consumption. To submit a self-reading, use the 'Submit reading' action there."),
        Map.entry(new String[]{"password", "login", "sign in", "reset", "locked", "account access"},
            "To reset your password, use the 'Forgot password' link on the sign-in page. If your account "
            + "is locked, an agent can unlock it for you."),
        Map.entry(new String[]{"connection", "new connection", "apply", "transfer", "disconnect"},
            "Applications for new connections, transfers and disconnections are handled under Requests > "
            + "New request in the portal. Choose the matching request type to begin."),
        Map.entry(new String[]{"status", "track", "ticket", "request", "complaint"},
            "You can track every request and its SLA countdown under My requests in the portal. Share the "
            + "request ID here and I can help you find it.")
    );

    static final String FAQ_DEFAULT =
        "Thanks for your message. I can help with billing, outages, meter readings, account access and "
        + "connection requests. Could you share a little more detail, or ask for a human agent any time?";

    /** Deterministic tier-1 answer for a customer message — keyword intent match, default otherwise. */
    static String faqAnswer(String message) {
        String lower = nv(message).toLowerCase(Locale.ROOT);
        if (lower.isBlank()) {
            return FAQ_DEFAULT;
        }
        for (Map.Entry<String[], String> intent : FAQ) {
            if (containsAny(lower, intent.getKey())) {
                return intent.getValue();
            }
        }
        return FAQ_DEFAULT;
    }

    /** The classified intent key for a message (for routing / analytics), or "general". */
    static String classifyIntent(String message) {
        String lower = nv(message).toLowerCase(Locale.ROOT);
        for (Map.Entry<String[], String> intent : FAQ) {
            if (containsAny(lower, intent.getKey())) {
                return intent.getKey()[0];
            }
        }
        return "general";
    }

    /** Whether the customer explicitly asked to talk to a person. */
    static boolean wantsHuman(String message) {
        return message != null && HUMAN_REQUEST.matcher(message).find();
    }

    // ── internals ─────────────────────────────────────────────────────────────────

    private ChatMessage append(ChatConversation convo, String senderType, String senderId,
                               String body, String aiMeta) {
        OffsetDateTime now = OffsetDateTime.now();
        ChatMessage msg = new ChatMessage();
        msg.setId("MSG-" + shortId());
        msg.setWorkspaceId(convo.getWorkspaceId());
        msg.setConversationId(convo.getId());
        msg.setSenderType(senderType);
        msg.setSenderId(senderId);
        msg.setBody(body == null ? "" : body.trim());
        msg.setAiMeta(aiMeta);
        msg.setCreatedAt(now);
        messages.save(msg);
        convo.setLastMessageAt(now);
        convo.setUpdatedAt(now);
        conversations.save(convo);
        return msg;
    }

    private void escalate(ChatConversation convo, String actorId, String reason) {
        setStatus(convo, ESCALATED);
        events.recordInWorkspace(convo.getWorkspaceId(), convo.getId(), "CHAT_ESCALATED", actorId,
            Map.of("reason", nv(reason)));
        // Notify all workspace members who can handle customer service (RB-10 §2: RBAC in the
        // service layer). The notification batch window (5 min) deduplicates rapid-fire escalations
        // on the same conversation (e.g. AI fallback + customer also requesting human).
        String link = "/support/inbox/" + convo.getId();
        String subject = nv(convo.getSubject());
        String notifMessage = "Chat escalated: " + (subject.isBlank() ? convo.getId() : subject);
        List<String> recipients = rbac.getMembersWithPermission(convo.getWorkspaceId(), "work_service");
        for (String recipientId : recipients) {
            notificationBatch.createIfNotBatched(recipientId, "CHAT_ESCALATED", notifMessage, link);
        }
    }

    private void setStatus(ChatConversation convo, String status) {
        convo.setStatus(status);
        convo.setUpdatedAt(OffsetDateTime.now());
        conversations.save(convo);
    }

    /** Load a conversation, enforcing the workspace boundary — never reveal another tenant's chat. */
    private ChatConversation loadScoped(String workspaceId, String conversationId) {
        return conversations.findByWorkspaceIdAndId(workspaceId, conversationId)
            .orElseThrow(() -> ApiException.notFound("Conversation", conversationId));
    }

    private static String aiMeta(AiControlPlaneService.AiOutcome out) {
        String tier = out.tier() == null ? "NONE" : out.tier().name();
        return out.policyState() + ":" + tier + (out.cacheHit() ? ":cached" : "");
    }

    private static void require(String value, String code, String message, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(code, message, field);
        }
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String n : needles) {
            if (haystack.contains(n)) {
                return true;
            }
        }
        return false;
    }

    private static String snippet(String text) {
        String t = nv(text).trim();
        return t.length() > 80 ? t.substring(0, 80) + "…" : t;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static String nv(Object o) {
        return o == null ? "" : o.toString();
    }

    /** Customer-shaped projection of a conversation (no internal agent id leaked to the portal). */
    static Map<String, Object> customerView(ChatConversation c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("subject", c.getSubject());
        m.put("status", c.getStatus());
        m.put("escalated", ESCALATED.equals(c.getStatus()));
        m.put("createdAt", c.getCreatedAt());
        m.put("lastMessageAt", c.getLastMessageAt());
        return m;
    }

    /** Customer-shaped projection of a message (no internal sender id leaked to the portal). */
    static Map<String, Object> customerMessageView(ChatMessage msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", msg.getId());
        m.put("senderType", msg.getSenderType());
        m.put("body", msg.getBody());
        m.put("aiMeta", msg.getAiMeta());
        m.put("createdAt", msg.getCreatedAt());
        return m;
    }
}
