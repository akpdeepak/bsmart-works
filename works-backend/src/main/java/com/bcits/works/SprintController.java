package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Sprints", description = "Sprint lifecycle, velocity charts, scope-change timeline, and item assignment")
@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final WorkItemRepository workItemRepository;
    private final EventService eventService;
    private final SprintDao sprintDao;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final StatusConfigService statusConfig;

    public SprintController(SprintRepository sprintRepository, WorkItemRepository workItemRepository,
                            EventService eventService, SprintDao sprintDao,
                            AuthenticatedUser authenticatedUser, RbacService rbac,
                            StatusConfigService statusConfig) {
        this.sprintRepository = sprintRepository;
        this.workItemRepository = workItemRepository;
        this.eventService = eventService;
        this.sprintDao = sprintDao;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.statusConfig = statusConfig;
    }

    // Resolve an item's board category (TODO | IN_PROGRESS | DONE) from the workspace's configured
    // per-type workflow, so renamed/custom statuses (e.g. "Completed", "Shipped") are counted in the
    // right bucket — matching how the Board/Sprint surfaces classify done (RB-20 §4, RB-10 §6). Falls
    // back to the canonical status name when no config exists (legacy rows / unseeded workspace).
    // Cached per workspace|type so a multi-item report reads each type's config at most once.
    private String resolveCategory(String wsId, String type, String status,
                                   Map<String, Map<String, String>> cache) {
        if (status == null) return StatusCategoryResolver.TODO;
        Map<String, String> byName = (wsId == null || type == null)
                ? Map.of()
                : cache.computeIfAbsent(wsId + "|" + type, k -> {
                    Map<String, String> m = new HashMap<>();
                    for (WorkflowStatus ws : statusConfig.statusesForType(wsId, type)) {
                        if (ws.getName() != null) {
                            m.put(StatusCategoryResolver.normalize(ws.getName()), ws.getCategory());
                        }
                    }
                    return m;
                });
        return StatusCategoryResolver.from(byName).apply(status);
    }

    @Operation(summary = "List sprints", description = "Returns sprints for the authenticated user's workspaces. Filter by projectId to scope to a single project.")
    @GetMapping
    public List<Sprint> getSprints(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only sprints in their workspaces' projects.
        List<Sprint> sprints = projectId != null
            ? sprintRepository.findByProjectIdScopedToUser(projectId, userId)
            : sprintRepository.findAllScopedToUser(userId);
        // Attach actual used story points per sprint — batched into a single grouped query to
        // avoid an N+1 (previously one SUM query per sprint).
        if (!sprints.isEmpty()) {
            List<String> sprintIds = sprints.stream().map(Sprint::getId).toList();
            Map<String, Integer> usedBySprint = sprintDao.usedPointsBySprint(sprintIds);
            sprints.forEach(s -> s.setUsedPoints(usedBySprint.getOrDefault(s.getId(), 0)));
        }
        return sprints;
    }

    @Operation(summary = "Create sprint", description = "Creates a new sprint in PLANNING state. Requires manage_sprints permission.")
    @PostMapping
    public Sprint createSprint(@Valid @RequestBody Sprint sprint) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): resolve the project's workspace and require manage_sprints.
        // A null workspace means the project does not exist / is not visible — reject rather than
        // create an orphan sprint.
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId == null) throw ApiException.notFound("Project", sprint.getProjectId());
        rbac.require(userId, wsId, "manage_sprints");
        sprint.setId("SPR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
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
        if (wsId != null) rbac.require(userId, wsId, "manage_sprints");
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
        String userId = authenticatedUser.id();
        Sprint existing = sprintRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "manage_sprints");
        // Move items back to backlog
        sprintDao.clearSprintFromItems(id);
        sprintRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Get work items in this sprint
    @GetMapping("/{id}/items")
    public List<WorkItem> getSprintItems(@PathVariable String id) {
        // Workspace-scoped (RB-40 §1): the caller must have access to the sprint's workspace,
        // otherwise another tenant's items would leak through a guessed/known sprint id.
        Sprint sprint = sprintRepository.findById(id).orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Sprint", id);
        }
        return sprintDao.itemsForSprint(id);
    }

    // Move item into sprint
    @PostMapping("/{id}/items/{itemId}")
    public Map<String, String> addItemToSprint(@PathVariable String id, @PathVariable String itemId) {
        String userId = authenticatedUser.id();
        Sprint sprint = sprintRepository.findById(id).orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId == null) throw ApiException.notFound("Sprint", id);
        rbac.require(userId, wsId, "manage_sprints");
        // The item must live in the sprint's workspace — never pull another tenant's item in (RB-40 §1).
        if (!wsId.equals(rbac.workspaceForWorkItem(itemId))) throw ApiException.notFound("Work item", itemId);
        sprintDao.assignItemToSprint(id, itemId);
        return Map.of("message", "Item added to sprint");
    }

    // Remove item from sprint (back to backlog)
    @DeleteMapping("/{id}/items/{itemId}")
    public Map<String, String> removeItemFromSprint(@PathVariable String id, @PathVariable String itemId) {
        String userId = authenticatedUser.id();
        Sprint sprint = sprintRepository.findById(id).orElseThrow(() -> ApiException.notFound("Sprint", id));
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId == null) throw ApiException.notFound("Sprint", id);
        rbac.require(userId, wsId, "manage_sprints");
        sprintDao.removeItemFromSprint(itemId, id);
        return Map.of("message", "Item moved to backlog");
    }

    // Multi-sprint velocity chart data
    @Operation(summary = "Velocity chart", description = "Returns story-point completion data across all sprints for the authenticated user's workspaces.")
    @GetMapping("/velocity")
    public List<Map<String, Object>> getVelocityChart() {
        // Workspace-scoped (RB-40 §1 / B04): caller sees only sprints in their own workspaces.
        List<Sprint> sprints = sprintRepository.findAllScopedToUser(authenticatedUser.id());
        Map<String, Map<String, String>> catCache = new HashMap<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Sprint sprint : sprints) {
            String wsId = rbac.workspaceForProject(sprint.getProjectId());
            List<Map<String, Object>> items = sprintDao.velocityItems(sprint.getId());
            int totalPoints = items.stream()
                    .mapToInt(i -> i.get("story_points") != null
                            ? ((Number) i.get("story_points")).intValue() : 0)
                    .sum();
            // Count by resolved status category, not the literal "Done" — so renamed/custom done
            // statuses are credited (RB-20 §4); was previously under-counting those workspaces.
            java.util.function.Predicate<Map<String, Object>> isDone = i ->
                    StatusCategoryResolver.DONE.equals(
                            resolveCategory(wsId, (String) i.get("type"), (String) i.get("status"), catCache));
            int donePoints = items.stream().filter(isDone)
                    .mapToInt(i -> i.get("story_points") != null ? ((Number) i.get("story_points")).intValue() : 0).sum();
            int totalItems = items.size();
            long doneItems = items.stream().filter(isDone).count();
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
        String wsId = rbac.workspaceForProject(sprint.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Sprint", id);
        }
        // Enriched item set drives the report's breakdowns (by type / assignee / priority) and the
        // at-risk list — assignee resolved to a display name, plus priority + due date (RB-20 §4:
        // the report should show the full picture, not just counts).
        List<Map<String, Object>> items = sprintDao.reportItems(id);

        // Bucket by resolved status category (not literal "Done"/"In Progress"/"Todo") so workspaces
        // with renamed/custom statuses report accurate completion (RB-20 §4); cached per type.
        Map<String, Map<String, String>> catCache = new HashMap<>();
        java.util.function.Function<Map<String, Object>, String> catOf = i ->
                resolveCategory(wsId, (String) i.get("type"), (String) i.get("status"), catCache);

        int total = items.size();
        long done = items.stream().filter(i -> StatusCategoryResolver.DONE.equals(catOf.apply(i))).count();
        long inProgress = items.stream()
                .filter(i -> StatusCategoryResolver.IN_PROGRESS.equals(catOf.apply(i))).count();
        long todo = items.stream().filter(i -> StatusCategoryResolver.TODO.equals(catOf.apply(i))).count();
        int totalPoints = items.stream().mapToInt(i -> i.get("story_points") != null ? (int)i.get("story_points") : 0).sum();
        long donePoints = items.stream().filter(i -> StatusCategoryResolver.DONE.equals(catOf.apply(i)))
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
        List<Map<String, Object>> added = sprintDao.scopeChangesAdded(id);

        // Items removed (sprint_id changed FROM this sprint)
        List<Map<String, Object>> removed = sprintDao.scopeChangesRemoved(id);

        List<Map<String, Object>> all = new ArrayList<>(added);
        all.addAll(removed);
        all.sort(Comparator.comparing(m -> m.get("occurred_at").toString()));
        return all;
    }
}
