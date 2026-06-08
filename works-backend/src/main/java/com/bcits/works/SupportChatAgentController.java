package com.bcits.works;

import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent-side customer chat (iteration 20, Cap N): the support inbox agents work escalated
 * conversations from — list, open, claim, reply and resolve. RBAC at the boundary (RB-10 §2):
 * every action requires {@code work_service} (the same permission that gates the service-request
 * queues — chat is the same agent workflow), enforced in {@link RbacService} not here. Every read is
 * workspace-scoped (RB-40 §1) and every action is audited as an event by {@link SupportChatService}.
 */
@RestController
@RequestMapping("/api/v1/support-chat")
public class SupportChatAgentController {

    private final SupportChatService chat;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SupportChatAgentController(SupportChatService chat, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.chat = chat;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** The agent inbox, optionally filtered by status (OPEN / AI_HANDLED / ESCALATED / RESOLVED). */
    @GetMapping("/conversations")
    public List<ChatConversation> list(@RequestParam String workspaceId,
                                       @RequestParam(required = false) String status) {
        requireWorkspace(workspaceId);
        rbac.require(authenticatedUser.id(), workspaceId, "work_service");
        return chat.listConversations(workspaceId, status);
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
        return chat.assign(workspaceId, userId, id);
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
        return chat.resolve(workspaceId, userId, id);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    private Map<String, Object> envelope(SupportChatService.ChatResult result) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("conversation", result.conversation());
        out.put("messages", result.newMessages());
        return out;
    }

    private static void requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "A workspaceId is required.", "workspaceId");
        }
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
