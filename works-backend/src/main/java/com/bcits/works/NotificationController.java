package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    private final NotificationRepository notificationRepository;
    private final AuthenticatedUser authenticatedUser;
    private final UserPiiService userPii;

    public NotificationController(NotificationRepository notificationRepository, AuthenticatedUser authenticatedUser,
                                 UserPiiService userPii) {
        this.notificationRepository = notificationRepository;
        this.authenticatedUser = authenticatedUser;
        this.userPii = userPii;
    }

    @GetMapping
    public List<Notification> getNotifications(
            @RequestParam(required = false) String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String uid = authenticatedUser.id();
        // Clamp size to avoid runaway queries (RB-10 §4: always paginate list endpoints).
        int safeSize = Math.min(size, 200);
        Pageable pageable = PageRequest.of(page, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Notification> result = notificationRepository.findByUserId(uid, pageable);
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
