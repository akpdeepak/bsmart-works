package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkLogRepository extends JpaRepository<WorkLog, Long> {
    List<WorkLog> findByWorkItemIdOrderByWorkDateDesc(String workItemId);
    List<WorkLog> findByUserIdOrderByWorkDateDesc(String userId);
}
