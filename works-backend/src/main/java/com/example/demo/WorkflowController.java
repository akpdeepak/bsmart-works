package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

    private final WorkflowRepository workflowRepo;
    private final WorkflowStatusRepository statusRepo;
    private final WorkflowTransitionRepository transitionRepo;
    private final AuthenticatedUser authenticatedUser;

    public WorkflowController(WorkflowRepository workflowRepo,
                               WorkflowStatusRepository statusRepo,
                               WorkflowTransitionRepository transitionRepo,
                               AuthenticatedUser authenticatedUser) {
        this.workflowRepo = workflowRepo;
        this.statusRepo = statusRepo;
        this.transitionRepo = transitionRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Workflow> list(@RequestParam(required = false) String projectId,
                               @RequestParam(required = false) String workspaceId) {
        if (projectId != null) return workflowRepo.findByProjectId(projectId);
        if (workspaceId != null) return workflowRepo.findByWorkspaceId(workspaceId);
        return workflowRepo.findAll();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Workflow wf = workflowRepo.findById(id).orElseThrow();
        List<WorkflowStatus> statuses = statusRepo.findByWorkflowIdOrderByPosition(id);
        List<WorkflowTransition> transitions = transitionRepo.findByWorkflowId(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("workflow", wf);
        result.put("statuses", statuses);
        result.put("transitions", transitions);
        return result;
    }

    @PostMapping
    public Workflow create(@RequestBody Workflow wf) {
        wf.setId("WF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        wf.setCreatedAt(OffsetDateTime.now());
        wf.setUpdatedAt(OffsetDateTime.now());
        return workflowRepo.save(wf);
    }

    @PutMapping("/{id}")
    public Workflow update(@PathVariable String id, @RequestBody Workflow updated) {
        return workflowRepo.findById(id).map(wf -> {
            wf.setName(updated.getName());
            wf.setItemType(updated.getItemType());
            wf.setIsDefault(updated.getIsDefault());
            wf.setUpdatedAt(OffsetDateTime.now());
            return workflowRepo.save(wf);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        workflowRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- Status endpoints ---

    @GetMapping("/{id}/statuses")
    public List<WorkflowStatus> getStatuses(@PathVariable String id) {
        return statusRepo.findByWorkflowIdOrderByPosition(id);
    }

    @PostMapping("/{id}/statuses")
    public WorkflowStatus addStatus(@PathVariable String id, @RequestBody WorkflowStatus status) {
        status.setId("WFS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        status.setWorkflowId(id);
        return statusRepo.save(status);
    }

    @PutMapping("/{id}/statuses/{statusId}")
    public WorkflowStatus updateStatus(@PathVariable String id, @PathVariable String statusId,
                                       @RequestBody WorkflowStatus updated) {
        return statusRepo.findById(statusId).map(s -> {
            s.setName(updated.getName());
            s.setCategory(updated.getCategory());
            s.setColor(updated.getColor());
            s.setPosition(updated.getPosition());
            s.setIsInitial(updated.getIsInitial());
            return statusRepo.save(s);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}/statuses/{statusId}")
    public ResponseEntity<Void> deleteStatus(@PathVariable String id, @PathVariable String statusId) {
        statusRepo.deleteById(statusId);
        return ResponseEntity.noContent().build();
    }

    // Reorder statuses in bulk
    @PutMapping("/{id}/statuses/reorder")
    public List<WorkflowStatus> reorderStatuses(@PathVariable String id,
                                                 @RequestBody List<Map<String, Object>> order) {
        order.forEach(item -> {
            String statusId = (String) item.get("id");
            Integer pos = ((Number) item.get("position")).intValue();
            statusRepo.findById(statusId).ifPresent(s -> { s.setPosition(pos); statusRepo.save(s); });
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
                                             @RequestBody WorkflowTransition transition) {
        transition.setId("WFT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transition.setWorkflowId(id);
        if (transition.getConditions() == null) transition.setConditions("[]");
        if (transition.getValidators() == null) transition.setValidators("[]");
        if (transition.getPostFunctions() == null) transition.setPostFunctions("[]");
        return transitionRepo.save(transition);
    }

    @PutMapping("/{id}/transitions/{transId}")
    public WorkflowTransition updateTransition(@PathVariable String id,
                                                @PathVariable String transId,
                                                @RequestBody WorkflowTransition updated) {
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
        transitionRepo.deleteById(transId);
        return ResponseEntity.noContent().build();
    }
}
