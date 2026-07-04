package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EmailService;
import com.bcits.works.shared.EventService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Tag(name = "Work Items", description = "CRUD, search, backlog ordering, and trash management for work items")
@RestController
@RequestMapping("/api/v1/work-items")
public class WorkItemController {

    private final WorkItemRepository repository;
    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final WorkItemBulkService bulkService;
    private final WatcherService watcherService;
    private final WorkItemReadService readService;
    private final WorkItemCommandService commandService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WorkItemController(WorkItemRepository repository, EventService eventService,
                              JdbcTemplate jdbc, NotificationRepository notificationRepository,
                              UserRepository userRepository, EmailService emailService,
                              NotificationBatchService batchService, AuthenticatedUser authenticatedUser,
                              RbacService rbac, DodChecklistService dodChecklists,
                              ExtensionExecutionService extensions,
                              WorkflowRuleEngine workflowRules,
                              StatusConfigService statusConfig,
                              BoardWipLimitService wipLimits,
                              WorkItemBulkService bulkService,
                              WatcherService watcherService,
                              AutomationService automations,
                              FunnelService funnelService,
                              FieldVisibilityService fieldVisibility) {
        this.repository = repository;
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.bulkService = bulkService;
        this.watcherService = watcherService;
        this.readService = new WorkItemReadService(jdbc, authenticatedUser, objectMapper, fieldVisibility);
        this.commandService = new WorkItemCommandService(repository, eventService, jdbc, userRepository, emailService,
            batchService, authenticatedUser, rbac, dodChecklists, extensions, workflowRules, statusConfig,
            wipLimits, watcherService, automations, funnelService, readService, objectMapper);
    }

    // ── Watchers (followers) ─────────────────────────────────────────────────────
    // A user watches an item to be notified on any field change or new comment. Access is gated like
    // a read (tier >= 1 in the item's workspace); fan-out happens in updateWorkItem / addComment.

    private String requireItemViewAccess(String userId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        return wsId;
    }

    @Operation(summary = "Watch a work item", description = "The caller starts watching this item (idempotent).")
    @PostMapping("/{id}/watch")
    public Map<String, Object> watchItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireItemViewAccess(userId, id);
        watcherService.watch(id, userId);
        return Map.of("watching", true, "watchers", watcherService.watchers(id).size());
    }

    @Operation(summary = "Unwatch a work item", description = "The caller stops watching this item.")
    @DeleteMapping("/{id}/watch")
    public Map<String, Object> unwatchItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireItemViewAccess(userId, id);
        watcherService.unwatch(id, userId);
        return Map.of("watching", false, "watchers", watcherService.watchers(id).size());
    }

    @Operation(summary = "List watchers", description = "Returns the watcher user ids and whether the caller is watching.")
    @GetMapping("/{id}/watchers")
    public Map<String, Object> getWatchers(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireItemViewAccess(userId, id);
        List<String> ids = watcherService.watchers(id);
        return Map.of("watchers", ids, "watching", ids.contains(userId));
    }

    @Operation(summary = "Bulk-edit work items",
        description = "Applies one field change (assignee, priority, addLabel, removeLabel) to many "
            + "items at once. Each item is re-checked for edit rights and audited; items the caller "
            + "may not edit are skipped. Status is not a bulk field (it must run the DoD + workflow "
            + "gates per item). Returns the per-item outcome.")
    @PostMapping("/bulk")
    public WorkItemBulkService.BulkResult bulkEdit(@Valid @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        Object rawIds = body.get("ids");
        List<String> ids = rawIds instanceof List<?> list
            ? list.stream().filter(java.util.Objects::nonNull).map(Object::toString).toList()
            : List.of();
        String action = body.get("action") == null ? null : body.get("action").toString();
        String value = body.get("value") == null ? null : body.get("value").toString();
        return bulkService.apply(userId, ids, action, value);
    }

    @Operation(summary = "List work items", description = "Returns work items visible to the authenticated user"
        + " (workspace-scoped). Paginated; default page=0 size=200 max=500."
        + " Response carries X-Total-Count (full filtered count) and X-Has-More (boolean).")
    @GetMapping
    public ResponseEntity<List<WorkItem>> getAllWorkItems(
                                          @RequestParam(required = false) String parentId,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "200") int size) {
        return readService.getAllWorkItems(parentId, page, size);
    }

    // Trash — soft-deleted items recoverable within 30 days. Must be declared before /{id} so the
    // literal path /trash is unambiguous (belt-and-suspenders — Spring already prefers literal
    // paths, but explicit ordering removes any ambiguity). Workspace-scoped via MEMBER_PROJECTS.
    @GetMapping("/trash")
    public List<WorkItem> getTrash(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "50") int size) {
        return readService.getTrash(page, size);
    }

    // Single work item by id (added iteration 14 — the IDE extensions, the `works` CLI and the
    // Developer Workspace "open item" all fetch one item by id). Tenant-scoped via MEMBER_PROJECTS
    // (RB-40 §1): an item outside the caller's workspaces is indistinguishable from a missing one.
    @GetMapping("/{id}")
    public WorkItem getWorkItem(@PathVariable String id) {
        return readService.getWorkItem(id);
    }

    @PutMapping("/{id}/restore")
    public WorkItem restoreFromTrash(@PathVariable String id) {
        return commandService.restoreFromTrash(id);
    }

    // Star / unstar
    @PostMapping("/{id}/star")
    public Map<String, Object> starItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireItemViewAccess(userId, id);
        jdbc.update("INSERT INTO starred_items (user_id, work_item_id) VALUES (?,?) ON CONFLICT DO NOTHING", userId, id);
        return Map.of("starred", true, "itemId", id);
    }

    @DeleteMapping("/{id}/star")
    public Map<String, Object> unstarItem(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireItemViewAccess(userId, id);
        jdbc.update("DELETE FROM starred_items WHERE user_id = ? AND work_item_id = ?", userId, id);
        return Map.of("starred", false, "itemId", id);
    }

    @GetMapping("/starred")
    public List<WorkItem> getStarred(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size) {
        return readService.getStarred(page, size);
    }

    @GetMapping("/search")
    public List<WorkItem> search(@RequestParam String q) {
        return readService.search(q);
    }

    @GetMapping("/backlog")
    public List<WorkItem> getBacklog(@RequestParam(required = false) String projectId,
                                     @RequestParam(defaultValue = "300") int size) {
        return readService.getBacklog(projectId, size);
    }

    @PutMapping("/backlog/reorder")
    public void reorderBacklog(@Valid @RequestBody java.util.List<java.util.Map<String, Object>> items) {
        readService.reorderBacklog(items);
    }

    /** Personal home (I01-S12): the signed-in user's assigned items. Identity comes from the JWT —
     *  a client cannot request another user's items (the old, ignored userId param is removed). */
    @GetMapping("/my")
    public List<WorkItem> myWorkItems() {
        List<WorkItem> items = repository.findMyItemsScoped(authenticatedUser.id());
        readService.attachTagsBatch(items);
        readService.attachFieldValuesBatch(items);
        return items;
    }

    @Operation(summary = "Create work item", description = "Creates a new work item. Requires create_items permission in the target project's workspace.")
    @PostMapping
    public WorkItem createWorkItem(@Valid @RequestBody WorkItem newItem) {
        return commandService.createWorkItem(newItem);
    }

    @Operation(summary = "Update work item", description = "Updates a work item. Enforces optimistic locking via version field. Moving to a done status requires all required DoD items checked.")
    @PutMapping("/{id}")
    public WorkItem updateWorkItem(@PathVariable String id, @Valid @RequestBody WorkItem updatedItem) {
        return commandService.updateWorkItem(id, updatedItem);
    }

    @Operation(summary = "Soft-delete work item", description = "Moves the work item to trash (30-day retention). Requires delete_items permission.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkItem(@PathVariable String id) {
        return commandService.deleteWorkItem(id);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDelete(@PathVariable String id) {
        return commandService.permanentDelete(id);
    }

    @Operation(summary = "Move work item to a new parent",
               description = "Reassigns the parent of a Story, Bug, Task, or Activity. "
                   + "Validates that the target parent type is allowed by the hierarchy rules.")
    @PatchMapping("/{id}/parent")
    public WorkItem moveParent(@PathVariable String id, @RequestBody Map<String, String> body) {
        return commandService.moveParent(id, body);
    }

    @Operation(summary = "Set or clear the parent (Links hierarchy)",
               description = "Sets parent_id and projects the PARENT link. Validates the hierarchy "
                   + "rules; unlike move, applies to any type. parentId null/blank clears the parent.")
    @PutMapping("/{id}/parent")
    public WorkItem setParent(@PathVariable String id, @RequestBody Map<String, String> body) {
        return commandService.setParent(id, body);
    }
}
