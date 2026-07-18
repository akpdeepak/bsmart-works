package com.bcits.works.messaging;

import com.bcits.works.shared.AuthenticatedUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Web Push subscription registry (iteration 18, Cap S). A user's browser registers its push endpoint
 * here so the server can later deliver push notifications. Per-user: every operation is scoped to the
 * authenticated user, and a user can only ever see or remove their own subscriptions.
 */
@RestController
@RequestMapping("/api/v1/push/subscriptions")
public class PushSubscriptionController {

    private final AuthenticatedUser authenticatedUser;
    private final PushSubscriptionRepository repo;

    public PushSubscriptionController(AuthenticatedUser authenticatedUser, PushSubscriptionRepository repo) {
        this.authenticatedUser = authenticatedUser;
        this.repo = repo;
    }

    public record SubscribeRequest(@NotBlank String endpoint, String p256dh, String auth, String userAgent) { }

    @GetMapping
    public List<PushSubscription> mine() {
        return repo.findByUserId(authenticatedUser.id());
    }

    /** Register (or refresh) the caller's push subscription. Idempotent on the endpoint. */
    @PostMapping
    public PushSubscription subscribe(@Valid @RequestBody SubscribeRequest req) {
        String userId = authenticatedUser.id();
        PushSubscription sub = repo.findByEndpoint(req.endpoint()).orElseGet(PushSubscription::new);
        if (sub.getId() == null) {
            sub.setId("PSUB-" + UUID.randomUUID());
            sub.setCreatedAt(OffsetDateTime.now());
        }
        sub.setUserId(userId);
        sub.setEndpoint(req.endpoint());
        sub.setP256dh(req.p256dh());
        sub.setAuth(req.auth());
        sub.setUserAgent(req.userAgent());
        sub.setLastSeenAt(OffsetDateTime.now());
        return repo.save(sub);
    }

    /** Remove a subscription — only if it belongs to the caller (no cross-user deletes). */
    @DeleteMapping
    public Map<String, String> unsubscribe(@Valid @RequestBody UnsubscribeRequest req) {
        String userId = authenticatedUser.id();
        repo.findByEndpoint(req.endpoint())
                .filter(s -> userId.equals(s.getUserId()))
                .ifPresent(repo::delete);
        return Map.of("message", "Unsubscribed");
    }

    public record UnsubscribeRequest(@NotBlank String endpoint) { }
}
