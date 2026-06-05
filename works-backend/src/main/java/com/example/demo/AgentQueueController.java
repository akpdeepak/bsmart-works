package com.example.demo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Limit;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Agent-facing service management (iteration 9, Cap N + Cap M) — the internal support team's view of
 * the customer portal: the pre-filtered queues (All open, Mine, Unassigned, High priority), request
 * triage (assign, status, link to a work item), the CSAT they collected, the CSAT trend rollup, and
 * publishing internal KB articles to the portal. RBAC at the service boundary (RB-10 §2): reading
 * queues requires {@code view_items}; every write (assign, status, link, publish) requires
 * {@code manage_service}. Every query is workspace-scoped (RB-40 §1) and capped (never unbounded);
 * field/aggregation logic delegates to {@link ServiceManagementService}; mutations are events
 * (RB-10 §3). The tier-aware SLA wiring (I09-S10) is surfaced via the request's organization tier.
 */
@RestController
@RequestMapping("/api/v1/service/requests")
public class AgentQueueController {

    private static final int QUEUE_CAP = 200;
    private static final List<String> OPEN_STATES = List.of("OPEN", "IN_PROGRESS", "WAITING");
    private static final List<String> HIGH_PRIORITIES = List.of("HIGH", "CRITICAL");
    private static final List<String> REQUEST_STATUSES =
            List.of("OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED");

    private final CustomerRequestRepository requests;
    private final CustomerOrganizationRepository organizations;
    private final RequestTypeRepository requestTypes;
    private final PortalKbArticleRepository portalArticles;
    private final SlaInstanceRepository slaInstances;
    private final SlaPolicyRepository slaPolicies;
    private final ServiceManagementService service;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AgentQueueController(CustomerRequestRepository requests,
                                CustomerOrganizationRepository organizations,
                                RequestTypeRepository requestTypes,
                                PortalKbArticleRepository portalArticles,
                                SlaInstanceRepository slaInstances, SlaPolicyRepository slaPolicies,
                                ServiceManagementService service, EventService eventService,
                                AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.requests = requests;
        this.organizations = organizations;
        this.requestTypes = requestTypes;
        this.portalArticles = portalArticles;
        this.slaInstances = slaInstances;
        this.slaPolicies = slaPolicies;
        this.service = service;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Agent queues ─────────────────────────────────────────────────────────────

    /** Pre-filtered queues: queue = all (open) | mine | unassigned | high. Workspace-scoped. */
    @GetMapping
    public List<CustomerRequest> queue(@RequestParam String workspaceId,
                                       @RequestParam(defaultValue = "all") String queue) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        Limit cap = Limit.of(QUEUE_CAP);
        return switch (queue) {
            case "mine" -> requests.findByWorkspaceIdAndAssigneeIdOrderByCreatedAtDesc(workspaceId, userId, cap);
            case "unassigned" -> requests
                    .findByWorkspaceIdAndAssigneeIdIsNullAndStatusInOrderByCreatedAtDesc(workspaceId, OPEN_STATES, cap);
            case "high" -> requests
                    .findByWorkspaceIdAndPriorityInAndStatusInOrderByCreatedAtDesc(workspaceId, HIGH_PRIORITIES, OPEN_STATES, cap);
            default -> requests.findByWorkspaceIdAndStatusInOrderByCreatedAtDesc(workspaceId, OPEN_STATES, cap);
        };
    }

    /** A single request with its organization, tier, type, and live SLA clocks (agent + customer share one view). */
    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        CustomerRequest req = load(id);
        rbac.require(authenticatedUser.id(), req.getWorkspaceId(), "view_items");
        return detail(req);
    }

    @PostMapping("/{id}/assign")
    public CustomerRequest assign(@PathVariable String id, @RequestBody AssignRequest body) {
        String userId = authenticatedUser.id();
        CustomerRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "manage_service");
        // null assignee = take it myself; otherwise assign to the named agent.
        String assignee = body == null || body.assigneeId() == null || body.assigneeId().isBlank()
                ? userId : body.assigneeId().trim();
        req.setAssigneeId(assignee);
        if ("OPEN".equals(req.getStatus())) {
            req.setStatus("IN_PROGRESS");
        }
        req.setUpdatedAt(OffsetDateTime.now());
        CustomerRequest saved = requests.save(req);
        eventService.record(id, "REQUEST_ASSIGNED", userId, Map.of("assigneeId", assignee));
        return saved;
    }

    @PostMapping("/{id}/status")
    public CustomerRequest setStatus(@PathVariable String id, @Valid @RequestBody StatusRequest body) {
        String userId = authenticatedUser.id();
        CustomerRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "manage_service");
        String status = body.status().trim().toUpperCase();
        if (!REQUEST_STATUSES.contains(status)) {
            throw ApiException.badRequest("INVALID_STATUS", "Unknown request status: " + status);
        }
        req.setStatus(status);
        if ("RESOLVED".equals(status) && req.getResolvedAt() == null) {
            req.setResolvedAt(OffsetDateTime.now());
        }
        req.setUpdatedAt(OffsetDateTime.now());
        CustomerRequest saved = requests.save(req);
        eventService.record(id, "RESOLVED".equals(status) ? "REQUEST_RESOLVED" : "REQUEST_STATUS_CHANGED",
                userId, Map.of("status", status));
        return saved;
    }

    /** Link a request to an internal work item — this is what makes the SLA clocks visible on both sides. */
    @PostMapping("/{id}/link")
    public CustomerRequest link(@PathVariable String id, @RequestBody LinkRequest body) {
        String userId = authenticatedUser.id();
        CustomerRequest req = load(id);
        rbac.require(userId, req.getWorkspaceId(), "manage_service");
        String workItemId = body == null || body.workItemId() == null || body.workItemId().isBlank()
                ? null : body.workItemId().trim();
        req.setWorkItemId(workItemId);
        req.setUpdatedAt(OffsetDateTime.now());
        CustomerRequest saved = requests.save(req);
        eventService.record(id, "REQUEST_LINKED_WORK_ITEM", userId, Map.of("workItemId", workItemId == null ? "" : workItemId));
        return saved;
    }

    // ── CSAT trends (workspace-scoped) ───────────────────────────────────────────

    @GetMapping("/csat")
    public Map<String, Object> csat(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<Integer> ratings = new ArrayList<>();
        for (CustomerRequest r : requests.findByWorkspaceIdAndCsatRatingIsNotNull(workspaceId)) {
            ratings.add(r.getCsatRating());
        }
        return service.aggregateCsat(ratings);
    }

    // ── KB publishing (workspace-scoped) ─────────────────────────────────────────

    @GetMapping("/kb")
    public List<PortalKbArticle> publishedArticles(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return portalArticles.findByWorkspaceIdOrderByPublishedAtDesc(workspaceId);
    }

    /** Publish an internal article to the portal (snapshots title/body). Idempotent on (workspace, articleId). */
    @PostMapping("/kb")
    public PortalKbArticle publish(@RequestParam String workspaceId, @Valid @RequestBody PublishRequest body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_service");
        PortalKbArticle article = body.articleId() == null ? null
                : portalArticles.findByWorkspaceIdAndArticleId(workspaceId, body.articleId()).orElse(null);
        if (article == null) {
            article = new PortalKbArticle();
            article.setId("PKB-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            article.setWorkspaceId(workspaceId);
            article.setArticleId(body.articleId());
        }
        article.setTitle(body.title().trim());
        article.setBody(body.body());
        article.setPublishedBy(userId);
        article.setPublishedAt(OffsetDateTime.now());
        PortalKbArticle saved = portalArticles.save(article);
        eventService.record(saved.getId(), "ARTICLE_PUBLISHED_TO_PORTAL", userId,
                Map.of("title", saved.getTitle(), "workspaceId", workspaceId));
        return saved;
    }

    @DeleteMapping("/kb/{id}")
    public ResponseEntity<Void> unpublish(@PathVariable String id) {
        String userId = authenticatedUser.id();
        PortalKbArticle article = portalArticles.findById(id)
                .orElseThrow(() -> ApiException.notFound("Portal article", id));
        rbac.require(userId, article.getWorkspaceId(), "manage_service");
        portalArticles.deleteById(id);
        eventService.record(id, "ARTICLE_UNPUBLISHED_FROM_PORTAL", userId, Map.of("title", safe(article.getTitle())));
        return ResponseEntity.noContent().build();
    }

    // ── shared detail view (also used by the portal, see PortalController) ─────────

    private Map<String, Object> detail(CustomerRequest req) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("request", req);
        CustomerOrganization org = organizations.findById(req.getOrganizationId()).orElse(null);
        m.put("organization", org);
        m.put("tier", org == null ? null : org.getTier());
        m.put("requestType", req.getRequestTypeId() == null ? null
                : requestTypes.findById(req.getRequestTypeId()).orElse(null));
        m.put("sla", slaForRequest(req));
        return m;
    }

    /**
     * The SLA clocks for a request, reusing iteration 8's engine (I09-S06 / "one engine, two
     * contexts"): when the request is linked to a work item, its clocks are returned as raw target /
     * elapsed / remaining minutes so both the agent and the customer watch the same countdown. Only
     * the request's own workspace clocks are read (RB-40 §1).
     */
    List<Map<String, Object>> slaForRequest(CustomerRequest req) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (req.getWorkItemId() == null) {
            return out;
        }
        OffsetDateTime now = OffsetDateTime.now();
        for (SlaInstance i : slaInstances.findByWorkspaceIdAndWorkItemId(req.getWorkspaceId(), req.getWorkItemId())) {
            int target = i.getTargetMinutes() == null ? 0 : i.getTargetMinutes();
            int elapsed = i.getElapsedMinutes() == null ? 0 : i.getElapsedMinutes();
            int remaining = Math.max(0, target - elapsed);
            int percent = target <= 0 ? 0 : Math.min(100, (int) Math.round(elapsed * 100.0 / target));
            String band = "BREACHED".equals(i.getState()) ? "BREACH"
                    : "MET".equals(i.getState()) ? "MET"
                    : percent >= 80 ? "WARN" : "OK";
            Map<String, Object> v = new java.util.LinkedHashMap<>();
            v.put("id", i.getId());
            v.put("metric", i.getMetric());
            v.put("state", i.getState());
            v.put("targetMinutes", target);
            v.put("elapsedMinutes", elapsed);
            v.put("remainingMinutes", remaining);
            v.put("consumedPercent", percent);
            v.put("band", band);
            v.put("dueAt", i.getDueAt());
            v.put("policyTier", slaPolicies.findById(i.getPolicyId()).map(SlaPolicy::getCustomerTier).orElse(null));
            out.add(v);
        }
        return out;
    }

    private CustomerRequest load(String id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("Customer request", id));
    }

    private String safe(String s) { return s == null ? "" : s; }

    // ── request bodies ───────────────────────────────────────────────────────────

    public record AssignRequest(String assigneeId) { }
    public record StatusRequest(@NotBlank String status) { }
    public record LinkRequest(String workItemId) { }
    public record PublishRequest(String articleId, @NotBlank String title, String body) { }
}
