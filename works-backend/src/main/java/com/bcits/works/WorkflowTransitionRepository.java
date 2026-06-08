package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowTransitionRepository extends JpaRepository<WorkflowTransition, String> {
    List<WorkflowTransition> findByWorkflowId(String workflowId);
    List<WorkflowTransition> findByWorkflowIdAndFromStatusAndToStatus(
            String workflowId, String fromStatus, String toStatus);
}
