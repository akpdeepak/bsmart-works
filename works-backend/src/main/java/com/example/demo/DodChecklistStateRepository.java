package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DodChecklistStateRepository extends JpaRepository<DodChecklistState, Long> {
    List<DodChecklistState> findByWorkItemId(String workItemId);
    Optional<DodChecklistState> findByWorkItemIdAndChecklistItemId(String workItemId, Long checklistItemId);
}
