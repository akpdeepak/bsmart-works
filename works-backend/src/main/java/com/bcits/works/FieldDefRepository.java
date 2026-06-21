package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FieldDefRepository extends JpaRepository<FieldDef, String> {
    List<FieldDef> findByWorkspaceIdOrderByPosition(String workspaceId);
    List<FieldDef> findByProjectIdOrderByPosition(String projectId);
    List<FieldDef> findByWorkspaceIdAndProjectIdOrderByPosition(String workspaceId, String projectId);

    /** PII-flagged field definitions (RB-40 §3, Slice 4b) — drives the value-tokenization backfill. */
    List<FieldDef> findByPiiTrue();
}
