package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    public ReportScheduleController(ReportScheduleRepository scheduleRepository,
                                    ReportScheduleService scheduleService,
                                    EventService eventService, AuthenticatedUser authenticatedUser) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleService = scheduleService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
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
        ReportSchedule saved = scheduleRepository.save(scheduleService.prepareNew(schedule, userId));
        eventService.record(saved.getId(), "REPORT_SCHEDULE_CREATED", userId, "{}");
        return saved;
    }

    @PutMapping("/{id}")
    public ReportSchedule update(@PathVariable String id, @Valid @RequestBody ReportSchedule updated) {
        return scheduleRepository.findById(id)
            .map(existing -> scheduleRepository.save(scheduleService.applyUpdate(existing, updated)))
            .orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        scheduleRepository.deleteById(id);
        eventService.record(id, "REPORT_SCHEDULE_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
