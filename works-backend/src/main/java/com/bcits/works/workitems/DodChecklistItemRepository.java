package com.bcits.works.workitems;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DodChecklistItemRepository extends JpaRepository<DodChecklistItem, Long> {
    List<DodChecklistItem> findByChecklistIdOrderByPosition(String checklistId);
}
