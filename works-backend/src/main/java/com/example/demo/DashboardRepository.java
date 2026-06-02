package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DashboardRepository extends JpaRepository<Dashboard, String> {
    List<Dashboard> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    List<Dashboard> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
}
