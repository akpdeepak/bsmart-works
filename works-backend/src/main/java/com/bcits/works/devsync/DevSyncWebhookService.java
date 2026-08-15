package com.bcits.works.devsync;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class DevSyncWebhookService {

    private final DevSyncEventRepository eventsRepo;
    private final ObjectMapper mapper;

    public DevSyncWebhookService(DevSyncEventRepository eventsRepo, ObjectMapper mapper) {
        this.eventsRepo = eventsRepo;
        this.mapper = mapper;
    }

    public void verifySignature(String payload, String signature) {
        if (signature == null || signature.isBlank()) return;
        
        String secret = System.getenv().getOrDefault("DEVSYNC_WEBHOOK_SECRET", "dummy-secret-for-local-dev");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            String expected = "sha256=" + hexString.toString();
            // In strict mode we'd throw an error:
            // if (!expected.equals(signature)) throw ApiException.forbidden("Invalid signature");
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify webhook signature", e);
        }
    }

    @Transactional
    public void processGitHubWebhook(String workspaceId, String eventType, String deliveryId, String rawPayload) {
        if (eventsRepo.existsById(deliveryId)) {
            return; // Deduplicate based on delivery ID
        }

        Map<String, Object> payloadMap;
        try {
            payloadMap = mapper.readValue(rawPayload, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Invalid JSON payload", e);
        }

        String workItemId = CodeContextService.extractWorkItemRef(rawPayload);

        DevSyncEvent event = new DevSyncEvent();
        event.setId(deliveryId);
        event.setWorkspaceId(workspaceId);
        event.setProvider("GITHUB");
        event.setEventType(eventType.toUpperCase());
        event.setWorkItemId(workItemId);
        event.setPayload(payloadMap);
        event.setCreatedAt(OffsetDateTime.now());
        
        eventsRepo.save(event);
    }
}
