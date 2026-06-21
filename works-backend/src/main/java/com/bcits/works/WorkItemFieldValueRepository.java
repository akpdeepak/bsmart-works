package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkItemFieldValueRepository extends JpaRepository<WorkItemFieldValue, String> {
    List<WorkItemFieldValue> findByWorkItemId(String workItemId);
    Optional<WorkItemFieldValue> findByWorkItemIdAndFieldDefId(String workItemId, String fieldDefId);

    /** Backfill guard (RB-40 §3, Slice 4b): values of a PII-flagged field not yet tokenized. */
    List<WorkItemFieldValue> findByFieldDefIdAndSubjectTokenIsNull(String fieldDefId);
}
