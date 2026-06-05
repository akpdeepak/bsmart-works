package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;

public interface FocusBlockRepository extends JpaRepository<FocusBlock, Long> {
    // Always scoped to the owning user (focus blocks are private — RB-40 §1).
    List<FocusBlock> findByWorkspaceIdAndUserIdOrderByStartsAtDesc(String workspaceId, String userId);
    List<FocusBlock> findByUserIdAndStatusAndStartsAtBeforeAndEndsAtAfter(
            String userId, String status, OffsetDateTime start, OffsetDateTime end);
}
