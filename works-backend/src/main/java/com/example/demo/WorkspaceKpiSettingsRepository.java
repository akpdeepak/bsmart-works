package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for per-workspace KPI privacy settings. */
public interface WorkspaceKpiSettingsRepository extends JpaRepository<WorkspaceKpiSettings, String> {
}
