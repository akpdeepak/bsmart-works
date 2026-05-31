package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PermissionSchemeRepository extends JpaRepository<PermissionScheme, String> {
    List<PermissionScheme> findByWorkspaceId(String workspaceId);
}
