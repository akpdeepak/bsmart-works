package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.bcits.works.AiHeuristics.matches;
import static com.bcits.works.AiHeuristics.nv;
import static com.bcits.works.AiHeuristics.str;

@Service
public class AiCommandExecutionService {

    private static final Logger log = LoggerFactory.getLogger(AiCommandExecutionService.class);

    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final UserRepository users;
    private final CommentRepository comments;
    private final EventService events;
    private final RbacGate rbac;
    private final AutomationService automations;

    public AiCommandExecutionService(WorkItemRepository workItems, ProjectRepository projects,
                                     UserRepository users, CommentRepository comments, EventService events,
                                     RbacGate rbac, AutomationService automations) {
        this.workItems = workItems;
        this.projects = projects;
        this.users = users;
        this.comments = comments;
        this.events = events;
        this.rbac = rbac;
        this.automations = automations;
    }

    @Transactional
    public Map<String, Object> executePlan(String workspaceId, String userId, List<AiAssistService.PlanStep> steps) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (AiAssistService.PlanStep step : steps) {
            results.add(executeStep(workspaceId, userId, step));
        }
        return Map.of("executed", results.size(), "results", results);
    }

    private Map<String, Object> executeStep(String workspaceId, String userId, AiAssistService.PlanStep step) {
        AiAssistService.ActionType type;
        try {
            type = AiAssistService.ActionType.valueOf(step.action());
        } catch (Exception e) {
            type = AiAssistService.ActionType.UNKNOWN;
        }
        Map<String, Object> params = step.params() == null ? Map.of() : step.params();
        return switch (type) {
            case CREATE_ITEM -> createItem(workspaceId, userId, params, type);
            case ASSIGN -> assignItem(workspaceId, userId, params, type);
            case MOVE_STATUS -> moveStatus(workspaceId, userId, params, type);
            case COMMENT -> comment(workspaceId, userId, params, type);
            case FIND -> find(workspaceId, userId, params, type);
            default -> Map.of("action", "UNKNOWN", "ok", false, "error", "Unsupported step");
        };
    }

    private Map<String, Object> createItem(String workspaceId, String userId, Map<String, Object> params,
                                           AiAssistService.ActionType type) {
        rbac.require(userId, workspaceId, "create_items");
        String projectId = firstProjectId(workspaceId);
        WorkItem w = new WorkItem();
        String prefix = projectId != null ? projectId.replace("PROJ-", "") : "WEB";
        w.setId(prefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        w.setTitle(str(params.get("title")));
        w.setType(str(params.getOrDefault("type", "Task")));
        w.setPriority(str(params.getOrDefault("priority", "Medium")));
        w.setStatus("Todo");
        w.setProjectId(projectId != null ? projectId : "PROJ-001");
        w.setCreatedBy(userId);
        w.setCreatedAt(OffsetDateTime.now());
        WorkItem saved = workItems.save(w);
        events.record(saved.getId(), "WORK_ITEM_CREATED", userId,
            Map.of("title", nv(saved.getTitle()), "via", "ai_command_bar"));
        try {
            automations.evaluateForItem(workspaceId, AutomationCatalog.TR_ITEM_CREATED, saved, userId);
        } catch (Exception ex) {
            log.warn("Automation evaluation failed after AI-created item {}: {}", saved.getId(), ex.getMessage());
        }
        return Map.of("action", type.name(), "ok", true, "id", saved.getId());
    }

    private Map<String, Object> assignItem(String workspaceId, String userId, Map<String, Object> params,
                                           AiAssistService.ActionType type) {
        String id = str(params.get("workItemId"));
        WorkItem w = workItems.findById(id).orElse(null);
        if (w == null) {
            return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
        }
        String wsId = rbac.workspaceForProject(w.getProjectId());
        requireSameWorkspace(workspaceId, wsId);
        rbac.require(userId, workspaceId, "edit_any_item");
        String assigneeId = resolveUser(str(params.get("assigneeName")), str(params.get("email")), workspaceId);
        w.setAssigneeId(assigneeId);
        workItems.save(w);
        events.recordDiff(id, "ASSIGNED", userId, "assignee", null, assigneeId);
        return Map.of("action", type.name(), "ok", true, "id", id, "assigneeId", nv(assigneeId));
    }

    private Map<String, Object> moveStatus(String workspaceId, String userId, Map<String, Object> params,
                                           AiAssistService.ActionType type) {
        String id = str(params.get("workItemId"));
        WorkItem w = workItems.findById(id).orElse(null);
        if (w == null) {
            return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
        }
        String wsId = rbac.workspaceForProject(w.getProjectId());
        requireSameWorkspace(workspaceId, wsId);
        rbac.require(userId, workspaceId, "edit_any_item");
        String old = w.getStatus();
        w.setStatus(str(params.getOrDefault("status", w.getStatus())));
        workItems.save(w);
        events.recordDiff(id, "STATUS_CHANGED", userId, "status", old, w.getStatus());
        return Map.of("action", type.name(), "ok", true, "id", id, "status", nv(w.getStatus()));
    }

    private Map<String, Object> comment(String workspaceId, String userId, Map<String, Object> params,
                                        AiAssistService.ActionType type) {
        String id = str(params.get("workItemId"));
        WorkItem w = workItems.findById(id).orElse(null);
        if (w == null) {
            return Map.of("action", type.name(), "ok", false, "error", String.format("Item not found: %s", id));
        }
        String wsId = rbac.workspaceForProject(w.getProjectId());
        requireSameWorkspace(workspaceId, wsId);
        rbac.require(userId, workspaceId, "view_items");
        Comment c = new Comment();
        c.setWorkItemId(id);
        c.setAuthorId(userId);
        c.setBody(str(params.get("body")));
        c.setCreatedAt(OffsetDateTime.now());
        Comment saved = comments.save(c);
        events.record(id, "COMMENT_ADDED", userId, Map.of("via", "ai_command_bar"));
        return Map.of("action", type.name(), "ok", true, "id", id, "commentId", saved.getId());
    }

    private Map<String, Object> find(String workspaceId, String userId, Map<String, Object> params,
                                     AiAssistService.ActionType type) {
        rbac.require(userId, workspaceId, "view_items");
        String q = str(params.get("query"));
        List<Map<String, Object>> hits = scopedItems(workspaceId).stream()
            .filter(w -> matches(w, q))
            .limit(20)
            .map(w -> Map.<String, Object>of("id", w.getId(), "title", nv(w.getTitle()),
                "status", nv(w.getStatus())))
            .collect(Collectors.toList());
        return Map.of("action", type.name(), "ok", true, "matches", hits);
    }

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .collect(Collectors.toList());
    }

    private String firstProjectId(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream().findFirst().map(Project::getId).orElse(null);
    }

    private String resolveUser(String name, String email, String workspaceId) {
        if (email != null && !email.isBlank()) {
            return users.findByEmail(email).map(User::getId).orElse(null);
        }
        if (name == null || name.isBlank()) {
            return null;
        }
        return users.findByWorkspaceIdAndFullNameContaining(workspaceId, name.trim())
            .stream().map(User::getId).findFirst().orElse(null);
    }

    private void requireSameWorkspace(String expected, String actual) {
        if (actual == null || !actual.equals(expected)) {
            throw ApiException.forbidden("Item belongs to a different workspace.");
        }
    }
}
