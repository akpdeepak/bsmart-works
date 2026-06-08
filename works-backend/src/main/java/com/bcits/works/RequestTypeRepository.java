package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for request types. All lookups are workspace-scoped (RB-40 §1); the portal reads
 * only the active set for the customer's workspace.
 */
public interface RequestTypeRepository extends JpaRepository<RequestType, String> {

    List<RequestType> findByWorkspaceIdOrderBySortOrderAscNameAsc(String workspaceId);

    List<RequestType> findByWorkspaceIdAndActiveTrueOrderBySortOrderAscNameAsc(String workspaceId);
}
