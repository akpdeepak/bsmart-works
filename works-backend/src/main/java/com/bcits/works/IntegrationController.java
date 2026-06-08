package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Integrations API (iteration 13, Cap Q / Cap A). Reads need workspace membership; connecting,
 * disconnecting and testing connectors require {@code manage_integrations}; the email-connector
 * inbound path requires {@code create_items}. RBAC at the service boundary (RB-10 §2), every endpoint
 * workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/integrations")
public class IntegrationController {

    private final IntegrationService integrations;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public IntegrationController(IntegrationService integrations, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.integrations = integrations;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/providers")
    public List<Map<String, Object>> providers(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return integrations.providers();
    }

    @GetMapping
    public List<IntegrationConnection> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return integrations.list(workspaceId);
    }

    public record ConnectRequest(String provider, String name, String config) { }

    @PostMapping("/connect")
    public IntegrationConnection connect(@RequestParam String workspaceId, @RequestBody ConnectRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_integrations");
        return integrations.connect(workspaceId, userId,
            req == null ? null : req.provider(), req == null ? null : req.name(), req == null ? null : req.config());
    }

    @PostMapping("/{id}/disconnect")
    public IntegrationConnection disconnect(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_integrations");
        return integrations.disconnect(workspaceId, id);
    }

    @GetMapping("/{id}/test")
    public Map<String, Object> test(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_integrations");
        return integrations.test(workspaceId, id);
    }

    public record InboundEmailRequest(String subject, String body, String projectId) { }

    /** Email connector inbound: a message becomes a work item. */
    @PostMapping("/email/inbound")
    public WorkItem inboundEmail(@RequestParam String workspaceId, @RequestBody InboundEmailRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "create_items");
        return integrations.ingestInboundEmail(workspaceId, userId,
            req == null ? null : req.subject(), req == null ? null : req.body(),
            req == null ? null : req.projectId());
    }
}
