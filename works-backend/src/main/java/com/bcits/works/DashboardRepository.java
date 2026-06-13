package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DashboardRepository extends JpaRepository<Dashboard, String> {
    List<Dashboard> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Dashboard> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    Optional<Dashboard> findByShareToken(String shareToken);

    // Paginated list variants (RB-10 §4): the Pageable carries the (allow-listed) sort.
    Page<Dashboard> findByOwnerId(String ownerId, Pageable pageable);
    Page<Dashboard> findByWorkspaceId(String workspaceId, Pageable pageable);

    // Today layouts (surface='TODAY'): personal override and workspace role template.
    Optional<Dashboard> findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerId(
        String workspaceId, String surface, String roleKey, String ownerId);
    Optional<Dashboard> findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerIdIsNull(
        String workspaceId, String surface, String roleKey);
}
