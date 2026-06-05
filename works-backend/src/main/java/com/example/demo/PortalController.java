package com.example.demo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Limit;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The customer-facing portal API (iteration 9, Cap N + Cap M) — the external surface a customer's
 * people use: resolve branding, browse request types, submit and track requests, watch their SLA
 * countdown, browse/search the published KB, and rate a resolved request. The identity is the
 * separate portal account ({@link PortalAuthenticatedUser}), and EVERY read/write is scoped to the
 * customer's own organization (RB-40 §1) — the single catastrophic risk here is one customer seeing
 * another's requests, so the org id comes from the verified token, never the request body. Branding
 * lookup by subdomain is the one public, read-only endpoint (no tenant-private data). Mutations are
 * recorded as events (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/portal")
public class PortalController {

    private static final int LIST_CAP = 200;
    private static final List<String> OPEN_STATES = List.of("OPEN", "IN_PROGRESS", "WAITING");
    private static final List<String> HISTORY_STATES = List.of("RESOLVED", "CLOSED");

    private final CustomerOrganizationRepository organizations;
    private final RequestTypeRepository requestTypes;
    private final CustomerRequestRepository requests;
    private final PortalKbArticleRepository portalArticles;
    private final SlaInstanceRepository slaInstances;
    private final SlaPolicyRepository slaPolicies;
    private final ServiceManagementService service;
    private final EventService eventService;
    private final PortalAuthenticatedUser portalUser;

    public PortalController(CustomerOrganizationRepository organizations, RequestTypeRepository requestTypes,
                            CustomerRequestRepository requests, PortalKbArticleRepository portalArticles,
                            SlaInstanceRepository slaInstances, SlaPolicyRepository slaPolicies,
                            ServiceManagementService service, EventService eventService,
                            PortalAuthenticatedUser portalUser) {
        this.organizations = organizations;
        this.requestTypes = requestTypes;
        this.requests = requests;
        this.portalArticles = portalArticles;
        this.slaInstances = slaInstances;
        this.slaPolicies = slaPolicies;
        this.service = service;
        this.eventService = eventService;
        this.portalUser = portalUser;
    }

    // ── Public branding (I09-S02) ────────────────────────────────────────────────

    /** Public portal-shell branding resolved by subdomain — no tenant-private data, no auth. */
    @GetMapping("/branding")
    public Map<String, Object> branding(@RequestParam String subdomain) {
        CustomerOrganization org = organizations.findBySubdomain(subdomain.trim().toLowerCase())
                .filter(o -> o.getActive() == null || o.getActive())
                .orElseThrow(() -> ApiException.notFound("Portal", subdomain));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", org.getName());
        m.put("tier", org.getTier());
        m.put("subdomain", org.getSubdomain());
        m.put("logoUrl", org.getLogoUrl());
        m.put("primaryColor", org.getPrimaryColor());
        return m;
    }

    // ── Request types (I09-S03 / S04) ────────────────────────────────────────────

    @GetMapping("/request-types")
    public List<RequestType> requestTypes() {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        return requestTypes.findByWorkspaceIdAndActiveTrueOrderBySortOrderAscNameAsc(me.workspaceId());
    }

    // ── Requests (I09-S05 submission, I09-S09 dashboard) ─────────────────────────

    @PostMapping("/requests")
    public Map<String, Object> submit(@Valid @RequestBody SubmitRequest body) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        // The chosen type must belong to the customer's own workspace (RB-40 §1).
        RequestType type = body.requestTypeId() == null ? null
                : requestTypes.findById(body.requestTypeId())
                    .filter(t -> t.getWorkspaceId().equals(me.workspaceId()))
                    .orElseThrow(() -> ApiException.notFound("Request type", body.requestTypeId()));

        String formData = body.formData() == null ? "{}" : body.formData();
        if (type != null) {
            List<String> missing = service.missingRequiredFields(type.getFormSchema(), formData);
            if (!missing.isEmpty()) {
                throw ApiException.badRequest("FORM_INCOMPLETE",
                        "Please complete the required field(s): " + String.join(", ", missing));
            }
        }

        CustomerRequest req = new CustomerRequest();
        req.setRequestTypeId(type == null ? null : type.getId());
        req.setSubject(body.subject());
        req.setDescription(body.description());
        req.setFormData(formData);
        req.setPriority(body.priority());
        CustomerRequest saved = requests.save(
                service.prepareRequest(req, me.organizationId(), me.workspaceId(), me.accountId()));
        eventService.record(saved.getId(), "CUSTOMER_REQUEST_CREATED", me.accountId(),
                Map.of("organizationId", me.organizationId(), "subject", safe(saved.getSubject())));
        return requestView(saved);
    }

    /** The customer dashboard: their org's requests. view = open | history | all (default all). */
    @GetMapping("/requests")
    public List<Map<String, Object>> myRequests(@RequestParam(defaultValue = "all") String view) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        Limit cap = Limit.of(LIST_CAP);
        List<CustomerRequest> rows = switch (view) {
            case "open" -> requests.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(me.organizationId(), OPEN_STATES, cap);
            case "history" -> requests.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(me.organizationId(), HISTORY_STATES, cap);
            default -> requests.findByOrganizationIdOrderByCreatedAtDesc(me.organizationId(), cap);
        };
        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomerRequest r : rows) {
            out.add(requestView(r));
        }
        return out;
    }

    @GetMapping("/requests/{id}")
    public Map<String, Object> request(@PathVariable String id) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        return requestView(loadOwn(id, me));
    }

    /** SLA status for a customer's request (I09-S06) — the same clocks the agent sees. */
    @GetMapping("/requests/{id}/sla")
    public List<Map<String, Object>> sla(@PathVariable String id) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        return slaView(loadOwn(id, me));
    }

    @PostMapping("/requests/{id}/csat")
    public Map<String, Object> csat(@PathVariable String id, @Valid @RequestBody CsatRequest body) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        CustomerRequest req = loadOwn(id, me);
        if (!"RESOLVED".equals(req.getStatus()) && !"CLOSED".equals(req.getStatus())) {
            throw ApiException.badRequest("NOT_RESOLVED", "You can rate a request only after it is resolved.");
        }
        req.setCsatRating(body.rating());
        req.setCsatComment(body.comment());
        req.setUpdatedAt(OffsetDateTime.now());
        CustomerRequest saved = requests.save(req);
        eventService.record(saved.getId(), "CSAT_SUBMITTED", me.accountId(),
                Map.of("rating", body.rating(), "organizationId", me.organizationId()));
        return requestView(saved);
    }

    // ── Portal KB (I09-S07) ──────────────────────────────────────────────────────

    @GetMapping("/kb")
    public List<PortalKbArticle> kb(@RequestParam(required = false) String q) {
        PortalAuthenticatedUser.Principal me = portalUser.current();
        if (q != null && !q.isBlank()) {
            return portalArticles.search(me.workspaceId(), q.trim(), Limit.of(LIST_CAP));
        }
        return portalArticles.findByWorkspaceIdOrderByPublishedAtDesc(me.workspaceId());
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    /** Load a request and assert it belongs to the caller's organization (cross-org guard). */
    private CustomerRequest loadOwn(String id, PortalAuthenticatedUser.Principal me) {
        return requests.findByIdAndOrganizationId(id, me.organizationId())
                .orElseThrow(() -> ApiException.notFound("Request", id));
    }

    private Map<String, Object> requestView(CustomerRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("subject", r.getSubject());
        m.put("description", r.getDescription());
        m.put("status", r.getStatus());
        m.put("priority", r.getPriority());
        m.put("requestTypeId", r.getRequestTypeId());
        m.put("formData", r.getFormData());
        m.put("csatRating", r.getCsatRating());
        m.put("createdAt", r.getCreatedAt());
        m.put("resolvedAt", r.getResolvedAt());
        m.put("sla", slaView(r));
        return m;
    }

    /**
     * SLA clocks for a request (I09-S06) — only present once an agent has linked it to a work item.
     * Reuses iteration 8's instance data, scoped to the request's workspace (RB-40 §1), and surfaces
     * raw minutes so the portal's {@code SlaCountdownBadge} renders the same countdown as the agent.
     */
    private List<Map<String, Object>> slaView(CustomerRequest r) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (r.getWorkItemId() == null) {
            return out;
        }
        for (SlaInstance i : slaInstances.findByWorkspaceIdAndWorkItemId(r.getWorkspaceId(), r.getWorkItemId())) {
            int target = i.getTargetMinutes() == null ? 0 : i.getTargetMinutes();
            int elapsed = i.getElapsedMinutes() == null ? 0 : i.getElapsedMinutes();
            int remaining = Math.max(0, target - elapsed);
            int percent = target <= 0 ? 0 : Math.min(100, (int) Math.round(elapsed * 100.0 / target));
            String band = "BREACHED".equals(i.getState()) ? "BREACH"
                    : "MET".equals(i.getState()) ? "MET"
                    : percent >= 80 ? "WARN" : "OK";
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("metric", i.getMetric());
            v.put("state", i.getState());
            v.put("targetMinutes", target);
            v.put("remainingMinutes", remaining);
            v.put("consumedPercent", percent);
            v.put("band", band);
            v.put("dueAt", i.getDueAt());
            v.put("tier", slaPolicies.findById(i.getPolicyId()).map(SlaPolicy::getCustomerTier).orElse(null));
            out.add(v);
        }
        return out;
    }

    private String safe(String s) { return s == null ? "" : s; }

    // ── request bodies ───────────────────────────────────────────────────────────

    public record SubmitRequest(String requestTypeId, @NotBlank String subject, String description,
                                String priority, String formData) { }

    public record CsatRequest(@NotNull @Min(1) @Max(5) Integer rating, String comment) { }
}
