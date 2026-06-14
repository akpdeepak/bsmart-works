package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Capacity-config access for the Sprint Cockpit Capacity tab. Workspace scoping is enforced in
 * {@link SprintCapacityService} via the sprint → project → workspace guard before these finders are
 * called (RB-40 §1) — the board only ever loads rows for a sprint the caller's workspace owns.
 */
public interface SprintMemberCapacityRepository extends JpaRepository<SprintMemberCapacity, String> {
    List<SprintMemberCapacity> findBySprintId(String sprintId);
    Optional<SprintMemberCapacity> findBySprintIdAndUserId(String sprintId, String userId);
}
