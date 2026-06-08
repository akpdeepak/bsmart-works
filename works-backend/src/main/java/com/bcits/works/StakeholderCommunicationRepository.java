package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StakeholderCommunicationRepository extends JpaRepository<StakeholderCommunication, String> {
    List<StakeholderCommunication> findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(String projectId);
    List<StakeholderCommunication> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
}
