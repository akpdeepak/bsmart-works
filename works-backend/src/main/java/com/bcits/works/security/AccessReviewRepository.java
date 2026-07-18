package com.bcits.works.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AccessReviewRepository extends JpaRepository<AccessReview, String> {
    List<AccessReview> findByWorkspaceIdOrderByStartedAtDesc(String workspaceId);
}
