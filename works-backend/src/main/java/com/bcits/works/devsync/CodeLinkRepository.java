package com.bcits.works.devsync;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CodeLinkRepository extends JpaRepository<CodeLink, Long> {
    List<CodeLink> findByWorkItemIdOrderByCreatedAtDesc(String workItemId);
    List<CodeLink> findByWorkspaceIdAndAuthorIdOrderByCreatedAtDesc(String workspaceId, String authorId);
}
