package com.bcits.works;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final AuthenticatedUser authenticatedUser;

    public NotificationController(NotificationRepository notificationRepository, AuthenticatedUser authenticatedUser) {
        this.notificationRepository = notificationRepository;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Notification> getNotifications(@RequestParam(required = false) String userId) {
        userId = authenticatedUser.id();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestParam(required = false) String userId) {
        userId = authenticatedUser.id();
        long count = notificationRepository.countByUserIdAndIsRead(userId, false);
        return Map.of("count", count);
    }

    @PutMapping("/{id}/read")
    public Notification markRead(@PathVariable Long id) {
        String userId = authenticatedUser.id();
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Notification", String.valueOf(id)));
        // A user may only mark their own notifications read — 404 (not 403) so another user's
        // notification id is never confirmed to exist.
        if (!userId.equals(n.getUserId())) {
            throw ApiException.notFound("Notification", String.valueOf(id));
        }
        n.setRead(true);
        return notificationRepository.save(n);
    }

    @PutMapping("/mark-all-read")
    public void markAllRead(@RequestParam(required = false) String userId) {
        userId = authenticatedUser.id();
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}
