package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Report> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<Report> findByIsTemplateTrueOrderByNameAsc();
}
