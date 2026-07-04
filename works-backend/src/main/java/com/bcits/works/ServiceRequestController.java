package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

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

/**
 * Agent-side service requests (iteration 9, Cap N + Cap M): the pre-filtered queues support agents
 * work from, plus pick-up, assignment, the status lifecycle and the SLA countdown. RBAC at the
 * boundary (RB-10 §2): viewing the queues requires workspace membership; acting on a request
 * requires {@code work_service}. Every read is workspace-scoped (RB-40 §1); every action is an event
 * (RB-10 §3). SLA math is delegated to {@link ServiceRequestService} so it matches what the customer
 * sees — one engine, two contexts.
 */
@RestController
@RequestMapping("/api/v1/service/requests")
public class ServiceRequestController {

    private final ServiceRequestRepository requests;
    private final ServiceRequestService requestService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ServiceRequestController(ServiceRequestRepository requests, ServiceRequestService requestService,
                                    EventService eventService, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.requests = requests;
        this.requestService = requestService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Pre-filtered agent queues: all open · mine · unassigned · high priority. */
    @GetMapping
    public List<Map<String, Object>> queue(@RequestParam String workspaceId,
                                           @RequestParam(required = false, defaultValue = "open") String queue) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        List<ServiceRequest> result = switch (queue == null ? "open" : queue.toLowerCase()) {
            case "mine" -> requests.findByWorkspaceIdAndAssigneeIdOrderByCreatedAtDesc(workspaceId, userId);
            case "unassigned" -> requests.findByWorkspaceIdAndAssigneeIdIsNullOrderByCreatedAtDesc(workspaceId);
            case "high" -> requests.findByWorkspaceIdAndPriorityAndStatusInOrderByCreatedAtDesc(
                    workspaceId, "HIGH", ServiceRequestService.OPEN_STATUSES);
            case "all" -> requests.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
            default -> requests.findByWorkspaceIdAndStatusInOrderByCreatedAtDesc(
                    workspaceId, ServiceRequestService.OPEN_STATUSES);
        };
        OffsetDateTime now = OffsetDateTime.now();
        return result.stream().map(r -> enrich(r, now)).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        ServiceRequest req = load(id);
        rbac.require(authenticatedUser.id(), req.getWorkspaceId(), "view_items");
        return enrich(req, OffsetDateTime.now());
    }

    @PostMapping("/{id}/assign")
    public Map<String, Object> assign(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        String userId = authenticatedUser.id();
        ServiceRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "work_service");
        // Default to self-assignment ("pick up from the queue"); an explicit assigneeId reassigns.
        String assignee = body != null && body.get("assigneeId") != null ? body.get("assigneeId").toString() : userId;
        ServiceRequest saved = requests.save(requestService.assign(req, assignee));
        eventService.record(id, "SERVICE_REQUEST_ASSIGNED", userId, Map.of("assigneeId", assignee));
        return enrich(saved, OffsetDateTime.now());
    }

    @PostMapping("/{id}/transition")
    public Map<String, Object> transition(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        ServiceRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "work_service");
        String to = body.get("status") == null ? null : body.get("status").toString();
        if (to == null || to.isBlank()) {
            throw ApiException.badRequest("STATUS_REQUIRED", "Target status is required.", "status");
        }
        String from = req.getStatus();
        ServiceRequest saved = requests.save(requestService.applyTransition(req, to, userId));
        eventService.record(id, "SERVICE_REQUEST_STATUS_CHANGED", userId,
                Map.of("from", safe(from), "to", safe(saved.getStatus())));
        return enrich(saved, OffsetDateTime.now());
    }

    @PutMapping("/{id}")
    public Map<String, Object> edit(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        ServiceRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "work_service");
        String priority = body.get("priority") == null ? null : body.get("priority").toString();
        ServiceRequest saved = requests.save(requestService.applyAgentEdit(req, priority));
        eventService.record(id, "SERVICE_REQUEST_UPDATED", userId, Map.of("priority", safe(saved.getPriority())));
        return enrich(saved, OffsetDateTime.now());
    }

    /** Link the request to an internal work item so a filed request need not be re-entered. */
    @PutMapping("/{id}/link")
    public Map<String, Object> link(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        ServiceRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "work_service");
        String workItemId = body.get("workItemId") == null ? null : body.get("workItemId").toString();
        req.setLinkedWorkItemId(workItemId);
        req.setUpdatedAt(OffsetDateTime.now());
        ServiceRequest saved = requests.save(req);
        eventService.record(id, "SERVICE_REQUEST_LINKED", userId, Map.of("workItemId", safe(workItemId)));
        return enrich(saved, OffsetDateTime.now());
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────

    private ServiceRequest load(String id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("Service request", id));
    }

    /** Wrap the request with its computed SLA snapshot so agent and customer see the same clock. */
    private Map<String, Object> enrich(ServiceRequest req, OffsetDateTime now) {
        ServiceRequestService.SlaSnapshot sla = requestService.computeSla(req, now);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("request", req);
        out.put("sla", Map.of(
                "state", sla.state(),
                "minutesRemaining", sla.minutesRemaining(),
                "breached", sla.breached()));
        return out;
    }

    private static String safe(String s) { return s == null ? "" : s; }
}
