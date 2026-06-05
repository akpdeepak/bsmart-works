package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for request types. All lookups are workspace-scoped so a type can never be read across
 * tenants (RB-40 §1); the portal lists only the active types in the customer's own workspace.
 */
public interface RequestTypeRepository extends JpaRepository<RequestType, String> {

    List<RequestType> findByWorkspaceIdOrderBySortOrderAscNameAsc(String workspaceId);

    List<RequestType> findByWorkspaceIdAndActiveTrueOrderBySortOrderAscNameAsc(String workspaceId);
}
