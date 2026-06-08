package com.bcits.works;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Sprints", description = "Sprint lifecycle, velocity charts, scope-change timeline, and item assignment")
@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final WorkItemRepository workItemRepository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SprintController(SprintRepository sprintRepository, WorkItemRepository workItemRepository,
                            EventService eventService, JdbcTemplate jdbc,
                            AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.sprintRepository = sprintRepository;
        this.workItemRepository = workItemRepository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "List sprints", description = "Returns sprints for the authenticated user's workspaces. Filter by projectId to scope to a single project.")
    @GetMapping
    public List<Sprint> getSprints(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only sprints in their workspaces' projects.
        List<Sprint> sprints = projectId != null
            ? sprintRepository.findByProjectIdScopedToUser(projectId, userId)
            : sprintRepository.findAllScopedToUser(userId);
        // Attach actual used story points per sprint
        sprints.forEach(s -> {
            Integer used = jdbc.queryForObject(
                "SELECT COALESCE(SUM(story_points), 0) FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL",
                Integer.class, s.getId());
            s.setUsedPoints(used != null ? used : 0);
        });
        return sprints;
    }

    @Operation(summary = "Create sprint", description = "Creates a new sprint in PLANNING state. Requires manage_sprints permission.")
    @PostMapping
    public Sprint createSprint(@Valid @RequestBody Sprint sprint) {
        String userId = authenticatedUser.id();
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "manage_sprints"); {
        sprint.setId("SPR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        sprint.setStatus("PLANNING");
        sprint.setCreatedAt(OffsetDateTime.now());
        Sprint saved = sprintRepository.save(sprint);
        eventService.record(saved.getId(), "SPRINT_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Sprint updateSprint(@PathVariable String id, @Valid @RequestBody Sprint updated) {
        String userId = authenticatedUser.id();
        Sprint existing = sprintRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "manage_sprints"); {
        return sprintRepository.findById(id).map(s -> {
        }
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
        String userId = authenticatedUser.id();
        Sprint existing = sprintRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "manage_sprints");
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
                w.setParentId(rs.getString("parent_id"));
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

    // Multi-sprint velocity chart data
    @Operation(summary = "Velocity chart", description = "Returns story-point completion data across all sprints for the authenticated user's workspaces.")
    @GetMapping("/velocity")
    public List<Map<String, Object>> getVelocityChart() {
        // Workspace-scoped (RB-40 §1 / B04): caller sees only sprints in their own workspaces.
        List<Sprint> sprints = sprintRepository.findAllScopedToUser(authenticatedUser.id());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Sprint sprint : sprints) {
            List<Map<String, Object>> items = jdbc.queryForList(
                "SELECT status, story_points FROM work_items WHERE sprint_id = ?", sprint.getId());
            int totalPoints = items.stream().mapToInt(i -> i.get("story_points") != null ? ((Number) i.get("story_points")).intValue() : 0).sum();
            int donePoints = items.stream().filter(i -> "Done".equals(i.get("status")))
                    .mapToInt(i -> i.get("story_points") != null ? ((Number) i.get("story_points")).intValue() : 0).sum();
            int totalItems = items.size();
            long doneItems = items.stream().filter(i -> "Done".equals(i.get("status"))).count();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("sprintId", sprint.getId());
            entry.put("sprintName", sprint.getName());
            entry.put("status", sprint.getStatus());
            entry.put("capacity", sprint.getCapacity() != null ? sprint.getCapacity() : 0);
            entry.put("totalPoints", totalPoints);
            entry.put("donePoints", donePoints);
            entry.put("totalItems", totalItems);
            entry.put("doneItems", doneItems);
            result.add(entry);
        }
        return result;
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

    /**
     * Scope-change timeline: items added to or removed from this sprint after it was started.
     * Derived from the events table — looks for SPRINT_ITEM_ADDED / SPRINT_ITEM_REMOVED events,
     * and also WORK_ITEM_UPDATED events where field_name = 'sprint_id' and new_value = sprintId.
     */
    @GetMapping("/{id}/scope-changes")
    public List<Map<String, Object>> getScopeChanges(@PathVariable String id) {
        // Items added (sprint_id changed TO this sprint after sprint started)
        List<Map<String, Object>> added = jdbc.queryForList(
            "SELECT e.occurred_at, 'ADDED' as change_type, e.aggregate_id as work_item_id, " +
            "       wi.title, wi.type, u.full_name as actor_name " +
            "FROM events e " +
            "LEFT JOIN work_items wi ON wi.id = e.aggregate_id " +
            "LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.field_name = 'sprint_id' AND e.new_value = ? " +
            "ORDER BY e.occurred_at ASC", id);

        // Items removed (sprint_id changed FROM this sprint)
        List<Map<String, Object>> removed = jdbc.queryForList(
            "SELECT e.occurred_at, 'REMOVED' as change_type, e.aggregate_id as work_item_id, " +
            "       wi.title, wi.type, u.full_name as actor_name " +
            "FROM events e " +
            "LEFT JOIN work_items wi ON wi.id = e.aggregate_id " +
            "LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.field_name = 'sprint_id' AND e.old_value = ? " +
            "ORDER BY e.occurred_at ASC", id);

        List<Map<String, Object>> all = new ArrayList<>(added);
        all.addAll(removed);
        all.sort(Comparator.comparing(m -> m.get("occurred_at").toString()));
        return all;
    }
}

