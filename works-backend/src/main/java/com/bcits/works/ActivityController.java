package com.bcits.works;

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
        String base = "SELECT e.id, e.event_type, e.payload, e.occurred_at, e.field_name, e.old_value, e.new_value, u.full_name as actor_name " +
            "FROM events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.aggregate_id = ?";
        if (eventType != null && !eventType.isBlank()) {
            return jdbc.queryForList(base + " AND e.event_type = ? ORDER BY e.occurred_at DESC LIMIT 50", workItemId, eventType);
        }
        return jdbc.queryForList(base + " ORDER BY e.occurred_at DESC LIMIT 50", workItemId);
    }
}
