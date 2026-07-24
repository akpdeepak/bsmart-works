package com.bcits.works.ai;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/** Workspace-scoped (RB-40 §1) access to per-month AI budgets. */
public interface AiBudgetRepository extends JpaRepository<AiBudget, String> {

    Optional<AiBudget> findByWorkspaceIdAndPeriod(String workspaceId, String period);
}
