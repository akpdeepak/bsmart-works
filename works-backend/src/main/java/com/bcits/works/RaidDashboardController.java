package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * RAID dashboard (risks/assumptions/issues/dependencies/actions) for a single project.
 *
 * <p><b>Tenant safety (RB-40 §1, RB-10 §2):</b> the caller passes only a {@code projectId}; the
 * workspace is <i>derived from that project</i> via {@link RbacGate#workspaceForProject} (404 if
 * the project does not exist), then the caller's membership + {@code view_items} permission is proven
 * via {@link RbacGate#require} <i>before any RAID query runs</i>. A foreign project therefore
 * yields 403 (member elsewhere) or 404 (unknown) and never leaks rows. Every RAID query is finally
 * bounded by both project and the resolved workspace, so an IDOR on {@code projectId} cannot escape
 * its tenant.
 */
@RestController
@RequestMapping("/api/v1/raid-dashboard")
public class RaidDashboardController {

    private final RiskRepository riskRepo;
    private final AssumptionRepository assumptionRepo;
    private final PmIssueRepository issueRepo;
    private final DependencyRepository dependencyRepo;
    private final ActionItemRepository actionItemRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public RaidDashboardController(RiskRepository riskRepo,
                                    AssumptionRepository assumptionRepo,
                                    PmIssueRepository issueRepo,
                                    DependencyRepository dependencyRepo,
                                    ActionItemRepository actionItemRepo,
                                    AuthenticatedUser authenticatedUser,
                                    RbacGate rbac) {
        this.riskRepo = riskRepo;
        this.assumptionRepo = assumptionRepo;
        this.issueRepo = issueRepo;
        this.dependencyRepo = dependencyRepo;
        this.actionItemRepo = actionItemRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public Map<String, Object> getDashboard(@RequestParam String projectId) {
        // 1. Resolve the workspace from the project (never trust the caller's claim); 404 if unknown.
        String workspaceId = rbac.workspaceForProject(projectId);
        if (workspaceId == null) {
            throw ApiException.notFound("Project", projectId);
        }

        // 2. Prove membership + permission in that workspace (RB-40 §1) — 403 before any query runs.
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");

        // 3. Every RAID query is bounded by both project and the resolved workspace.
        List<Risk> risks = riskRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId);
        List<Assumption> assumptions = assumptionRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId);
        List<PmIssue> issues = issueRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId);
        List<Dependency> dependencies = dependencyRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId);
        List<ActionItem> actions = actionItemRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId);

        Map<String, Object> dashboard = new LinkedHashMap<>();

        // Risk summary with heat matrix data
        dashboard.put("risks", risks);
        dashboard.put("riskSummary", Map.of(
            "total", risks.size(),
            "open", risks.stream().filter(r -> "OPEN".equals(r.getStatus())).count(),
            "high", risks.stream().filter(r -> "HIGH".equals(r.getImpact()) || "CRITICAL".equals(r.getImpact())).count(),
            "critical", risks.stream().filter(r -> "CRITICAL".equals(r.getImpact()) && "VERY_HIGH".equals(r.getProbability())).count()
        ));

        // Assumption summary
        dashboard.put("assumptions", assumptions);
        dashboard.put("assumptionSummary", Map.of(
            "total", assumptions.size(),
            "unvalidated", assumptions.stream().filter(a -> "UNVALIDATED".equals(a.getValidationStatus())).count(),
            "invalidated", assumptions.stream().filter(a -> "INVALIDATED".equals(a.getValidationStatus())).count()
        ));

        // Issue summary
        dashboard.put("issues", issues);
        dashboard.put("issueSummary", Map.of(
            "total", issues.size(),
            "open", issues.stream().filter(i -> "OPEN".equals(i.getStatus())).count(),
            "high", issues.stream().filter(i -> "HIGH".equals(i.getPriority()) || "CRITICAL".equals(i.getPriority())).count()
        ));

        // Dependency summary
        dashboard.put("dependencies", dependencies);
        dashboard.put("dependencySummary", Map.of(
            "total", dependencies.size(),
            "blocked", dependencies.stream().filter(d -> "BLOCKED".equals(d.getStatus())).count(),
            "blockers", dependencies.stream().filter(d -> Boolean.TRUE.equals(d.getIsBlocker())).count()
        ));

        // Action items
        dashboard.put("actionItems", actions);
        dashboard.put("actionSummary", Map.of(
            "total", actions.size(),
            "open", actions.stream().filter(a -> "OPEN".equals(a.getStatus())).count(),
            "overdue", actions.stream().filter(a -> a.getDueDate() != null && a.getDueDate().isBefore(java.time.LocalDate.now()) && !"DONE".equals(a.getStatus())).count()
        ));

        // Overall health score (0-100, lower = worse)
        long totalOpen = risks.stream().filter(r -> "OPEN".equals(r.getStatus())).count()
            + issues.stream().filter(i -> "OPEN".equals(i.getStatus())).count()
            + dependencies.stream().filter(d -> "BLOCKED".equals(d.getStatus())).count();
        int healthScore = totalOpen == 0 ? 100 : Math.max(0, 100 - (int)(totalOpen * 10));
        dashboard.put("healthScore", healthScore);

        return dashboard;
    }
}
