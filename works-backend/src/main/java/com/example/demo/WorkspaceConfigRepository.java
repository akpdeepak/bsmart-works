package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

/** Live workspace configuration, keyed by workspace id (RB-40 §1 — workspace-scoped by construction). */
public interface WorkspaceConfigRepository extends JpaRepository<WorkspaceConfig, String> {
}
