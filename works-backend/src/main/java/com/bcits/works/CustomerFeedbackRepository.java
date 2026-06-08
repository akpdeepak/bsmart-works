package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, String> {
    List<CustomerFeedback> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
}
