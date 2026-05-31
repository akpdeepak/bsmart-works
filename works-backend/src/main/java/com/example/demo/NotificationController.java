package com.example.demo;

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
        return notificationRepository.findById(id).map(n -> {
            n.setRead(true);
            return notificationRepository.save(n);
        }).orElseThrow();
    }

    @PutMapping("/mark-all-read")
    public void markAllRead(@RequestParam(required = false) String userId) {
        userId = authenticatedUser.id();
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}
