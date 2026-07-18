package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.security.CustomerAttributionPiiService;
import com.bcits.works.messaging.ChatConversation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent-side customer chat (iteration 20, Cap N): the support inbox agents work escalated
 * conversations from — list, open, claim, reply and resolve. RBAC at the boundary (RB-10 §2):
 * every action requires {@code work_service} (the same permission that gates the service-request
 * queues — chat is the same agent workflow), enforced in {@link RbacGate} not here. Every read is
 * workspace-scoped (RB-40 §1) and every action is audited as an event by {@link SupportChatService}.
 */
@RestController
@RequestMapping("/api/v1/support-chat")
public class SupportChatAgentController {

    private final SupportChatService chat;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final CustomerAttributionPiiService attributionPii;

    public SupportChatAgentController(SupportChatService chat, AuthenticatedUser authenticatedUser,
                                      RbacGate rbac, CustomerAttributionPiiService attributionPii) {
        this.chat = chat;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.attributionPii = attributionPii;
    }

    /** The agent inbox, optionally filtered by status (OPEN / AI_HANDLED / ESCALATED / RESOLVED). */
    @GetMapping("/conversations")
    public List<ChatConversation> list(@RequestParam String workspaceId,
                                       @RequestParam(required = false) String status) {
        requireWorkspace(workspaceId);
        rbac.require(authenticatedUser.id(), workspaceId, "work_service");
        List<ChatConversation> convos = chat.listConversations(workspaceId, status);
        convos.forEach(this::resolveCustomerName);
        return convos;
    }

    /** Open a single conversation with its full transcript. */
    @GetMapping("/conversations/{id}")
    public Map<String, Object> get(@PathVariable String id, @RequestParam String workspaceId) {
        requireWorkspace(workspaceId);
        rbac.require(authenticatedUser.id(), workspaceId, "work_service");
        return envelope(chat.getConversationForAgent(workspaceId, id));
    }

    /** Claim the conversation (self-assign + escalate to agent-owned). */
    @PutMapping("/conversations/{id}/assign")
    public ChatConversation assign(@PathVariable String id, @RequestParam String workspaceId) {
        requireWorkspace(workspaceId);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "work_service");
        return resolveCustomerName(chat.assign(workspaceId, userId, id));
    }

    /** Post an agent reply to the conversation. */
    @PostMapping("/conversations/{id}/reply")
    public Map<String, Object> reply(@PathVariable String id, @RequestParam String workspaceId,
                                     @RequestBody Map<String, Object> body) {
        requireWorkspace(workspaceId);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "work_service");
        return envelope(chat.agentReply(workspaceId, userId, id, str(body.get("body"))));
    }

    /** Resolve the conversation. */
    @PutMapping("/conversations/{id}/resolve")
    public ChatConversation resolve(@PathVariable String id, @RequestParam String workspaceId) {
        requireWorkspace(workspaceId);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "work_service");
        return resolveCustomerName(chat.resolve(workspaceId, userId, id));
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    private Map<String, Object> envelope(SupportChatService.ChatResult result) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("conversation", resolveCustomerName(result.conversation()));
        out.put("messages", result.newMessages());
        return out;
    }

    /**
     * Resolve the conversation's customer name from the PII vault when reads are switched on (RB-40 §3
     * — no-op while read-from-vault is off, the default), mutating the rendered value in place. Done at
     * the controller boundary (outside the service transaction) so the resolved value is never flushed
     * back to the legacy customer_name column — same precedent as {@code scrub()}.
     */
    private ChatConversation resolveCustomerName(ChatConversation c) {
        if (c != null) {
            c.setCustomerName(attributionPii.resolve(c.getWorkspaceId(), c.getCustomerSubjectToken(), c.getCustomerName()));
        }
        return c;
    }

    private static void requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "A workspaceId is required.", "workspaceId");
        }
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
