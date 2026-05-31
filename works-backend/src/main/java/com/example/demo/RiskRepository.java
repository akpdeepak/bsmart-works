package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RiskRepository extends JpaRepository<Risk, String> {
    List<Risk> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<Risk> findByWorkspaceIdAndDeletedAtIsNull(String workspaceId);
}
