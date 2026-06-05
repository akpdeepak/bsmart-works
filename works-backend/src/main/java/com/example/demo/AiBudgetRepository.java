package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Data access for {@link AiBudget}. Workspace-scoped (RB-40 §1): one cap per (workspace, month). The
 * budget state (NORMAL/DEGRADED/DISABLED) is computed from cap vs spent by {@link AiBudgetService}.
 */
public interface AiBudgetRepository extends JpaRepository<AiBudget, String> {

    Optional<AiBudget> findByWorkspaceIdAndPeriodMonth(String workspaceId, String periodMonth);
}
