package com.bcits.works;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserId(String userId, Pageable pageable);
    long countByUserIdAndIsRead(String userId, boolean isRead);
}
