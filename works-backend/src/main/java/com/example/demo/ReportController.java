package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    public ReportController(ReportRepository reportRepository, ReportService reportService,
                            EventService eventService, AuthenticatedUser authenticatedUser) {
        this.reportRepository = reportRepository;
        this.reportService = reportService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
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
        return reportRepository.findById(id).orElseThrow();
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
        return reportRepository.findById(id)
            .map(existing -> reportRepository.save(reportService.applyUpdate(existing, updated)))
            .orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        reportRepository.deleteById(id);
        eventService.record(id, "REPORT_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
