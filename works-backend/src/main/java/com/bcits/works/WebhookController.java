package com.bcits.works;

import com.bcits.works.shared.PageResponse;

import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
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
 * Outbound webhooks API (iteration 13, Cap Q). Reads need workspace membership; managing
 * subscriptions and redelivering require {@code manage_integrations}. RBAC at the service boundary
 * (RB-10 §2), every endpoint workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

    private final WebhookService webhooks;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public WebhookController(WebhookService webhooks, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.webhooks = webhooks;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<WebhookSubscription> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return webhooks.list(workspaceId);
    }

    @PostMapping
    public WebhookSubscription create(@RequestParam String workspaceId, @Valid @RequestBody WebhookSubscription sub) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_integrations");
        return webhooks.create(workspaceId, userId, sub);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_integrations");
        webhooks.delete(workspaceId, id);
        return Map.of("ok", true);
    }

    @GetMapping("/deliveries")
    public PageResponse<WebhookDelivery> deliveries(@RequestParam String workspaceId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "50") int size) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return PageResponse.of(webhooks.deliveryLog(workspaceId,
            PageRequest.of(Math.max(0, page), Math.min(200, Math.max(1, size)))));
    }

    @PostMapping("/deliveries/{id}/redeliver")
    public WebhookDelivery redeliver(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_integrations");
        return webhooks.redeliver(workspaceId, id);
    }

    /** Rotates the HMAC signing secret for a subscription. The new secret is returned exactly once. */
    @PostMapping("/{id}/rotate-secret")
    public Map<String, Object> rotateSecret(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_integrations");
        WebhookService.RotatedSecret result = webhooks.rotateSecret(workspaceId, id);
        return Map.of("subscription", result.subscription(), "secret", result.newSecret(),
            "notice", "Copy this secret now — it will not be shown again.");
    }
}
