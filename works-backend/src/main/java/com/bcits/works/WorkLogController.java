package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/worklogs")
public class WorkLogController {

    private final WorkLogRepository workLogRepository;
    private final AuthenticatedUser authenticatedUser;
    private final JdbcTemplate jdbc;

    public WorkLogController(WorkLogRepository workLogRepository, AuthenticatedUser authenticatedUser, JdbcTemplate jdbc) {
        this.workLogRepository = workLogRepository;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<WorkLog> getWorklogs(@RequestParam(required = false) String workItemId,
                                      @RequestParam(required = false) String userId) {
        if (workItemId != null) return workLogRepository.findByWorkItemIdOrderByWorkDateDesc(workItemId);
        if (userId != null) return workLogRepository.findByUserIdOrderByWorkDateDesc(userId);
        return workLogRepository.findAll();
    }

    @PostMapping
    public WorkLog createWorkLog(@Valid @RequestBody WorkLog workLog) {
        String userId = authenticatedUser.id();
        workLog.setUserId(userId);
        if (workLog.getWorkDate() == null) workLog.setWorkDate(LocalDate.now());
        workLog.setCreatedAt(OffsetDateTime.now());
        WorkLog saved = workLogRepository.save(workLog);
        // Update remaining estimate if provided
        if (workLog.getWorkItemId() != null) {
            jdbc.update("UPDATE work_items SET remaining_estimate_minutes = " +
                        "GREATEST(0, COALESCE(remaining_estimate_minutes, 0) - ?) " +
                        "WHERE id = ?", workLog.getTimeSpentMinutes(), workLog.getWorkItemId());
        }
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkLog(@PathVariable Long id) {
        workLogRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary/{workItemId}")
    public Map<String, Object> getWorklogSummary(@PathVariable String workItemId) {
        Integer totalMinutes = jdbc.queryForObject(
            "SELECT COALESCE(SUM(time_spent_minutes), 0) FROM worklogs WHERE work_item_id = ?",
            Integer.class, workItemId);
        Map<String, Object> estimates = jdbc.queryForMap(
            "SELECT original_estimate_minutes, remaining_estimate_minutes FROM work_items WHERE id = ?", workItemId);
        return Map.of(
            "totalLoggedMinutes", totalMinutes != null ? totalMinutes : 0,
            "originalEstimateMinutes", estimates.getOrDefault("original_estimate_minutes", 0),
            "remainingEstimateMinutes", estimates.getOrDefault("remaining_estimate_minutes", 0)
        );
    }
}
