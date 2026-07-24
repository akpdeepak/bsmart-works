package com.bcits.works.knowledge;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Workspace-scoped approval queries (RB-40 §1).
 * Every method requires both articleId AND workspaceId so cross-tenant data is
 * structurally impossible to return.
 */
public interface ArticleApprovalRepository extends JpaRepository<ArticleApproval, String> {

    /** All approvals for an article — workspace-scoped. */
    List<ArticleApproval> findByArticleIdAndWorkspaceId(String articleId, String workspaceId);

    /** Count approvals with a given decision — workspace-scoped. */
    int countByArticleIdAndWorkspaceIdAndDecision(String articleId, String workspaceId, String decision);
}
