package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DashboardRepository extends JpaRepository<Dashboard, String> {
    List<Dashboard> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Dashboard> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    Optional<Dashboard> findByShareToken(String shareToken);
}
