package com.bcits.works.workitems;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DodChecklistRepository extends JpaRepository<DodChecklist, String> {
    List<DodChecklist> findByWorkspaceIdOrderByName(String workspaceId);
    Optional<DodChecklist> findByWorkspaceIdAndScopeTypeAndScopeRef(String workspaceId, String scopeType, String scopeRef);
}
