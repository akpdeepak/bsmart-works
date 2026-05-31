package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FieldLayoutRepository extends JpaRepository<FieldLayout, String> {
    Optional<FieldLayout> findByWorkspaceIdAndItemType(String workspaceId, String itemType);
    Optional<FieldLayout> findByProjectIdAndItemType(String projectId, String itemType);
    List<FieldLayout> findByWorkspaceId(String workspaceId);
}
