package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final WorkItemRepository workItemRepository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;

    public SprintController(SprintRepository sprintRepository, WorkItemRepository workItemRepository,
                            EventService eventService, JdbcTemplate jdbc) {
        this.sprintRepository = sprintRepository;
        this.workItemRepository = workItemRepository;
        this.eventService = eventService;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Sprint> getSprints(@RequestParam(required = false) String projectId) {
        if (projectId != null) return sprintRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return sprintRepository.findAll();
    }

    @PostMapping
    public Sprint createSprint(@RequestBody Sprint sprint,
                               @RequestHeader(value = "X-User-Id", required = false) String userId) {
        sprint.setId("SPR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        sprint.setStatus("PLANNING");
        sprint.setCreatedAt(OffsetDateTime.now());
        Sprint saved = sprintRepository.save(sprint);
        eventService.record(saved.getId(), "SPRINT_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Sprint updateSprint(@PathVariable String id, @RequestBody Sprint updated,
                               @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return sprintRepository.findById(id).map(s -> {
            String oldStatus = s.getStatus();
            s.setName(updated.getName());
            s.setGoal(updated.getGoal());
            s.setStatus(updated.getStatus());
            s.setStartDate(updated.getStartDate());
            s.setEndDate(updated.getEndDate());
            s.setCapacity(updated.getCapacity());
            Sprint saved = sprintRepository.save(s);
            if (!oldStatus.equals(saved.getStatus())) {
                eventService.record(id, "SPRINT_STATUS_CHANGED", userId,
                        "{\"from\":\"" + oldStatus + "\",\"to\":\"" + saved.getStatus() + "\"}");
            }
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSprint(@PathVariable String id) {
        // Move items back to backlog
        jdbc.update("UPDATE work_items SET sprint_id = NULL WHERE sprint_id = ?", id);
        sprintRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Get work items in this sprint
    @GetMapping("/{id}/items")
    public List<WorkItem> getSprintItems(@PathVariable String id) {
        return jdbc.query(
            "SELECT * FROM work_items WHERE sprint_id = ? ORDER BY backlog_order ASC",
            (rs, row) -> {
                WorkItem w = new WorkItem();
                w.setId(rs.getString("id"));
                w.setTitle(rs.getString("title"));
                w.setStatus(rs.getString("status"));
                w.setType(rs.getString("type"));
                w.setAssigneeId(rs.getString("assignee_id"));
                w.setSprintId(rs.getString("sprint_id"));
                w.setStoryPoints(rs.getObject("story_points") != null ? rs.getInt("story_points") : 0);
                w.setPriority(rs.getString("priority"));
                return w;
            }, id);
    }

    // Move item into sprint
    @PostMapping("/{id}/items/{itemId}")
    public Map<String, String> addItemToSprint(@PathVariable String id, @PathVariable String itemId) {
        jdbc.update("UPDATE work_items SET sprint_id = ? WHERE id = ?", id, itemId);
        return Map.of("message", "Item added to sprint");
    }

    // Remove item from sprint (back to backlog)
    @DeleteMapping("/{id}/items/{itemId}")
    public Map<String, String> removeItemFromSprint(@PathVariable String id, @PathVariable String itemId) {
        jdbc.update("UPDATE work_items SET sprint_id = NULL WHERE id = ? AND sprint_id = ?", itemId, id);
        return Map.of("message", "Item moved to backlog");
    }

    // Sprint report data
    @GetMapping("/{id}/report")
    public Map<String, Object> getSprintReport(@PathVariable String id) {
        Sprint sprint = sprintRepository.findById(id).orElseThrow();
        List<Map<String, Object>> items = jdbc.queryForList(
            "SELECT id, title, status, type, story_points, assignee_id FROM work_items WHERE sprint_id = ?", id);

        int total = items.size();
        long done = items.stream().filter(i -> "Done".equals(i.get("status"))).count();
        long inProgress = items.stream().filter(i -> "In Progress".equals(i.get("status"))).count();
        long todo = items.stream().filter(i -> "Todo".equals(i.get("status"))).count();
        int totalPoints = items.stream().mapToInt(i -> i.get("story_points") != null ? (int)i.get("story_points") : 0).sum();
        long donePoints = items.stream().filter(i -> "Done".equals(i.get("status")))
                .mapToInt(i -> i.get("story_points") != null ? (int)i.get("story_points") : 0).sum();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("sprint", sprint);
        report.put("totalItems", total);
        report.put("doneItems", done);
        report.put("inProgressItems", inProgress);
        report.put("todoItems", todo);
        report.put("totalPoints", totalPoints);
        report.put("donePoints", donePoints);
        report.put("completionRate", total > 0 ? Math.round((done * 100.0) / total) : 0);
        report.put("velocityRate", totalPoints > 0 ? Math.round((donePoints * 100.0) / totalPoints) : 0);
        report.put("items", items);
        return report;
    }
}


