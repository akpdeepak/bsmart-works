package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items")
@CrossOrigin(origins = "http://localhost:5173")
public class WorkItemController {

    private final WorkItemRepository repository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public WorkItemController(WorkItemRepository repository, EventService eventService,
                              JdbcTemplate jdbc, NotificationRepository notificationRepository,
                              UserRepository userRepository) {
        this.repository = repository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<WorkItem> getAllWorkItems() {
        List<WorkItem> items = repository.findAll();
        items.forEach(this::attachTags);
        return items;
    }

    @GetMapping("/search")
    public List<WorkItem> search(@RequestParam String q) {
        List<WorkItem> items = repository.search(q);
        items.forEach(this::attachTags);
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
    public void reorderBacklog(@RequestBody java.util.List<java.util.Map<String, Object>> items) {
        items.forEach(item -> jdbc.update(
                "UPDATE work_items SET backlog_order = ? WHERE id = ?",
                item.get("order"), item.get("id")));
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
        return w;
    }

    @GetMapping("/my")
    public List<WorkItem> myWorkItems(@RequestParam String userId) {
        List<WorkItem> items = repository.findByAssigneeId(userId);
        items.forEach(this::attachTags);
        return items;
    }

    @PostMapping
    public WorkItem createWorkItem(@RequestBody WorkItem newItem,
                                   @RequestHeader(value = "X-User-Id", required = false) String userId) {
        int randomNum = (int)(Math.random() * 10000);
        newItem.setId("WEB-" + randomNum);
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

        // Notify assignee
        if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(userId)) {
            createNotification(saved.getAssigneeId(), "ASSIGNED",
                    "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
        }

        attachTags(saved);
        return saved;
    }

    @PutMapping("/{id}")
    public WorkItem updateWorkItem(@PathVariable String id, @RequestBody WorkItem updatedItem,
                                    @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return repository.findById(id).map(existing -> {
            String oldAssignee = existing.getAssigneeId();

            existing.setTitle(updatedItem.getTitle());
            existing.setStatus(updatedItem.getStatus());
            existing.setType(updatedItem.getType());
            existing.setDescription(updatedItem.getDescription());
            existing.setAssigneeId(updatedItem.getAssigneeId());
            existing.setDueDate(updatedItem.getDueDate());
            existing.setSprintId(updatedItem.getSprintId());
            existing.setStoryPoints(updatedItem.getStoryPoints());
            existing.setPriority(updatedItem.getPriority());

            WorkItem saved = repository.save(existing);

            if (updatedItem.getTags() != null) {
                jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
                saveTags(id, updatedItem.getTags());
            }

            eventService.record(id, "WORK_ITEM_UPDATED", userId,
                    "{\"status\":\"" + saved.getStatus() + "\"}");

            // Notify new assignee
            String newAssignee = saved.getAssigneeId();
            if (newAssignee != null && !newAssignee.equals(oldAssignee) && !newAssignee.equals(userId)) {
                createNotification(newAssignee, "ASSIGNED",
                        "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            }

            attachTags(saved);
            return saved;
        }).orElseThrow(() -> new RuntimeException("Work Item not found: " + id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkItem(@PathVariable String id,
                                                @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        WorkItem item = repository.findById(id).get();
        jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM comments WHERE work_item_id = ?", id);
        repository.delete(item);
        eventService.record(id, "WORK_ITEM_DELETED", userId, "{\"title\":\"" + item.getTitle() + "\"}");
        return ResponseEntity.<Void>noContent().build();
    }

    private void attachTags(WorkItem item) {
        List<String> tags = jdbc.queryForList(
                "SELECT tag FROM tags WHERE work_item_id = ? ORDER BY id", String.class, item.getId());
        item.setTags(tags);
    }

    private void saveTags(String workItemId, List<String> tags) {
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                jdbc.update("INSERT INTO tags (work_item_id, tag) VALUES (?, ?)", workItemId, tag.trim());
            }
        }
    }

    private void createNotification(String userId, String type, String message, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(n);
    }
}
