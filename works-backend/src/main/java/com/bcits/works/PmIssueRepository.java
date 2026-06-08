package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PmIssueRepository extends JpaRepository<PmIssue, String> {
    List<PmIssue> findByProjectIdAndDeletedAtIsNull(String projectId);
}
