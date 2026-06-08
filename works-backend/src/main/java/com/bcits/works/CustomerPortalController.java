package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The customer-facing portal API (iteration 9, Cap N + Cap M). Every endpoint resolves the customer
 * from the portal token via {@link CustomerContext} and is scoped to that customer's account and
 * workspace, so a customer can only ever see their own requests and their workspace's published KB
 * (RB-40 §1). Responses are deliberately customer-shaped — internal fields (assignee, links) are not
 * exposed — which is field-level security in practice. SLA math reuses {@link ServiceRequestService}
 * so the countdown matches the agent's exactly (one engine, two contexts).
 */
@RestController
@RequestMapping("/api/v1/portal")
public class CustomerPortalController {

    private static final Logger log = LoggerFactory.getLogger(CustomerPortalController.class);

    private final CustomerContext customerContext;
    private final RequestTypeRepository requestTypes;
    private final ServiceRequestRepository requests;
    private final ServiceRequestService requestService;
    private final CsatResponseRepository csat;
    private final CsatService csatService;
    private final CustomerAccountRepository accounts;
    private final CustomerSlaTierRepository slaTiers;
    private final EventService eventService;
    private final WorkItemRepository workItemRepository;
    private final ProjectRepository projectRepository;
    private final JdbcTemplate jdbc;

    public CustomerPortalController(CustomerContext customerContext, RequestTypeRepository requestTypes,
                                    ServiceRequestRepository requests, ServiceRequestService requestService,
                                    CsatResponseRepository csat, CsatService csatService,
                                    CustomerAccountRepository accounts, CustomerSlaTierRepository slaTiers,
                                    EventService eventService,
                                    WorkItemRepository workItemRepository, ProjectRepository projectRepository,
                                    JdbcTemplate jdbc) {
        this.customerContext = customerContext;
        this.requestTypes = requestTypes;
        this.requests = requests;
        this.requestService = requestService;
        this.csat = csat;
        this.csatService = csatService;
        this.accounts = accounts;
        this.slaTiers = slaTiers;
        this.eventService = eventService;
        this.workItemRepository = workItemRepository;
        this.projectRepository = projectRepository;
        this.jdbc = jdbc;
    }

    // ── Request types + forms ─────────────────────────────────────────────────────────
    @GetMapping("/request-types")
    public List<RequestType> requestTypes() {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        return requestTypes.findByWorkspaceIdAndActiveTrueOrderBySortOrderAscNameAsc(me.workspaceId());
    }

    // ── Submit + view requests ──────────────────────────────────────────────────────
    @PostMapping("/requests")
    public Map<String, Object> submit(@RequestBody Map<String, Object> body) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        String typeId = str(body.get("requestTypeId"));
        String subject = str(body.get("subject"));
        if (typeId == null || typeId.isBlank()) {
            throw ApiException.badRequest("TYPE_REQUIRED", "Choose a request type.", "requestTypeId");
        }
        if (subject == null || subject.isBlank()) {
            throw ApiException.badRequest("SUBJECT_REQUIRED", "A short summary is required.", "subject");
        }
        RequestType type = requestTypes.findById(typeId)
                .filter(t -> me.workspaceId().equals(t.getWorkspaceId()) && Boolean.TRUE.equals(t.getActive()))
                .orElseThrow(() -> ApiException.notFound("Request type", typeId));

        CustomerAccount account = accounts.findById(me.accountId())
                .orElseThrow(() -> ApiException.notFound("Customer account", me.accountId()));
        CustomerSlaTier tier = slaTiers.findByWorkspaceIdAndTier(me.workspaceId(), account.getTier()).orElse(null);

        ServiceRequest req = new ServiceRequest();
        req.setWorkspaceId(me.workspaceId());
        req.setCustomerAccountId(me.accountId());
        req.setSubmittedBy(me.customerUserId());
        req.setSubject(subject.trim());
        req.setDescription(str(body.get("description")));
        Object formData = body.get("formData");
        req.setFormData(formData == null ? "{}" : toJson(formData));
        req.setPriority(str(body.get("priority")));
        ServiceRequest saved = requests.save(requestService.prepareNew(req, type, tier));
        eventService.record(saved.getId(), "SERVICE_REQUEST_SUBMITTED", me.customerUserId(),
                Map.of("accountId", me.accountId(), "typeKey", safe(saved.getTypeKey())));

        // B16: auto-create a linked internal WorkItem in the workspace's default project (RB-40 §1)
        autoCreateLinkedWorkItem(saved, me.workspaceId());

        return customerView(saved, OffsetDateTime.now());
    }

    @GetMapping("/requests")
    public List<Map<String, Object>> myRequests(@RequestParam(required = false) String status) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        List<ServiceRequest> list = "open".equalsIgnoreCase(status)
                ? requests.findByCustomerAccountIdAndStatusInOrderByCreatedAtDesc(
                        me.accountId(), ServiceRequestService.OPEN_STATUSES)
                : requests.findByCustomerAccountIdOrderByCreatedAtDesc(me.accountId());
        OffsetDateTime now = OffsetDateTime.now();
        return list.stream().map(r -> customerView(r, now)).toList();
    }

    @GetMapping("/requests/{id}")
    public Map<String, Object> requestDetail(@PathVariable String id) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        ServiceRequest req = loadOwned(id, me.accountId());
        return customerView(req, OffsetDateTime.now());
    }

    // ── CSAT ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/requests/{id}/csat")
    public CsatResponse rate(@PathVariable String id, @RequestBody Map<String, Object> body) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        ServiceRequest req = loadOwned(id, me.accountId());
        if (!"RESOLVED".equals(req.getStatus()) && !"CLOSED".equals(req.getStatus())) {
            throw ApiException.badRequest("NOT_RESOLVED", "You can rate a request once it is resolved.");
        }
        Integer rating = body.get("rating") instanceof Number n ? n.intValue() : null;
        if (!csatService.isValidRating(rating)) {
            throw ApiException.badRequest("INVALID_RATING", "Rating must be between 1 and 5.", "rating");
        }
        if (csat.existsByServiceRequestId(id)) {
            throw ApiException.conflict("This request has already been rated.");
        }
        CsatResponse response = new CsatResponse();
        response.setServiceRequestId(id);
        response.setWorkspaceId(req.getWorkspaceId());
        response.setCustomerAccountId(req.getCustomerAccountId());
        response.setRating(rating);
        response.setComment(str(body.get("comment")));
        response.setSubmittedBy(me.customerUserId());
        CsatResponse saved = csat.save(csatService.prepareNew(response));
        eventService.record(id, "CSAT_SUBMITTED", me.customerUserId(), Map.of("rating", rating));
        return saved;
    }

    // ── Customer-facing knowledge base ─────────────────────────────────────────────────
    @GetMapping("/knowledge")
    public List<Map<String, Object>> knowledge(@RequestParam(required = false) String q) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        StringBuilder sql = new StringBuilder(
                "SELECT a.id, a.title, a.template_type, a.updated_at, a.view_count "
                + "FROM articles a JOIN knowledge_spaces ks ON ks.id = a.space_id "
                + "WHERE ks.workspace_id = ? AND a.portal_published = TRUE AND a.status = 'PUBLISHED'");
        List<Object> params = new java.util.ArrayList<>();
        params.add(me.workspaceId());
        if (q != null && !q.isBlank()) {
            sql.append(" AND a.title ILIKE ?");
            params.add("%" + q.trim() + "%");
        }
        sql.append(" ORDER BY a.updated_at DESC LIMIT 100");
        return jdbc.query(sql.toString(), (rs, row) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("title", rs.getString("title"));
            m.put("templateType", rs.getString("template_type"));
            m.put("updatedAt", rs.getObject("updated_at"));
            m.put("viewCount", rs.getObject("view_count"));
            return m;
        }, params.toArray());
    }

    @GetMapping("/knowledge/{id}")
    public Map<String, Object> article(@PathVariable String id) {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        List<Map<String, Object>> found = jdbc.query(
                "SELECT a.id, a.title, a.content, a.template_type, a.updated_at "
                + "FROM articles a JOIN knowledge_spaces ks ON ks.id = a.space_id "
                + "WHERE a.id = ? AND ks.workspace_id = ? AND a.portal_published = TRUE AND a.status = 'PUBLISHED'",
                (rs, row) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getString("id"));
                    m.put("title", rs.getString("title"));
                    m.put("content", rs.getString("content"));
                    m.put("templateType", rs.getString("template_type"));
                    m.put("updatedAt", rs.getObject("updated_at"));
                    return m;
                }, id, me.workspaceId());
        if (found.isEmpty()) {
            throw ApiException.notFound("Article", id);
        }
        jdbc.update("UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?", id);
        return found.get(0);
    }

    // ── Customer dashboard ──────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        CustomerContext.CustomerPrincipal me = customerContext.current();
        List<ServiceRequest> all = requests.findByCustomerAccountIdOrderByCreatedAtDesc(me.accountId());
        OffsetDateTime now = OffsetDateTime.now();
        int open = 0;
        int resolved = 0;
        int breached = 0;
        List<Map<String, Object>> recent = new java.util.ArrayList<>();
        for (ServiceRequest r : all) {
            if (requestService.isOpen(r.getStatus())) {
                open++;
                if (requestService.computeSla(r, now).breached()) {
                    breached++;
                }
            } else {
                resolved++;
                if (recent.size() < 5) {
                    recent.add(customerView(r, now));
                }
            }
        }
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("open", open);
        totals.put("resolved", resolved);
        totals.put("total", all.size());
        totals.put("slaBreached", breached);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totals", totals);
        out.put("recentResolutions", recent);
        return out;
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────

    /**
     * B16: On portal submission, auto-create a linked internal WorkItem (type=SERVICE_REQUEST) in
     * the workspace's default project (the first project by name, alphabetically). The link is stored
     * on the ServiceRequest.linkedWorkItemId so agents can navigate to it. Failure is non-fatal —
     * the customer's submission already succeeded; we log and continue (graceful degradation).
     */
    private void autoCreateLinkedWorkItem(ServiceRequest saved, String workspaceId) {
        try {
            List<Project> projects = projectRepository.findByWorkspaceId(workspaceId);
            if (projects.isEmpty()) {
                log.info("[PORTAL] No projects in workspace {} — skipping auto-WorkItem for {}", workspaceId, saved.getId());
                return;
            }
            // Use the lexicographically first project as the default
            Project defaultProject = projects.stream()
                .min(java.util.Comparator.comparing(p -> p.getName() == null ? "" : p.getName()))
                .get();
            WorkItem wi = new WorkItem();
            wi.setId("WI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            wi.setProjectId(defaultProject.getId());
            wi.setType("SERVICE_REQUEST");
            wi.setTitle("[Portal] " + saved.getSubject());
            wi.setDescription(saved.getDescription());
            wi.setPriority(saved.getPriority());
            wi.setStatus("Todo");
            wi.setCreatedBy(saved.getSubmittedBy());
            wi.setCreatedAt(OffsetDateTime.now());
            WorkItem savedWi = workItemRepository.save(wi);
            // Link back onto the service request
            saved.setLinkedWorkItemId(savedWi.getId());
            requests.save(saved);
            eventService.recordInWorkspace(workspaceId, savedWi.getId(), "WORK_ITEM_CREATED_FROM_PORTAL",
                saved.getSubmittedBy(), Map.of("serviceRequestId", saved.getId(), "projectId", defaultProject.getId()));
            log.info("[PORTAL] Auto-created WorkItem {} linked to service request {}", savedWi.getId(), saved.getId());
        } catch (Exception ex) {
            log.warn("[PORTAL] Could not auto-create WorkItem for service request {}: {}", saved.getId(), ex.getMessage());
        }
    }

    private ServiceRequest loadOwned(String id, String accountId) {
        ServiceRequest req = requests.findById(id)
                .orElseThrow(() -> ApiException.notFound("Service request", id));
        if (!accountId.equals(req.getCustomerAccountId())) {
            throw ApiException.notFound("Service request", id); // never reveal another account's request
        }
        return req;
    }

    /** Customer-appropriate projection — omits internal fields (assignee, links, workspace). */
    private Map<String, Object> customerView(ServiceRequest r, OffsetDateTime now) {
        ServiceRequestService.SlaSnapshot sla = requestService.computeSla(r, now);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("subject", r.getSubject());
        m.put("description", r.getDescription());
        m.put("typeKey", r.getTypeKey());
        m.put("status", r.getStatus());
        m.put("priority", r.getPriority());
        m.put("formData", r.getFormData());
        m.put("slaTier", r.getSlaTier());
        m.put("slaDueAt", r.getSlaDueAt());
        m.put("createdAt", r.getCreatedAt());
        m.put("resolvedAt", r.getResolvedAt());
        m.put("rated", csat.existsByServiceRequestId(r.getId()));
        m.put("sla", Map.of(
                "state", sla.state(),
                "minutesRemaining", sla.minutesRemaining(),
                "breached", sla.breached()));
        return m;
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }

    private static String safe(String s) { return s == null ? "" : s; }

    private String toJson(Object o) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }
}
