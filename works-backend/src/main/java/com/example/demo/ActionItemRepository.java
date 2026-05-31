package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActionItemRepository extends JpaRepository<ActionItem, String> {
    List<ActionItem> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<ActionItem> findBySourceMeetingIdAndDeletedAtIsNull(String sourceMeetingId);
    List<ActionItem> findByOwnerIdAndDeletedAtIsNull(String ownerId);
}
