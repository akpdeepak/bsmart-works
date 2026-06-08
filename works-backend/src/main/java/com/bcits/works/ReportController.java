package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.List;

/**
 * Custom reports (iteration 6) — named, section-based reports plus seeded templates.
 * Mirrors the custom-dashboard pattern: owner/workspace-scoped reads, field logic
 * delegated to ReportService, every mutation recorded as an event.
 */
@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportRepository reportRepository;
    private final ReportService reportService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ReportController(ReportRepository reportRepository, ReportService reportService,
                            EventService eventService, AuthenticatedUser authenticatedUser,
                            RbacService rbac) {
        this.reportRepository = reportRepository;
        this.reportService = reportService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Report> list(@RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        return workspaceId != null
            ? reportRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId)
            : reportRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
    }

    @GetMapping("/templates")
    public List<Report> templates() {
        return reportRepository.findByIsTemplateTrueOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public Report get(@PathVariable String id) {
        Report report = reportRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), report.getWorkspaceId(), "view_items");
        return report;
    }

    @PostMapping
    public Report create(@Valid @RequestBody Report report) {
        String userId = authenticatedUser.id();
        Report saved = reportRepository.save(reportService.prepareNew(report, userId));
        eventService.record(saved.getId(), "REPORT_CREATED", userId, "{}");
        return saved;
    }

    @PutMapping("/{id}")
    public Report update(@PathVariable String id, @Valid @RequestBody Report updated) {
        Report existing = reportRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        return reportRepository.findById(id)
            .map(r -> reportRepository.save(reportService.applyUpdate(r, updated)))
            .orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Report existing = reportRepository.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "view_items");
        reportRepository.deleteById(id);
        eventService.record(id, "REPORT_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
