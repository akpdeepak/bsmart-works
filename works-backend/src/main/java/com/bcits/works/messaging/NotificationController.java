package com.bcits.works.messaging;
import com.bcits.works.messaging.api.Notification;

import com.bcits.works.auth.api.UserPiiService;
import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationActivityService activity;
    private final AuthenticatedUser authenticatedUser;
    private final UserPiiService userPii;

    public NotificationController(NotificationActivityService activity, AuthenticatedUser authenticatedUser,
                                 UserPiiService userPii) {
        this.activity = activity;
        this.authenticatedUser = authenticatedUser;
        this.userPii = userPii;
    }

    @GetMapping
    public List<Notification> getNotifications(
            @RequestParam String workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String uid = authenticatedUser.id();
        List<Notification> result = activity.list(workspaceId, uid, page, size);
        result.forEach(this::resolveActor);
        return result;
    }

    /**
     * Resolve the actor's display name from the PII vault and prepend it to a name-free message
     * (RB-40 §3, Slice 4c). Mutates the rendered message in place at the controller boundary (outside
     * any transaction, the scrub() precedent) so the resolved name is never flushed back to the stored
     * name-free message. No-op for system notifications / pre-V114 rows (actor_id null), whose message
     * already reads correctly.
     */
    private void resolveActor(Notification n) {
        if (n == null || n.getActorId() == null || n.getActorId().isBlank()) {
            return;
        }
        String name = userPii.displayNameById(n.getActorId());
        n.setMessage((name != null ? name : "Someone") + " " + n.getMessage());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestParam String workspaceId) {
        long count = activity.unreadCount(workspaceId, authenticatedUser.id());
        return Map.of("count", count);
    }

    @PutMapping("/{id}/read")
    public Notification markRead(@PathVariable Long id, @RequestParam String workspaceId) {
        return activity.markRead(workspaceId, authenticatedUser.id(), id);
    }

    @PutMapping("/mark-all-read")
    public void markAllRead(@RequestParam String workspaceId) {
        activity.markAllRead(workspaceId, authenticatedUser.id());
    }
}
