package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Static export of a report or a dashboard to PDF / Excel / PNG, for stakeholders without Works
 * access (Cap J, spec {@code 06 §J}). Read-only.
 *
 * <p><b>Tenant isolation + RBAC (RB-40 §1, RB-10 §2).</b> The {@code workspaceId} is taken from the
 * <i>persisted</i> report/dashboard, never from a request param, so the caller cannot point an
 * export at another tenant's data. Membership is then proven with {@code view_items} <i>before</i>
 * any work-item row is read; a non-member gets 403, an unknown id gets 404 (the {@code orElseThrow}
 * → {@link java.util.NoSuchElementException} → 404 mapping in {@link GlobalExceptionHandler}).
 *
 * <p>The actual file bytes come from {@link ExportService} (one workspace-scoped table, three
 * dependency-free renderers).
 */
@RestController
public class ExportController {

    private final ReportRepository reportRepository;
    private final DashboardRepository dashboardRepository;
    private final ExportService exportService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ExportController(ReportRepository reportRepository, DashboardRepository dashboardRepository,
                            ExportService exportService, AuthenticatedUser authenticatedUser,
                            RbacGate rbac) {
        this.reportRepository = reportRepository;
        this.dashboardRepository = dashboardRepository;
        this.exportService = exportService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/api/v1/reports/{id}/export")
    public ResponseEntity<byte[]> exportReport(@PathVariable String id,
                                               @RequestParam(required = false) String format) {
        Report report = reportRepository.findById(id).orElseThrow();
        return export(report.getWorkspaceId(), report.getName(), format);
    }

    @GetMapping("/api/v1/dashboards/{id}/export")
    public ResponseEntity<byte[]> exportDashboard(@PathVariable String id,
                                                  @RequestParam(required = false) String format) {
        Dashboard dashboard = dashboardRepository.findById(id).orElseThrow();
        return export(dashboard.getWorkspaceId(), dashboard.getName(), format);
    }

    // Shared path: authorize against the entity's own workspace, then render. RBAC stays here in the
    // boundary (the service trusts a clean, already-authorized call), the workspace predicate is
    // mandatory inside ExportService — so an export can never escape its tenant (RB-40 §1).
    private ResponseEntity<byte[]> export(String workspaceId, String title, String format) {
        ExportService.Format fmt = ExportService.Format.parse(format);
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        ExportService.Export out = exportService.render(workspaceId, title, fmt);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(out.contentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + out.filename() + "\"")
            .body(out.body());
    }
}
