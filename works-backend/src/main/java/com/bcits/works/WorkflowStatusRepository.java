package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowStatusRepository extends JpaRepository<WorkflowStatus, String> {
    List<WorkflowStatus> findByWorkflowIdOrderByPosition(String workflowId);
}
