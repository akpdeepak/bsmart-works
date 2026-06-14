package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Report> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<Report> findByIsTemplateTrueOrderByNameAsc();

    // Paginated list variants (RB-10 §4): the Pageable carries the (allow-listed) sort.
    Page<Report> findByOwnerId(String ownerId, Pageable pageable);
    Page<Report> findByWorkspaceId(String workspaceId, Pageable pageable);
}
