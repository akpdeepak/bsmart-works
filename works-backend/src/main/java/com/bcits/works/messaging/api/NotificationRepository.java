package com.bcits.works.messaging.api;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByWorkspaceIdAndUserId(String workspaceId, String userId, Pageable pageable);
    List<Notification> findByWorkspaceIdAndUserIdOrderByCreatedAtDesc(String workspaceId, String userId);
    long countByWorkspaceIdAndUserIdAndIsRead(String workspaceId, String userId, boolean isRead);
}
