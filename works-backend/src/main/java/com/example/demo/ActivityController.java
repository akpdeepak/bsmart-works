package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/activity")
public class ActivityController {

    private final JdbcTemplate jdbc;

    public ActivityController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> getActivity(@PathVariable String workItemId,
                                                  @RequestParam(required = false) String eventType) {
        if (eventType != null && !eventType.isBlank()) {
            return jdbc.queryForList(
                "SELECT e.id, e.event_type, e.payload, e.occurred_at, u.full_name as actor_name " +
                "FROM events e LEFT JOIN users u ON u.id = e.actor_id " +
                "WHERE e.aggregate_id = ? AND e.event_type = ? ORDER BY e.occurred_at DESC LIMIT 50",
                workItemId, eventType);
        }
        return jdbc.queryForList(
            "SELECT e.id, e.event_type, e.payload, e.occurred_at, u.full_name as actor_name " +
            "FROM events e LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.aggregate_id = ? ORDER BY e.occurred_at DESC LIMIT 50",
            workItemId);
    }
}

