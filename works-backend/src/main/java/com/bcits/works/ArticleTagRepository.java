package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** KR-034 — repository for workspace-scoped article tags. */
public interface ArticleTagRepository extends JpaRepository<ArticleTag, String> {
    List<ArticleTag> findByWorkspaceId(String workspaceId);
}
