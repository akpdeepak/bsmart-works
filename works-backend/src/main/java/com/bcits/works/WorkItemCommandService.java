package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EmailService;
import com.bcits.works.shared.EventService;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class WorkItemCommandService {

    private static final Logger log = LoggerFactory.getLogger(WorkItemCommandService.class);

    private final WorkItemRepository repository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationBatchService batchService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final DodChecklistService dodChecklists;
    private final ExtensionExecutionService extensions;
    private final WorkflowRuleEngine workflowRules;
    private final StatusConfigService statusConfig;
    private final BoardWipLimitService wipLimits;
    private final WatcherService watcherService;
    private final AutomationService automations;
    private final FunnelService funnelService;
    private final WorkItemReadService readService;
    private final ObjectMapper objectMapper;

    public WorkItemCommandService(WorkItemRepository repository, EventService eventService,
                                  JdbcTemplate jdbc, UserRepository userRepository,
                                  EmailService emailService, NotificationBatchService batchService,
                                  AuthenticatedUser authenticatedUser, RbacService rbac,
                                  DodChecklistService dodChecklists, ExtensionExecutionService extensions,
                                  WorkflowRuleEngine workflowRules, StatusConfigService statusConfig,
                                  BoardWipLimitService wipLimits, WatcherService watcherService,
                                  AutomationService automations, FunnelService funnelService,
                                  WorkItemReadService readService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.batchService = batchService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.dodChecklists = dodChecklists;
        this.extensions = extensions;
        this.workflowRules = workflowRules;
        this.statusConfig = statusConfig;
        this.wipLimits = wipLimits;
        this.watcherService = watcherService;
        this.automations = automations;
        this.funnelService = funnelService;
        this.readService = readService;
        this.objectMapper = objectMapper;
    }

    public WorkItem restoreFromTrash(String id) {
        String userId = authenticatedUser.id();
        String wsId = rbac.workspaceForWorkItem(id);
        if (wsId == null) {
            throw ApiException.notFound("Work item", id);
        }
        rbac.require(userId, wsId, "delete_items");
        jdbc.update("UPDATE work_items SET deleted_at = NULL, deleted_by = NULL WHERE id = ?", id);
        var opt = repository.findById(id);
        if (opt.isEmpty()) {
            throw ApiException.notFound("Work item", id);
        }
        readService.attachTags(opt.get());
        return opt.get();
    }

    public WorkItem createWorkItem(WorkItem newItem) {
        String userId = authenticatedUser.id();
        String wsId = rbac.workspaceForProject(newItem.getProjectId());
        if (wsId != null) {
            rbac.require(userId, wsId, "create_items");
        }
        if (newItem.getParentId() != null) {
            validateParentType(newItem.getParentId(), newItem.getType());
        }

        String prefix = newItem.getProjectId() != null ? newItem.getProjectId().replace("PROJ-", "") : "WEB";
        newItem.setId(prefix + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());

        String effectiveWsId = wsId != null ? wsId : "default";
        String autoIdPrefix = DefaultWorkItemTypes.prefixFor(newItem.getType());
        Long counter = jdbc.queryForObject(
            "INSERT INTO work_item_counters (workspace_id, type_key, next_val) VALUES (?, ?, 1) "
                + "ON CONFLICT (workspace_id, type_key) DO UPDATE "
                + "  SET next_val = work_item_counters.next_val + 1 "
                + "RETURNING next_val",
            Long.class, effectiveWsId, newItem.getType().toUpperCase());
        newItem.setAutoId(autoIdPrefix + "-" + String.format("%04d", counter));

        String initialStatus = statusConfig.initialStatus(effectiveWsId, newItem.getType());
        newItem.setStatus(initialStatus != null ? initialStatus : defaultStatusFor(newItem.getType()));
        newItem.setCreatedBy(userId);
        if (newItem.getReporterId() == null || newItem.getReporterId().isBlank()) {
            newItem.setReporterId(userId);
        }
        newItem.setCreatedAt(OffsetDateTime.now());
        newItem.setStatusChangedAt(newItem.getCreatedAt());
        if (newItem.getProjectId() == null) {
            newItem.setProjectId("PROJ-001");
        }

        ExtensionExecutionService.ExtensionResult extResult = extensions.beforeWorkItemCreate(wsId, newItem, userId);
        if (extResult.rejected()) {
            throw ApiException.badRequest("EXTENSION_REJECTED", extResult.rejectionMessage());
        }

        WorkItem saved = repository.save(newItem);
        persistCustomFields(saved.getId(), newItem.getCustomFields());
        syncParentLink(saved.getId(), saved.getParentId());
        if (newItem.getTags() != null) {
            saveTags(saved.getId(), newItem.getTags());
        }

        eventService.record(saved.getId(), "WORK_ITEM_CREATED", userId,
            "{\"title\":\"" + saved.getTitle() + "\",\"type\":\"" + saved.getType() + "\"}");
        if (wsId != null) {
            funnelService.onFirstValueCandidate(wsId, userId, saved.getProjectId(), saved.getId(), saved.getType());
            funnelService.onMeaningfulAction(wsId, userId);
            evaluateAutomation(wsId, AutomationCatalog.TR_ITEM_CREATED, saved, userId, "create");
        }
        notifyAssigneeOnCreate(saved, userId);
        readService.attachTags(saved);
        return saved;
    }

    public WorkItem updateWorkItem(String id, WorkItem updatedItem) {
        String userId = authenticatedUser.id();
        WorkItem existing0 = repository.findById(id).orElseThrow(() -> ApiException.notFound("Work item", id));
        String wsId = rbac.workspaceForProject(existing0.getProjectId());
        if (wsId != null && !rbac.canEdit(userId, wsId, existing0.getCreatedBy(), existing0.getAssigneeId())) {
            throw ApiException.forbidden("You do not have permission to edit this work item.");
        }
        return repository.findById(id).map(existing -> updateExisting(id, updatedItem, userId, wsId, existing))
            .orElseThrow(() -> ApiException.notFound("Work item", id));
    }

    public ResponseEntity<Void> deleteWorkItem(String id) {
        String userId = authenticatedUser.id();
        var opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.<Void>notFound().build();
        }
        var item = opt.get();
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId != null) {
            rbac.require(userId, wsId, "delete_items");
        }
        jdbc.update("UPDATE work_items SET deleted_at = NOW(), deleted_by = ? WHERE id = ?", userId, id);
        eventService.record(id, "WORK_ITEM_DELETED", userId,
            "{\"title\":\"" + item.getTitle().replace("\"", "'") + "\"}");
        return ResponseEntity.<Void>noContent().build();
    }

    public ResponseEntity<Void> permanentDelete(String id) {
        String userId = authenticatedUser.id();
        var opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.<Void>notFound().build();
        }
        var item = opt.get();
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId != null) {
            rbac.require(userId, wsId, "delete_items");
        }
        jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM comments WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM work_item_links WHERE source_id = ? OR target_id = ?", id, id);
        jdbc.update("DELETE FROM attachments WHERE work_item_id = ?", id);
        jdbc.update("DELETE FROM starred_items WHERE work_item_id = ?", id);
        repository.delete(item);
        return ResponseEntity.<Void>noContent().build();
    }

    public WorkItem moveParent(String id, Map<String, String> body) {
        String userId = authenticatedUser.id();
        String newParentId = body.get("newParentId");
        WorkItem item = repository.findById(id).orElseThrow(() -> ApiException.notFound("Work item", id));
        requireItemEdit(userId, item, "move this work item");
        if (!DefaultWorkItemTypes.MOVABLE_TYPES.contains(item.getType())) {
            throw ApiException.badRequest("NOT_MOVABLE", item.getType() + " items cannot be moved to a new parent.");
        }
        if (newParentId != null) {
            validateParentType(newParentId, item.getType());
        }
        return saveParentChange(id, item, newParentId, userId);
    }

    public WorkItem setParent(String id, Map<String, String> body) {
        String userId = authenticatedUser.id();
        WorkItem item = repository.findById(id).orElseThrow(() -> ApiException.notFound("Work item", id));
        requireItemEdit(userId, item, "edit this work item");
        String newParentId = body.get("parentId");
        if (newParentId != null && newParentId.isBlank()) {
            newParentId = null;
        }
        if (id.equals(newParentId)) {
            throw ApiException.badRequest("INVALID_PARENT", "An item cannot be its own parent.");
        }
        if (newParentId != null) {
            validateParentType(newParentId, item.getType());
        }
        return saveParentChange(id, item, newParentId, userId);
    }

    private WorkItem updateExisting(String id, WorkItem updatedItem, String userId, String wsId, WorkItem existing) {
        ConcurrencyGuard.requireCurrentVersion(existing.getVersion(), updatedItem.getVersion());
        String oldStatus = existing.getStatus();
        enforceTransitionGates(id, userId, wsId, oldStatus, updatedItem.getStatus());

        String oldAssignee = existing.getAssigneeId();
        String oldPriority = existing.getPriority();
        String oldTitle = existing.getTitle();
        java.time.LocalDate oldDueDate = existing.getDueDate();
        String oldType = existing.getType();
        Integer oldStoryPoints = existing.getStoryPoints();
        String oldDescription = existing.getDescription();
        List<String> oldTags = jdbc.queryForList(
            "SELECT tag FROM tags WHERE work_item_id = ? ORDER BY tag", String.class, id);

        if (updatedItem.getParentId() != null && !updatedItem.getParentId().equals(existing.getParentId())) {
            validateParentType(updatedItem.getParentId(), updatedItem.getType());
        }
        applyUpdates(existing, updatedItem, oldStatus);
        WorkItem saved = repository.save(existing);
        syncParentLink(id, saved.getParentId());
        if (updatedItem.getCustomFields() != null) {
            persistCustomFields(id, updatedItem.getCustomFields());
        }
        if (updatedItem.getTags() != null) {
            jdbc.update("DELETE FROM tags WHERE work_item_id = ?", id);
            saveTags(id, updatedItem.getTags());
        }

        afterUpdate(id, saved, updatedItem, userId, wsId, oldStatus, oldAssignee, oldPriority, oldTitle,
            oldDueDate, oldType, oldStoryPoints, oldDescription, oldTags);
        readService.attachTags(saved);
        return saved;
    }

    private void applyUpdates(WorkItem existing, WorkItem updatedItem, String oldStatus) {
        existing.setTitle(updatedItem.getTitle());
        existing.setStatus(updatedItem.getStatus());
        if (!java.util.Objects.equals(oldStatus, updatedItem.getStatus())) {
            existing.setStatusChangedAt(OffsetDateTime.now());
        }
        if (updatedItem.getType() != null && !updatedItem.getType().equals(existing.getType())) {
            throw ApiException.badRequest("TYPE_IMMUTABLE", "Work item type cannot be changed after creation.");
        }
        existing.setDescription(updatedItem.getDescription());
        existing.setAcceptanceCriteria(updatedItem.getAcceptanceCriteria());
        existing.setAssigneeId(updatedItem.getAssigneeId());
        existing.setDueDate(updatedItem.getDueDate());
        existing.setStartDate(updatedItem.getStartDate());
        existing.setSprintId(updatedItem.getSprintId());
        existing.setStoryPoints(updatedItem.getStoryPoints());
        existing.setPriority(updatedItem.getPriority());
        existing.setParentId(updatedItem.getParentId());
        WorkItemFieldCopier.applyTypeSpecificUpdates(existing, updatedItem);
        existing.setVersion(ConcurrencyGuard.nextVersion(existing.getVersion()));
    }

    private void afterUpdate(String id, WorkItem saved, WorkItem updatedItem, String userId, String wsId,
                             String oldStatus, String oldAssignee, String oldPriority, String oldTitle,
                             java.time.LocalDate oldDueDate, String oldType, Integer oldStoryPoints,
                             String oldDescription, List<String> oldTags) {
        if (!java.util.Objects.equals(oldStatus, saved.getStatus())) {
            workflowRules.executePostFunctions(id, oldStatus, saved.getStatus(), userId, wsId);
            eventService.recordDiff(id, "STATUS_CHANGED", userId, "status", oldStatus, saved.getStatus());
            String wId = rbac.workspaceForProject(saved.getProjectId());
            extensions.afterStatusChange(wId, saved, oldStatus, userId);
        }
        recordFieldDiffs(id, saved, updatedItem, userId, oldAssignee, oldPriority, oldTitle,
            oldDueDate, oldType, oldStoryPoints, oldDescription, oldTags);
        notifyAssigneeOnUpdate(saved, oldAssignee, userId);
        notifyWatchers(id, saved, updatedItem, userId, oldStatus, oldAssignee, oldPriority, oldTitle,
            oldDueDate, oldStoryPoints, oldDescription, oldTags);
        evaluateUpdateAutomations(wsId, saved, userId, oldStatus, oldAssignee);
    }

    private void recordFieldDiffs(String id, WorkItem saved, WorkItem updatedItem, String userId,
                                  String oldAssignee, String oldPriority, String oldTitle,
                                  java.time.LocalDate oldDueDate, String oldType, Integer oldStoryPoints,
                                  String oldDescription, List<String> oldTags) {
        if (!java.util.Objects.equals(oldAssignee, saved.getAssigneeId())) {
            // Record the assignee USER IDs (surrogate, non-PII) — never the full name (RB-40 §3 rule 1:
            // no raw PII in the append-only events log, which crypto-shred cannot reach). The activity
            // feed resolves ids -> display names at render via UserPiiService (ActivityController).
            // Consistent with the AI / automation / bulk assign paths, which already record ids.
            eventService.recordDiff(id, "ASSIGNED", userId, "assignee", oldAssignee, saved.getAssigneeId());
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
        if (!java.util.Objects.equals(oldDescription, saved.getDescription())) {
            eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "description", "edited", "edited");
        }
        if (updatedItem.getTags() != null) {
            List<String> newTags = updatedItem.getTags();
            if (!oldTags.equals(newTags.stream().sorted().toList())) {
                eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "tags",
                    String.join(", ", oldTags), String.join(", ", newTags));
            }
        }
    }

    private void notifyAssigneeOnCreate(WorkItem saved, String userId) {
        if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(userId)) {
            createNotification(saved.getAssigneeId(), "ASSIGNED",
                "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            String actorName = actorName(userId);
            emailService.sendAssignmentEmail(saved.getAssigneeId(), actorName, saved.getId(), saved.getTitle());
        }
    }

    private void notifyAssigneeOnUpdate(WorkItem saved, String oldAssignee, String userId) {
        String newAssignee = saved.getAssigneeId();
        if (newAssignee != null && !newAssignee.equals(oldAssignee) && !newAssignee.equals(userId)) {
            createNotification(newAssignee, "ASSIGNED",
                "You were assigned to: " + saved.getTitle(), "/items/" + saved.getId());
            emailService.sendAssignmentEmail(newAssignee, actorName(userId), saved.getId(), saved.getTitle());
        }
    }

    private void notifyWatchers(String id, WorkItem saved, WorkItem updatedItem, String userId, String oldStatus,
                                String oldAssignee, String oldPriority, String oldTitle,
                                java.time.LocalDate oldDueDate, Integer oldStoryPoints,
                                String oldDescription, List<String> oldTags) {
        java.util.Set<String> notified = new java.util.HashSet<>();
        if (userId != null) {
            notified.add(userId);
        }
        String newAssignee = saved.getAssigneeId();
        if (newAssignee != null && !newAssignee.equals(oldAssignee)) {
            watcherService.watch(id, newAssignee);
            notified.add(newAssignee);
        }
        boolean changed = !java.util.Objects.equals(oldStatus, saved.getStatus())
            || !java.util.Objects.equals(oldAssignee, saved.getAssigneeId())
            || !java.util.Objects.equals(oldPriority, saved.getPriority())
            || !java.util.Objects.equals(oldTitle, saved.getTitle())
            || !java.util.Objects.equals(oldDueDate, saved.getDueDate())
            || !java.util.Objects.equals(oldStoryPoints, saved.getStoryPoints())
            || !java.util.Objects.equals(oldDescription, saved.getDescription())
            || (updatedItem.getTags() != null && !oldTags.equals(updatedItem.getTags().stream().sorted().toList()));
        if (changed) {
            String ref = saved.getAutoId() != null ? saved.getAutoId() : saved.getId();
            // Name-free message + actor id (RB-40 §3 Slice 4c): the actor's display name is resolved at
            // render via the vault, so the stored notification carries no raw PII.
            watcherService.notifyWatchers(id, userId, "updated " + ref + " - " + saved.getTitle(),
                notified);
        }
    }

    private void evaluateUpdateAutomations(String wsId, WorkItem saved, String userId,
                                           String oldStatus, String oldAssignee) {
        if (wsId == null) {
            return;
        }
        try {
            if (!java.util.Objects.equals(oldStatus, saved.getStatus())) {
                automations.evaluateForItem(wsId, AutomationCatalog.TR_STATUS_CHANGED, saved, userId);
            }
            if (!java.util.Objects.equals(oldAssignee, saved.getAssigneeId())) {
                automations.evaluateForItem(wsId, AutomationCatalog.TR_ITEM_ASSIGNED, saved, userId);
            }
            if (java.util.Objects.equals(oldStatus, saved.getStatus())
                    && java.util.Objects.equals(oldAssignee, saved.getAssigneeId())) {
                automations.evaluateForItem(wsId, AutomationCatalog.TR_ITEM_UPDATED, saved, userId);
            }
        } catch (Exception ex) {
            log.warn("Automation evaluation failed after update of {}: {}", saved.getId(), ex.getMessage());
        }
    }

    private void evaluateAutomation(String wsId, String trigger, WorkItem saved, String userId, String action) {
        try {
            automations.evaluateForItem(wsId, trigger, saved, userId);
        } catch (Exception ex) {
            log.warn("Automation evaluation failed after {} of {}: {}", action, saved.getId(), ex.getMessage());
        }
    }

    private void enforceTransitionGates(String id, String userId, String wsId, String oldStatus, String newStatus) {
        if (!java.util.Objects.equals(oldStatus, newStatus)
                && DodChecklistService.isDoneStatus(newStatus)
                && !DodChecklistService.isDoneStatus(oldStatus)) {
            dodChecklists.assertResolvable(id, userId);
        }
        if (!java.util.Objects.equals(oldStatus, newStatus)) {
            workflowRules.enforceTransitionRules(id, oldStatus, newStatus, userId, wsId);
            wipLimits.enforceEntry(wsId, oldStatus, newStatus);
        }
    }

    private void requireItemEdit(String userId, WorkItem item, String action) {
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId != null && !rbac.canEdit(userId, wsId, item.getCreatedBy(), item.getAssigneeId())) {
            throw ApiException.forbidden("You do not have permission to " + action + ".");
        }
    }

    private WorkItem saveParentChange(String id, WorkItem item, String newParentId, String userId) {
        String oldParentId = item.getParentId();
        item.setParentId(newParentId);
        item.setVersion(ConcurrencyGuard.nextVersion(item.getVersion()));
        WorkItem saved = repository.save(item);
        syncParentLink(id, newParentId);
        eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "parentId",
            oldParentId != null ? oldParentId : "none", newParentId != null ? newParentId : "none");
        readService.attachTags(saved);
        return saved;
    }

    private void persistCustomFields(String itemId, Map<String, Object> fields) {
        if (fields == null || fields.isEmpty()) {
            return;
        }
        try {
            jdbc.update("UPDATE work_items SET custom_fields = ?::jsonb WHERE id = ?",
                objectMapper.writeValueAsString(fields), itemId);
        } catch (Exception ignored) {
        }
    }

    private void syncParentLink(String childId, String parentId) {
        jdbc.update("DELETE FROM work_item_links WHERE source_id = ? AND link_type = 'PARENT'", childId);
        if (parentId != null && !parentId.isBlank()) {
            jdbc.update("INSERT INTO work_item_links (source_id, target_id, link_type, created_at) "
                + "VALUES (?, ?, 'PARENT', NOW()) ON CONFLICT (source_id, target_id, link_type) DO NOTHING",
                childId, parentId);
        }
    }

    private void validateParentType(String parentId, String childType) {
        List<WorkItem> parents = jdbc.query(
            "SELECT * FROM work_items WHERE id = ? AND deleted_at IS NULL AND " + WorkItemReadService.MEMBER_PROJECTS,
            readService::mapRow, parentId, authenticatedUser.id());
        if (parents.isEmpty()) {
            throw ApiException.notFound("Parent work item", parentId);
        }
        String parentType = parents.get(0).getType();
        Set<String> allowed = DefaultWorkItemTypes.VALID_CHILDREN.getOrDefault(parentType, Set.of());
        if (!allowed.contains(childType)) {
            throw ApiException.badRequest("INVALID_PARENT_TYPE",
                "A " + childType + " cannot be a child of " + parentType + ". "
                    + "Allowed children: " + allowed);
        }
    }

    private String defaultStatusFor(String typeKey) {
        if (typeKey == null) {
            return "Todo";
        }
        return switch (typeKey.toUpperCase()) {
            case "RISK" -> "Open";
            case "ISSUE" -> "Open";
            case "ASSUMPTION" -> "Active";
            case "DEPENDENCY" -> "Pending";
            case "INCIDENT" -> "New";
            case "HR_SERVICE_REQUEST", "IT_SERVICE_REQUEST" -> "Draft";
            default -> "Todo";
        };
    }

    private void saveTags(String workItemId, List<String> tags) {
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                jdbc.update("INSERT INTO tags (work_item_id, tag) VALUES (?, ?)", workItemId, tag.trim());
            }
        }
    }

    private void createNotification(String userId, String type, String message, String link) {
        batchService.createIfNotBatched(userId, type, message, link);
    }

    private String actorName(String userId) {
        return userRepository.findById(userId != null ? userId : "").map(User::getFullName).orElse("Someone");
    }
}
