package com.bcits.works;

import com.bcits.works.shared.TenantScope;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The customer-facing chat API (iteration 20, Cap N). Mirrors {@link CustomerPortalController}'s
 * auth exactly: every endpoint resolves the customer from the portal token via
 * {@link CustomerContext#current()} and is scoped to that customer's workspace and account, so a
 * customer can only ever drive their own chat (RB-40 §1). An internal token cannot reach these
 * endpoints (the customer-token assertion rejects it), and responses are deliberately
 * customer-shaped — the internal assigned-agent id is never exposed (field-level security in
 * practice). Tier-1 AI + escalation logic lives in {@link SupportChatService}.
 */
@RestController
@RequestMapping("/api/v1/support-chat/portal")
public class SupportChatPortalController {

    private final CustomerContext customerContext;
    private final SupportChatService chat;

    public SupportChatPortalController(CustomerContext customerContext, SupportChatService chat) {
        this.customerContext = customerContext;
        this.chat = chat;
    }

    /** Start a new chat with a first message; the tier-1 auto-response runs synchronously. */
    @PostMapping("/conversations")
    public Map<String, Object> start(@RequestBody Map<String, Object> body) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): the portal derives its tenant
        // scope from the signed CUSTOMER claim (me.workspaceId()), not from an internal workspace
        // binding — the internal central filter never binds for a portal token. Run unscoped so the
        // explicit claim-workspace argument to SupportChatService is the entire scope for
        // ChatConversation / ChatMessage.
        return TenantScope.callAsSystem(() -> {
            CustomerContext.CustomerPrincipal me = customerContext.current();
            String firstMessage = str(body.get("message"));
            String subject = str(body.get("subject"));
            String customerName = body.get("customerName") != null ? str(body.get("customerName")) : me.email();
            SupportChatService.ChatResult result = chat.startConversation(
                me.workspaceId(), me.accountId(), me.customerUserId(), customerName, subject, firstMessage);
            // Re-read so the customer always gets the full transcript, not just this round's new turns.
            return view(chat.getConversation(me.workspaceId(), result.conversation().getId()));
        });
    }

    /** Append a follow-up message to an existing conversation; the auto-response runs again. */
    @PostMapping("/conversations/{id}/messages")
    public Map<String, Object> message(@PathVariable String id, @RequestBody Map<String, Object> body) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): claim-scoped portal write; the
        // explicit me.workspaceId() is the entire scope.
        return TenantScope.callAsSystem(() -> {
            CustomerContext.CustomerPrincipal me = customerContext.current();
            chat.postCustomerMessage(me.workspaceId(), id, me.customerUserId(), str(body.get("message")));
            return view(chat.getConversation(me.workspaceId(), id));
        });
    }

    /** The customer views their own conversation thread (workspace-scoped). */
    @GetMapping("/conversations/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): claim-scoped portal read; the
        // explicit me.workspaceId() is the entire scope.
        return TenantScope.callAsSystem(() -> {
            CustomerContext.CustomerPrincipal me = customerContext.current();
            return view(chat.getConversation(me.workspaceId(), id));
        });
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    /** Customer-shaped envelope: the conversation summary + the full transcript, no internal ids. */
    private Map<String, Object> view(SupportChatService.ChatResult result) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("conversation", SupportChatService.customerView(result.conversation()));
        List<Map<String, Object>> msgs = result.newMessages().stream()
            .map(SupportChatService::customerMessageView).toList();
        out.put("messages", msgs);
        return out;
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
