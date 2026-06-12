package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, String> {

    @Query("SELECT c FROM CustomFieldDefinition c WHERE c.workspaceId = :workspaceId AND c.deletedAt IS NULL ORDER BY c.createdAt ASC")
    List<CustomFieldDefinition> findActiveByWorkspaceId(String workspaceId);
}
