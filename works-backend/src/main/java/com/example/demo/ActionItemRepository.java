package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActionItemRepository extends JpaRepository<ActionItem, String> {
    List<ActionItem> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<ActionItem> findByMeetingNoteIdOrderByCreatedAtAsc(String meetingNoteId);
    List<ActionItem> findByOwnerIdAndStatusNotOrderByDueDateAsc(String ownerId, String status);
}
