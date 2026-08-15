package com.bcits.works.devsync;

import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devsync/webhook")
public class DevSyncWebhookController {

    private final DevSyncWebhookService service;

    public DevSyncWebhookController(DevSyncWebhookService service) {
        this.service = service;
    }

    @PostMapping("/{workspaceId}")
    public Map<String, String> handleWebhook(
            @PathVariable String workspaceId,
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "unknown") String eventType,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String rawPayload) {
        
        if (deliveryId == null || deliveryId.isBlank()) {
            deliveryId = UUID.randomUUID().toString();
        }
        
        service.verifySignature(rawPayload, signature);
        service.processGitHubWebhook(workspaceId, eventType, deliveryId, rawPayload);
        
        return Map.of("status", "accepted");
    }
}
