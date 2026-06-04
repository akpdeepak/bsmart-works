package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items")
public class WorkItemController {

    private final WorkItemRepository repository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationBatchService batchService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final SlaEngineService slaEngine;

    public WorkItemController(WorkItemRepository repository, EventService eventService,
                              JdbcTemplate jdbc, NotificationRepository notificationRepository,
                              UserRepository userRepository, EmailService emailService,
                              NotificationBatchService batchService, AuthenticatedUser authenticatedUser,
                              RbacService rbac, SlaEngineService slaEngine) {
        this.repository = repository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.batchService = batchService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.slaEngine = slaEngine;
    }

    @GetMapping
    public List<WorkItem> getAllWorkItems(@RequestParam(required = false) String parentId) {
        String userId = authenticatedUser.id();
        List<WorkItem> items;
        if (parentId != null) {
            items = jdbc.query("SELECT * FROM work_items WHERE parent_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
                this::mapRow, parentId);
        } else {
            items = jdbc.query("SELECT * FROM work_items WHERE deleted_at IS NULL ORDER BY created_at ASC", this::mapRow);
        }
        attachTagsBatch(items);
        attachStarred(items, userId);
        return items;
    }

    @GetMapping("/trash")
    public List<WorkItem> getTrash() {
        List<WorkItem> items = jdbc.query(
            "SELECT * FROM work_items WHERE deleted_at IS NOT NULL AND deleted_at > NOW() - INTERVAL '30 days' ORDER BY deleted_at DESC",
            this::mapRow);
        attachTagsBatch(items);
        return items;
    }

    @PutMapping("/{id}/restore")
    public WorkItem restoreFromTrash(@PathVariable String id) {
        jdbc.update("UPDATE work_items SET deleted_at = NULL, deleted_by = NULL WHERE id = ?", id);
        var opt = repository.findById(id);
        if (opt.isEmpty()) throw ApiException.notFound("Work item", id);
        attachTags(opt.get());
        return opt.get();
    }

    // Star / unstar
    @PostMapping("/{id}/star")
    public Map<String, Object> starItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        jdbc.update("INSERT INTO starred_items (user_id, work_item_id) VALUES (?,?) ON CONFLICT DO NOTHING", userId, id);
        return Map.of("starred", true, "itemId", id);
    }

    @DeleteMapping("/{id}/star")
    public Map<String, Object> unstarItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        jdbc.update("DELETE FROM starred_items WHERE user_id = ? AND work_item_id = ?", userId, id);
        return Map.of("starred", false, "itemId", id);
    }

    @GetMapping("/starred")
    public List<WorkItem> getStarred() {
        String userId = authenticatedUser.id();
        List<WorkItem> items = jdbc.query(
            "SELECT wi.* FROM work_items wi JOIN starred_items si ON si.work_item_id = wi.id WHERE si.user_id = ? AND wi.deleted_at IS NULL ORDER BY si.created_at DESC",
            this::mapRow, userId);
        attachTagsBatch(items);
        items.forEach(i -> i.setStarred(true));
        return items;
    }

    @GetMapping("/search")
    public List<WorkItem> search(@RequestParam String q) {
        String userId = authenticatedUser.id();
        // Starred items get priority in search results. Match spans title, description,
        // and any comment body (spec: full-text search covers comments too). EXISTS keeps
        // one row per item — no duplicates from the comment join.
        String sql = "SELECT wi.*, (CASE WHEN si.work_item_id IS NOT NULL THEN 1 ELSE 0 END) AS is_starred " +
            "FROM work_items wi LEFT JOIN starred_items si ON si.work_item_id = wi.id AND si.user_id = ? " +
            "WHERE wi.deleted_at IS NULL AND (wi.title ILIKE ? OR wi.description ILIKE ? " +
            "OR EXISTS (SELECT 1 FROM comments c WHERE c.work_item_id = wi.id AND c.body ILIKE ?)) " +
            "ORDER BY is_starred DESC, wi.created_at DESC LIMIT 20";
        String pattern = "%" + q + "%";
        List<WorkItem> items = jdbc.query(sql, (rs, row) -> {
            WorkItem w = mapRow(rs, row);
            try { w.setStarred(rs.getInt("is_starred") == 1); } catch (Exception ignored) {}
            return w;
        }, userId, pattern, pattern, pattern);
        attachTagsBatch(items);
        return items;
    }

    @GetMapping("/backlog")
    public List<WorkItem> getBacklog(@RequestParam(required = false) String projectId) {
        String sql = "SELECT * FROM work_items WHERE sprint_id IS NULL" +
                (projectId != null ? " AND project_id = ?" : "") +
                " ORDER BY backlog_order ASC, created_at ASC";
        return projectId != null
                ? jdbc.query(sql, this::mapRow, projectId)
                : jdbc.query(sql, this::mapRow);
    }

    @PutMapping("/backlog/reorder")
    public void reorderBacklog(@Valid @RequestBody java.util.List<java.util.Map<String, Object>> items) {
        items.forEach(item -> {
            int order = ((Number) item.get("order")).intValue();
            jdbc.update("UPDATE work_items SET backlog_order = ? WHERE id = ?", order, item.get("id"));
        });
    }

    private WorkItem mapRow(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        WorkItem w = new WorkItem();
        w.setId(rs.getString("id"));
        w.setTitle(rs.getString("title"));
        w.setStatus(rs.getString("status"));
        w.setType(rs.getString("type"));
        w.setAssigneeId(rs.getString("assignee_id"));
        w.setSprintId(rs.getString("sprint_id"));
        w.setStoryPoints(rs.getObject("story_points") != null ? rs.getInt("story_points") : 0);
        w.setPriority(rs.getString("priority"));
        w.setDueDate(rs.getDate("due_date") != null ? rs.getDate("due_date").toLocalDate() : null);
        w.setProjectId(rs.getString("project_id"));
        w.setParentId(rs.getString("parent_id"));
        return w;
    }

    @GetMapping("/my")
    public List<WorkItem> myWorkItems(@RequestParam(required = false) String userId) {
        String requestedUserId = authenticatedUser.id();
        List<WorkItem> items = repository.findByAssigneeId(requestedUserId);
        attachTagsBatch(items);
        return items;
    }

    @PostMapping
    public WorkItem createWorkItem(@Valid @RequestBody WorkItem newItem) {
        String userId = authenticatedUser.id();
        String wsId = rbac.workspaceForProject(newItem.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "create_items");
        String prefix = newItem.getProjectId() != null ? newItem.getProjectId().replace("PROJ-", "") : "WEB";
        newItem.setId(prefix + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        newItem.setStatus("Todo");
        newItem.setCreatedBy(userId);
        newItem.setCreatedAt(OffsetDateTime.now());
        if (newItem.getProjectId() == null) newItem.setProjectId("PROJ-001");

        WorkItem saved = repository.save(newItem);

        if (newItem.getTags() != null) {
            saveTags(saved.getId(), newItem.getTags());
        }

        eventService.record(saved.getId(), "WORK_ITEM_CREATED", userId,
                "{\"title\":\"" + saved.getTitle() + "\",\"type\":\"" + saved.getType() + "\"}");

        // Attach any active SLA policies whose scope this new item falls into (iteration 8).
        slaEngine.onWorkItemCreated(saved.getId(), saved.getProjectId(), userId);

        // Notify assignee (in-app + email)
        if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(userId)) {
            createNotification(saved.getAssigneeId(), "ASSIGNED",
                    "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            String actorName = userRepository.findById(userId != null ? userId : "").map(User::getFullName).orElse("Someone");
            emailService.sendAssignmentEmail(saved.getAssigneeId(), actorName, saved.getId(), saved.getTitle());
        }

        attachTags(saved);
        return saved;
    }

    @PutMapping("/{id}")
    public WorkItem updateWorkItem(@PathVariable String id, @Valid @RequestBody WorkItem updatedItem) {
        String userId = authenticatedUser.id();
        WorkItem existing0 = repository.findById(id).orElseThrow(() -> ApiException.notFound("Work item", id));
        String wsId = rbac.workspaceForProject(existing0.getProjectId());
        if (wsId != null) {
            if (!rbac.canEdit(userId, wsId, existing0.getCreatedBy(), existing0.getAssigneeId())) {
                throw ApiException.forbidden("You do not have permission to edit this work item.");
            }
        }
        return repository.findById(id).map(existing -> {
            // Optimistic concurrency — reject a stale write (no-op if the client sent no version).
            ConcurrencyGuard.requireCurrentVersion(existing.getVersion(), updatedItem.getVersion());
            String oldStatus = existing.getStatus();
            String oldAssignee = existing.getAssigneeId();
            String oldPriority = existing.getPriority();
            String oldTitle = existing.getTitle();
            java.time.LocalDate oldDueDate = existing.getDueDate();
            String oldType = existing.getType();
            Integer oldStoryPoints = existing.getStoryPoints();
            String oldDescription = existing.getDescription();
            List<String> oldTags = jdbc.queryForList("SELECT tag FROM tags WHERE work_item_id = ? ORDER BY tag", String.class, id);

            existing.setTitle(updatedItem.getTitle());
            existing.setStatus(updatedItem.getStatus());
            existing.setType(updatedItem.getType());
            existing.setDescription(updatedItem.getDescription());
            existing.setAssigneeId(updatedItem.getAssigneeId());
            existing.setDueDate(updatedItem.getDueDate());
            existing.setSprintId(updatedItem.getSprintId());
            existing.setStoryPoints(updatedItem.getStoryPoints());
            existing.setPriority(updatedItem.getPriority());
            existing.setParentId(updatedItem.getParentId());
            existing.setVersion(ConcurrencyGuard.nextVersion(existing.getVersion()));

            WorkItem saved = repository.save(existing);

            if (updatedItem.getTags() != null) {
                jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
                saveTags(id, updatedItem.getTags());
            }

            // Record field-level diffs
            if (!java.util.Objects.equals(oldStatus, saved.getStatus())) {
                eventService.recordDiff(id, "STATUS_CHANGED", userId, "status", oldStatus, saved.getStatus());
                // Drive SLA clocks: start / pause / resume / fulfil on the new status (iteration 8).
                slaEngine.onStatusChange(id, saved.getProjectId(), oldStatus, saved.getStatus(), userId);
            }
            if (!java.util.Objects.equals(oldAssignee, saved.getAssigneeId())) {
                String oldName = oldAssignee != null ? userRepository.findById(oldAssignee).map(u -> u.getFullName()).orElse(oldAssignee) : "unassigned";
                String newName = saved.getAssigneeId() != null ? userRepository.findById(saved.getAssigneeId()).map(u -> u.getFullName()).orElse(saved.getAssigneeId()) : "unassigned";
                eventService.recordDiff(id, "ASSIGNED", userId, "assignee", oldName, newName);
            }
            if (!java.util.Objects.equals(oldPriority, saved.getPriority())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "priority", oldPriority, saved.getPriority());
            }
            if (!java.util.Objects.equals(oldTitle, saved.getTitle())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "title", oldTitle, saved.getTitle());
            }
            if (!java.util.Objects.equals(oldDueDate, saved.getDueDate())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "dueDate",
                    oldDueDate != null ? oldDueDate.toString() : "none",
                    saved.getDueDate() != null ? saved.getDueDate().toString() : "none");
            }
            if (!java.util.Objects.equals(oldType, saved.getType())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "type", oldType, saved.getType());
            }
            if (!java.util.Objects.equals(oldStoryPoints, saved.getStoryPoints())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "storyPoints",
                    String.valueOf(oldStoryPoints != null ? oldStoryPoints : 0),
                    String.valueOf(saved.getStoryPoints() != null ? saved.getStoryPoints() : 0));
            }
            // Description changed (track as boolean — text too large for event store)
            if (!java.util.Objects.equals(oldDescription, saved.getDescription())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "description", "edited", "edited");
            }
            // Tags diff
            if (updatedItem.getTags() != null) {
                List<String> newTags = updatedItem.getTags();
                if (!oldTags.equals(newTags.stream().sorted().toList())) {
                    eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "tags",
                        String.join(", ", oldTags), String.join(", ", newTags));
                }
            }

            // Notify new assignee (in-app + email)
            String newAssignee = saved.getAssigneeId();
            if (newAssignee != null && !newAssignee.equals(oldAssignee) && !newAssignee.equals(userId)) {
                createNotification(newAssignee, "ASSIGNED",
                        "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
                String actorName = userRepository.findById(userId != null ? userId : "").map(User::getFullName).orElse("Someone");
                emailService.sendAssignmentEmail(newAssignee, actorName, saved.getId(), saved.getTitle());
            }

            attachTags(saved);
            return saved;
        }).orElseThrow(() -> ApiException.notFound("Work item", id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        var opt = repository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.<Void>notFound().build();
        var item = opt.get();
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId != null) rbac.require(userId, wsId, "delete_items");
        // Soft delete — keep for 30 days in trash
        jdbc.update("UPDATE work_items SET deleted_at = NOW(), deleted_by = ? WHERE id = ?", userId, id);
        eventService.record(id, "WORK_ITEM_DELETED", userId,
                "{\"title\":\"" + item.getTitle().replace("\"", "'") + "\"}");
        return ResponseEntity.<Void>noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDelete(@PathVariable String id) {
        var opt = repository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.<Void>notFound().build();
        var item = opt.get();
        jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM comments WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM work_item_links WHERE source_id = ? OR target_id = ?", id, id);
        jdbc.update("DELETE FROM attachments WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM starred_items WHERE work_item_id = ?", id);
        repository.delete(item);
        return ResponseEntity.<Void>noContent().build();
    }

    private void attachStarred(List<WorkItem> items, String userId) {
        if (items.isEmpty()) return;
        List<String> starredIds = jdbc.queryForList(
            "SELECT work_item_id FROM starred_items WHERE user_id = ?", String.class, userId);
        java.util.Set<String> starredSet = new java.util.HashSet<>(starredIds);
        items.forEach(i -> i.setStarred(starredSet.contains(i.getId())));
    }

    private void attachTags(WorkItem item) {
        List<String> tags = jdbc.queryForList(
                "SELECT tag FROM tags WHERE work_item_id = ? ORDER BY id", String.class, item.getId());
        item.setTags(tags);
    }

    /**
     * Batch-load tags for a list of work items in ONE query, avoiding the N+1
     * pattern of calling attachTags() per item (e.g. 351 items -> 351 queries).
     */
    private void attachTagsBatch(List<WorkItem> items) {
        if (items.isEmpty()) return;
        List<String> ids = items.stream().map(WorkItem::getId).toList();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        java.util.Map<String, List<String>> tagsByItem = new java.util.HashMap<>();
        jdbc.query(
            "SELECT work_item_id, tag FROM tags WHERE work_item_id IN (" + placeholders + ") ORDER BY id",
            (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                tagsByItem.computeIfAbsent(rs.getString("work_item_id"), k -> new java.util.ArrayList<>())
                          .add(rs.getString("tag")),
            ids.toArray());
        items.forEach(i -> i.setTags(tagsByItem.getOrDefault(i.getId(), new java.util.ArrayList<>())));
    }

    private void saveTags(String workItemId, List<String> tags) {
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                jdbc.update("INSERT INTO tags (work_item_id, tag) VALUES (?, ?)", workItemId, tag.trim());
            }
        }
    }

    private void createNotification(String userId, String type, String message, String link) {
        // Use batch service — suppresses duplicate notifications within 5-minute window
        batchService.createIfNotBatched(userId, type, message, link);
    }
}
