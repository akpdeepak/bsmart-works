package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ObjectiveRepository extends JpaRepository<Objective, String> {
    List<Objective> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
}
