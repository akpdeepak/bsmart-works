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
 * Scheduled report deliveries (iteration 6). Owner-scoped CRUD for schedules; the
 * actual delivery is performed by {@link ReportDeliveryScheduler}. Field logic is
 * delegated to {@link ReportScheduleService}.
 */
@RestController
@RequestMapping("/api/v1/report-schedules")
public class ReportScheduleController {

    private final ReportScheduleRepository scheduleRepository;
    private final ReportScheduleService scheduleService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final ReportRepository reportRepository;
    private final RbacService rbac;

    public ReportScheduleController(ReportScheduleRepository scheduleRepository,
                                    ReportScheduleService scheduleService,
                                    EventService eventService, AuthenticatedUser authenticatedUser,
                                    ReportRepository reportRepository, RbacService rbac) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleService = scheduleService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.reportRepository = reportRepository;
        this.rbac = rbac;
    }

    /**
     * A schedule has no workspace_id of its own — it is scoped transitively through its report
     * (RB-40 §1, #243 Slice D). The caller must be a member of the report's workspace. 404 on an
     * unknown/foreign report so existence is not revealed.
     */
    private void requireReportAccess(String reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> ApiException.notFound("Report", reportId));
        rbac.require(authenticatedUser.id(), report.getWorkspaceId(), "view_reports");
    }

    @GetMapping
    public List<ReportSchedule> list(@RequestParam(required = false) String reportId) {
        return reportId != null
            ? scheduleRepository.findByReportIdOrderByCreatedAtDesc(reportId)
            : scheduleRepository.findByOwnerIdOrderByCreatedAtDesc(authenticatedUser.id());
    }

    @PostMapping
    public ReportSchedule create(@Valid @RequestBody ReportSchedule schedule) {
        String userId = authenticatedUser.id();
        requireReportAccess(schedule.getReportId());
        ReportSchedule saved = scheduleRepository.save(scheduleService.prepareNew(schedule, userId));
        eventService.record(saved.getId(), "REPORT_SCHEDULE_CREATED", userId, "{}");
        return saved;
    }

    @PutMapping("/{id}")
    public ReportSchedule update(@PathVariable String id, @Valid @RequestBody ReportSchedule updated) {
        // findById bypasses @Filter (#243 Slice D) — re-check the schedule's report workspace.
        ReportSchedule existing = scheduleRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("ReportSchedule", id));
        requireReportAccess(existing.getReportId());
        return scheduleRepository.save(scheduleService.applyUpdate(existing, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        ReportSchedule existing = scheduleRepository.findById(id)
            .orElseThrow(() -> ApiException.notFound("ReportSchedule", id));
        requireReportAccess(existing.getReportId());
        scheduleRepository.deleteById(id);
        eventService.record(id, "REPORT_SCHEDULE_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
