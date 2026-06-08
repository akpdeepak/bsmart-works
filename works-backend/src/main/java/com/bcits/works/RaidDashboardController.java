package com.bcits.works;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/raid-dashboard")
public class RaidDashboardController {

    private final RiskRepository riskRepo;
    private final AssumptionRepository assumptionRepo;
    private final PmIssueRepository issueRepo;
    private final DependencyRepository dependencyRepo;
    private final ActionItemRepository actionItemRepo;

    public RaidDashboardController(RiskRepository riskRepo,
                                    AssumptionRepository assumptionRepo,
                                    PmIssueRepository issueRepo,
                                    DependencyRepository dependencyRepo,
                                    ActionItemRepository actionItemRepo) {
        this.riskRepo = riskRepo;
        this.assumptionRepo = assumptionRepo;
        this.issueRepo = issueRepo;
        this.dependencyRepo = dependencyRepo;
        this.actionItemRepo = actionItemRepo;
    }

    @GetMapping
    public Map<String, Object> getDashboard(@RequestParam String projectId) {
        List<Risk> risks = riskRepo.findByProjectIdAndDeletedAtIsNull(projectId);
        List<Assumption> assumptions = assumptionRepo.findByProjectIdAndDeletedAtIsNull(projectId);
        List<PmIssue> issues = issueRepo.findByProjectIdAndDeletedAtIsNull(projectId);
        List<Dependency> dependencies = dependencyRepo.findByProjectIdAndDeletedAtIsNull(projectId);
        List<ActionItem> actions = actionItemRepo.findByProjectIdAndDeletedAtIsNull(projectId);

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
