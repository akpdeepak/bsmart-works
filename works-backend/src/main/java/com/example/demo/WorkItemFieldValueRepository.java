package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkItemFieldValueRepository extends JpaRepository<WorkItemFieldValue, String> {
    List<WorkItemFieldValue> findByWorkItemId(String workItemId);
    Optional<WorkItemFieldValue> findByWorkItemIdAndFieldDefId(String workItemId, String fieldDefId);
}
