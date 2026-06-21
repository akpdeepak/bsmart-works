package com.bcits.works;

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
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

    private final WorkflowRepository workflowRepo;
    private final WorkflowStatusRepository statusRepo;
    private final WorkflowTransitionRepository transitionRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final EventService eventService;

    public WorkflowController(WorkflowRepository workflowRepo,
                               WorkflowStatusRepository statusRepo,
                               WorkflowTransitionRepository transitionRepo,
                               AuthenticatedUser authenticatedUser,
                               RbacService rbac,
                               EventService eventService) {
        this.workflowRepo = workflowRepo;
        this.statusRepo = statusRepo;
        this.transitionRepo = transitionRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.eventService = eventService;
    }

    @GetMapping
    public List<Workflow> list(@RequestParam(required = false) String projectId,
                               @RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only workflows from their workspaces.
        if (projectId != null) return workflowRepo.findByProjectId(projectId);
        if (workspaceId != null) return workflowRepo.findByWorkspaceId(workspaceId);
        return workflowRepo.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Workflow wf = workflowRepo.findById(id).orElseThrow();
        String wsId = wf.getWorkspaceId();
        if (wsId != null && rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Workflow", id);
        }
        List<WorkflowStatus> statuses = statusRepo.findByWorkflowIdOrderByPosition(id);
        List<WorkflowTransition> transitions = transitionRepo.findByWorkflowId(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("workflow", wf);
        result.put("statuses", statuses);
        result.put("transitions", transitions);
        return result;
    }

    @PostMapping
    public Workflow create(@Valid @RequestBody Workflow wf) {
        String userId = authenticatedUser.id();
        // RBAC (RB-10 §2 / B02): only workspace members with manage_workflows permission may create.
        String wsId = wf.getWorkspaceId();
        if (wsId != null) rbac.require(userId, wsId, "manage_workflows");
        wf.setId("WF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        wf.setCreatedAt(OffsetDateTime.now());
        wf.setUpdatedAt(OffsetDateTime.now());
        Workflow saved = workflowRepo.save(wf);
        // Event emission (RB-10 §3 / B06): every state change is recorded to the event store.
        if (wsId != null) {
            eventService.recordInWorkspace(wsId, saved.getId(), "WORKFLOW_CREATED", userId,
                    Map.of("name", saved.getName() != null ? saved.getName() : "",
                           "itemType", saved.getItemType() != null ? saved.getItemType() : ""));
        } else {
            eventService.record(saved.getId(), "WORKFLOW_CREATED", userId,
                    Map.of("name", saved.getName() != null ? saved.getName() : ""));
        }
        return saved;
    }

    @PutMapping("/{id}")
    public Workflow update(@PathVariable String id, @Valid @RequestBody Workflow updated) {
        String userId = authenticatedUser.id();
        Workflow existing = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        // RBAC (RB-10 §2 / B02): only members with manage_workflows may mutate.
        String wsId = existing.getWorkspaceId();
        if (wsId != null) rbac.require(userId, wsId, "manage_workflows");
        existing.setName(updated.getName());
        existing.setItemType(updated.getItemType());
        existing.setIsDefault(updated.getIsDefault());
        existing.setUpdatedAt(OffsetDateTime.now());
        Workflow saved = workflowRepo.save(existing);
        // Event emission (B06).
        if (wsId != null) {
            eventService.recordInWorkspace(wsId, id, "WORKFLOW_UPDATED", userId,
                    Map.of("name", saved.getName() != null ? saved.getName() : ""));
        } else {
            eventService.record(id, "WORKFLOW_UPDATED", userId,
                    Map.of("name", saved.getName() != null ? saved.getName() : ""));
        }
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Workflow existing = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        // RBAC (RB-10 §2 / B02): only members with manage_workflows may delete.
        String wsId = existing.getWorkspaceId();
        if (wsId != null) rbac.require(userId, wsId, "manage_workflows");
        workflowRepo.deleteById(id);
        // Event emission (B06).
        if (wsId != null) {
            eventService.recordInWorkspace(wsId, id, "WORKFLOW_DELETED", userId,
                    Map.of("name", existing.getName() != null ? existing.getName() : ""));
        } else {
            eventService.record(id, "WORKFLOW_DELETED", userId,
                    Map.of("name", existing.getName() != null ? existing.getName() : ""));
        }
        return ResponseEntity.noContent().build();
    }

    // --- Status endpoints ---

    @GetMapping("/{id}/statuses")
    public List<WorkflowStatus> getStatuses(@PathVariable String id) {
        // findById bypasses @Filter (#243 Slice D) — re-check access to the parent workflow,
        // mirroring get(). (null workspaceId = global/template workflow; see A.7 / Slice D notes.)
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        String wsId = wf.getWorkspaceId();
        if (wsId != null && rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Workflow", id);
        }
        return statusRepo.findByWorkflowIdOrderByPosition(id);
    }

    @PostMapping("/{id}/statuses")
    public WorkflowStatus addStatus(@PathVariable String id, @Valid @RequestBody WorkflowStatus status) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        // RBAC (B02): manage_workflows required to mutate statuses.
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        status.setId("WFS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        status.setWorkflowId(id);
        WorkflowStatus saved = statusRepo.save(status);
        // Event emission (B06).
        String wsId = wf.getWorkspaceId();
        if (wsId != null) {
            eventService.recordInWorkspace(wsId, id, "WORKFLOW_STATUS_ADDED", userId,
                    Map.of("statusName", saved.getName() != null ? saved.getName() : ""));
        }
        return saved;
    }

    @PutMapping("/{id}/statuses/{statusId}")
    public WorkflowStatus updateStatus(@PathVariable String id, @PathVariable String statusId,
                                       @Valid @RequestBody WorkflowStatus updated) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        WorkflowStatus saved = statusRepo.findById(statusId).map(s -> {
            s.setName(updated.getName());
            s.setCategory(updated.getCategory());
            s.setColor(updated.getColor());
            s.setPosition(updated.getPosition());
            s.setIsInitial(updated.getIsInitial());
            s.setWarnHours(updated.getWarnHours());
            s.setBreachHours(updated.getBreachHours());
            s.setOutcome(updated.getOutcome());
            return statusRepo.save(s);
        }).orElseThrow();
        return saved;
    }

    @DeleteMapping("/{id}/statuses/{statusId}")
    public ResponseEntity<Void> deleteStatus(@PathVariable String id, @PathVariable String statusId) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        statusRepo.deleteById(statusId);
        return ResponseEntity.noContent().build();
    }

    // Reorder statuses in bulk
    @PutMapping("/{id}/statuses/reorder")
    public List<WorkflowStatus> reorderStatuses(@PathVariable String id,
                                                 @Valid @RequestBody List<Map<String, Object>> order) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        order.forEach(item -> {
            String statusId = (String) item.get("id");
            Integer pos = ((Number) item.get("position")).intValue();
            statusRepo.findById(statusId).ifPresent(s -> {
                s.setPosition(pos);
                statusRepo.save(s);
            });
        });
        return statusRepo.findByWorkflowIdOrderByPosition(id);
    }

    // --- Transition endpoints ---

    @GetMapping("/{id}/transitions")
    public List<WorkflowTransition> getTransitions(@PathVariable String id) {
        return transitionRepo.findByWorkflowId(id);
    }

    @PostMapping("/{id}/transitions")
    public WorkflowTransition addTransition(@PathVariable String id,
                                             @Valid @RequestBody WorkflowTransition transition) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        transition.setId("WFT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transition.setWorkflowId(id);
        if (transition.getConditions() == null) transition.setConditions("[]");
        if (transition.getValidators() == null) transition.setValidators("[]");
        if (transition.getPostFunctions() == null) transition.setPostFunctions("[]");
        WorkflowTransition saved = transitionRepo.save(transition);
        // Event emission (B06).
        String wsId = wf.getWorkspaceId();
        if (wsId != null) {
            eventService.recordInWorkspace(wsId, id, "WORKFLOW_TRANSITION_ADDED", userId,
                    Map.of("transitionName", saved.getName() != null ? saved.getName() : ""));
        }
        return saved;
    }

    @PutMapping("/{id}/transitions/{transId}")
    public WorkflowTransition updateTransition(@PathVariable String id,
                                                @PathVariable String transId,
                                                @Valid @RequestBody WorkflowTransition updated) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        return transitionRepo.findById(transId).map(t -> {
            t.setName(updated.getName());
            t.setFromStatus(updated.getFromStatus());
            t.setToStatus(updated.getToStatus());
            if (updated.getConditions() != null) t.setConditions(updated.getConditions());
            if (updated.getValidators() != null) t.setValidators(updated.getValidators());
            if (updated.getPostFunctions() != null) t.setPostFunctions(updated.getPostFunctions());
            return transitionRepo.save(t);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}/transitions/{transId}")
    public ResponseEntity<Void> deleteTransition(@PathVariable String id,
                                                   @PathVariable String transId) {
        String userId = authenticatedUser.id();
        Workflow wf = workflowRepo.findById(id).orElseThrow(() -> ApiException.notFound("Workflow", id));
        if (wf.getWorkspaceId() != null) rbac.require(userId, wf.getWorkspaceId(), "manage_workflows");
        transitionRepo.deleteById(transId);
        return ResponseEntity.noContent().build();
    }
}
