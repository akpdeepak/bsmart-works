package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Workspace-scoped finders for {@link DocumentTemplate} (RB-40 §1) — no method returns templates
 * across workspaces.
 */
public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, String> {
    List<DocumentTemplate> findByWorkspaceIdOrderByCategoryAscNameAsc(String workspaceId);
    List<DocumentTemplate> findByWorkspaceIdAndCategoryOrderByNameAsc(String workspaceId, String category);
}
