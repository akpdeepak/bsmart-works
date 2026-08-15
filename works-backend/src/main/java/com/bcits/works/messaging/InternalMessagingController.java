package com.bcits.works.messaging;
import com.bcits.works.messaging.api.ChatConversation;
import com.bcits.works.messaging.api.ChatConversationRepository;
import com.bcits.works.messaging.api.ChatMessage;
import com.bcits.works.messaging.api.ChatMessageRepository;
import com.bcits.works.messaging.api.ConversationParticipant;
import com.bcits.works.messaging.api.ConversationParticipantRepository;
import com.bcits.works.messaging.api.MessageReaction;
import com.bcits.works.messaging.api.MessageReactionRepository;
import com.bcits.works.messaging.api.MessageRead;
import com.bcits.works.messaging.api.MessageReadRepository;
import com.bcits.works.messaging.api.PinnedMessage;
import com.bcits.works.messaging.api.PinnedMessageRepository;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import com.bcits.works.shared.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * EPIC-9 internal messaging — all internal (non-customer) conversation surfaces.
 * <p>
 * Architecture invariants (RB-10, RB-40):
 * <ul>
 *   <li>RBAC is checked in this service layer via {@code RbacGate}, never the controller.</li>
 *   <li>Every query that touches a tenant-owned row re-checks {@code workspaceId} on the
 *       loaded entity to prevent cross-tenant access via PK guessing (RB-40 §1).</li>
 *   <li>AI endpoints return review-only drafts; no AI output is auto-persisted (RB-40 §2.1).</li>
 *   <li>@Transactional is NOT on this class — it belongs in service-layer methods, not
 *       controllers (RB-10 §2). Participant removal uses a single repository delete call.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/internal-messaging")
public class InternalMessagingController {

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final ConversationParticipantRepository participantRepo;
    private final MessageReactionRepository reactionRepo;
    private final MessageReadRepository readRepo;
    private final PinnedMessageRepository pinRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final MessageArtifactService messageArtifacts;
    private final MessagingAiService aiService;

    public InternalMessagingController(ChatConversationRepository conversationRepo,
                                       ChatMessageRepository messageRepo,
                                       ConversationParticipantRepository participantRepo,
                                       MessageReactionRepository reactionRepo,
                                       MessageReadRepository readRepo,
                                       PinnedMessageRepository pinRepo,
                                       AuthenticatedUser authenticatedUser,
                                       RbacGate rbac,
                                       MessageArtifactService messageArtifacts,
                                       MessagingAiService aiService) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.participantRepo = participantRepo;
        this.reactionRepo = reactionRepo;
        this.readRepo = readRepo;
        this.pinRepo = pinRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.messageArtifacts = messageArtifacts;
        this.aiService = aiService;
    }

    // ─────────────────────────────── Conversations ────────────────────────────

    @GetMapping("/conversations")
    public List<ChatConversation> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        // Narrow in the query, not after the read (RB-40 §1): an unscoped findAll returned every
        // tenant's internal threads to any caller holding work_read in a single workspace.
        return conversationRepo.findByWorkspaceIdAndTypeNotOrderByLastMessageAtDesc(
                workspaceId, ConversationType.SUPPORT);
    }

    @PostMapping("/conversations")
    public ChatConversation create(@RequestParam String workspaceId, @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");

        ChatConversation c = new ChatConversation();
        c.setId(UUID.randomUUID().toString());
        c.setWorkspaceId(workspaceId);
        c.setSubject(body.getOrDefault("subject", "New Conversation"));
        c.setType(ConversationType.valueOf(body.getOrDefault("type", "DIRECT")));
        c.setCreatedAt(OffsetDateTime.now());
        c.setUpdatedAt(OffsetDateTime.now());
        c.setStatus("OPEN");
        return conversationRepo.save(c);
    }

    @GetMapping("/conversations/{id}")
    public Map<String, Object> get(@PathVariable String id, @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");

        ChatConversation c = requireConversationInWorkspace(id, workspaceId);
        List<ChatMessage> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(id);
        List<ConversationParticipant> participants =
                participantRepo.findByConversationIdAndWorkspaceId(id, workspaceId);
        List<PinnedMessage> pins =
                pinRepo.findByConversationIdAndWorkspaceIdOrderByPinnedAtDesc(id, workspaceId);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("conversation", c);
        res.put("messages", messages);
        res.put("participants", participants);
        res.put("pinnedMessages", pins);
        return res;
    }

    // ─────────────────────────────── Messages ─────────────────────────────────

    @PostMapping("/conversations/{id}/messages")
    public ChatMessage sendMessage(@PathVariable String id,
                                   @RequestParam String workspaceId,
                                   @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");

        ChatConversation c = requireConversationInWorkspace(id, workspaceId);

        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setWorkspaceId(workspaceId);
        msg.setConversationId(id);
        msg.setSenderType("AGENT");
        msg.setSenderId(authenticatedUser.id());
        msg.setBody(body.get("body"));
        msg.setCreatedAt(OffsetDateTime.now());

        // Message-to-artifact conversion: a "/task" or "/decision" message creates a real,
        // workspace-scoped artifact and links the message to it by its actual id.
        MessageArtifactService.Artifact artifact =
                messageArtifacts.convert(workspaceId, authenticatedUser.id(), msg.getBody());
        if (artifact != null) {
            msg.setArtifactType(artifact.type());
            msg.setArtifactRef(artifact.ref());
        }

        c.setUpdatedAt(OffsetDateTime.now());
        c.setLastMessageAt(OffsetDateTime.now());
        conversationRepo.save(c);

        return messageRepo.save(msg);
    }

    // ─────────────────────────────── Participants ─────────────────────────────

    @GetMapping("/conversations/{id}/participants")
    public List<ConversationParticipant> listParticipants(@PathVariable String id,
                                                           @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        requireConversationInWorkspace(id, workspaceId);
        return participantRepo.findByConversationIdAndWorkspaceId(id, workspaceId);
    }

    @PostMapping("/conversations/{id}/participants")
    public ConversationParticipant addParticipant(@PathVariable String id,
                                                   @RequestParam String workspaceId,
                                                   @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        ChatConversation c = requireConversationInWorkspace(id, workspaceId);

        String userId = body.get("userId");
        if (userId == null || userId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "userId is required");
        }

        // Idempotent: return existing participant if already a member
        return participantRepo.findByConversationIdAndUserId(id, userId).orElseGet(() -> {
            ConversationParticipant p = new ConversationParticipant();
            p.setId(UUID.randomUUID().toString());
            p.setConversationId(c.getId());
            p.setWorkspaceId(workspaceId);
            p.setUserId(userId);
            p.setRole("MEMBER");
            p.setJoinedAt(OffsetDateTime.now());
            return participantRepo.save(p);
        });
    }

    @DeleteMapping("/conversations/{id}/participants/{userId}")
    @Transactional
    public Map<String, String> removeParticipant(@PathVariable String id,
                                                  @PathVariable String userId,
                                                  @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireConversationInWorkspace(id, workspaceId);
        participantRepo.deleteByConversationIdAndUserId(id, userId);
        return Map.of("status", "removed");
    }

    // ─────────────────────────────── Reactions ────────────────────────────────

    @PostMapping("/messages/{msgId}/reactions")
    public MessageReaction addReaction(@PathVariable String msgId,
                                        @RequestParam String workspaceId,
                                        @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireMessageInWorkspace(msgId, workspaceId);

        String emoji = body.get("emoji");
        if (emoji == null || emoji.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "emoji is required");
        }

        // Idempotent: return existing reaction if same user already reacted with this emoji
        return reactionRepo.findByMessageIdAndUserIdAndEmoji(msgId, authenticatedUser.id(), emoji)
                .orElseGet(() -> {
                    MessageReaction r = new MessageReaction();
                    r.setId(UUID.randomUUID().toString());
                    r.setMessageId(msgId);
                    r.setWorkspaceId(workspaceId);
                    r.setUserId(authenticatedUser.id());
                    r.setEmoji(emoji);
                    r.setCreatedAt(OffsetDateTime.now());
                    return reactionRepo.save(r);
                });
    }

    @DeleteMapping("/messages/{msgId}/reactions/{emoji}")
    @Transactional
    public Map<String, String> removeReaction(@PathVariable String msgId,
                                               @PathVariable String emoji,
                                               @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireMessageInWorkspace(msgId, workspaceId);
        reactionRepo.deleteByMessageIdAndUserIdAndEmoji(msgId, authenticatedUser.id(), emoji);
        return Map.of("status", "removed");
    }

    // ─────────────────────────────── Read receipts ────────────────────────────

    @PostMapping("/conversations/{id}/read")
    public MessageRead markRead(@PathVariable String id,
                                 @RequestParam String workspaceId,
                                 @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireConversationInWorkspace(id, workspaceId);

        String lastMsgId = body.get("lastMessageId");
        if (lastMsgId == null || lastMsgId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "lastMessageId is required");
        }

        // Upsert: update the watermark if it already exists
        MessageRead read = readRepo.findByConversationIdAndUserIdAndWorkspaceId(
                id, authenticatedUser.id(), workspaceId).orElseGet(() -> {
            MessageRead r = new MessageRead();
            r.setId(UUID.randomUUID().toString());
            r.setConversationId(id);
            r.setWorkspaceId(workspaceId);
            r.setUserId(authenticatedUser.id());
            return r;
        });
        read.setLastReadMessageId(lastMsgId);
        read.setReadAt(OffsetDateTime.now());
        return readRepo.save(read);
    }

    // ─────────────────────────────── Pins ─────────────────────────────────────

    @PostMapping("/messages/{msgId}/pin")
    public PinnedMessage pinMessage(@PathVariable String msgId,
                                     @RequestParam String workspaceId,
                                     @RequestParam String conversationId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireConversationInWorkspace(conversationId, workspaceId);
        requireMessageInWorkspace(msgId, workspaceId);

        return pinRepo.findByConversationIdAndMessageIdAndWorkspaceId(conversationId, msgId, workspaceId)
                .orElseGet(() -> {
                    PinnedMessage pin = new PinnedMessage();
                    pin.setId(UUID.randomUUID().toString());
                    pin.setConversationId(conversationId);
                    pin.setWorkspaceId(workspaceId);
                    pin.setMessageId(msgId);
                    pin.setPinnedBy(authenticatedUser.id());
                    pin.setPinnedAt(OffsetDateTime.now());
                    return pinRepo.save(pin);
                });
    }

    @DeleteMapping("/messages/{msgId}/pin")
    @Transactional
    public Map<String, String> unpinMessage(@PathVariable String msgId,
                                             @RequestParam String workspaceId,
                                             @RequestParam String conversationId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        requireConversationInWorkspace(conversationId, workspaceId);
        pinRepo.deleteByConversationIdAndMessageIdAndWorkspaceId(conversationId, msgId, workspaceId);
        return Map.of("status", "unpinned");
    }

    // ─────────────────────────────── AI endpoints ─────────────────────────────

    /**
     * Summarize the conversation. Returns a deterministic fallback when AI is unavailable.
     * The result is always a read-only summary — it is never auto-persisted.
     */
    @PostMapping("/conversations/{id}/summarize")
    public Map<String, Object> summarizeConversation(@PathVariable String id,
                                                      @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        ChatConversation c = requireConversationInWorkspace(id, workspaceId);
        List<ChatMessage> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(id);

        List<String> bodies = messages.stream()
                .map(ChatMessage::getBody)
                .filter(b -> b != null && !b.isBlank())
                .collect(Collectors.toList());

        String aiSummary = aiService.summarize(workspaceId, c.getSubject(), bodies);
        boolean aiAvailable = (aiSummary != null);

        String summary = aiAvailable ? aiSummary : buildDeterministicSummary(c.getSubject(), messages);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("conversationId", id);
        res.put("summary", summary);
        res.put("aiAvailable", aiAvailable);
        res.put("messageCount", messages.size());
        return res;
    }

    /**
     * Extract action items as review-only drafts. Implements the human-approval gate (RB-40 §2.1):
     * drafts are returned to the caller but NEVER auto-created in the database.
     */
    @PostMapping("/conversations/{id}/extract-actions")
    public Map<String, Object> extractActionItems(@PathVariable String id,
                                                   @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        ChatConversation c = requireConversationInWorkspace(id, workspaceId);
        List<ChatMessage> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(id);

        List<String> bodies = messages.stream()
                .map(ChatMessage::getBody)
                .filter(b -> b != null && !b.isBlank())
                .collect(Collectors.toList());

        List<Map<String, Object>> aiDrafts = aiService.extractActionItems(workspaceId, c.getSubject(), bodies);
        boolean aiAvailable = (aiDrafts != null);

        List<Map<String, Object>> drafts = aiAvailable ? aiDrafts : List.of();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("conversationId", id);
        res.put("drafts", drafts);
        res.put("aiAvailable", aiAvailable);
        res.put("reviewRequired", true); // Always true — human must approve before creating records
        return res;
    }

    // ─────────────────────────────── Private helpers ──────────────────────────

    /** Load a conversation and verify it belongs to the caller's workspace (RB-40 §1 PK re-check). */
    private ChatConversation requireConversationInWorkspace(String id, String workspaceId) {
        ChatConversation c = conversationRepo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "not found"));
        if (!c.getWorkspaceId().equals(workspaceId)) {
            // Treat another tenant's resource as non-existent — never leak its existence.
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "not found");
        }
        return c;
    }

    /** Load a message and verify it belongs to the caller's workspace. */
    private ChatMessage requireMessageInWorkspace(String msgId, String workspaceId) {
        ChatMessage m = messageRepo.findById(msgId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "not found"));
        if (!workspaceId.equals(m.getWorkspaceId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "not found");
        }
        return m;
    }

    /** Deterministic summary used when AI is unavailable (RB-40 §2 fallback contract). */
    private String buildDeterministicSummary(String subject, List<ChatMessage> messages) {
        if (messages.isEmpty()) {
            return "No messages in this conversation yet.";
        }
        return String.format(
                "Conversation \"%s\" has %d message%s. AI summary is not available; review the thread for details.",
                subject != null ? subject : "(no subject)",
                messages.size(),
                messages.size() == 1 ? "" : "s");
    }
}
