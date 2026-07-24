package com.bcits.works.automation;

import com.bcits.works.shared.AutomationCatalog;
import com.bcits.works.AutomationService;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Integration connectors (iteration 13, Cap Q / Cap A): Slack, GitHub, GitLab, email, calendar, and
 * the SSO/SCIM identity providers. Connections are workspace-scoped (RB-40 §1) and validated against
 * {@link IntegrationCatalog}. The email connector's inbound path turns a message into a work item.
 * As with the AI and webhook seams, the actual provider calls are a pluggable boundary — this build
 * stores and validates configuration deterministically; live OAuth/API calls plug in later.
 */
@Service
public class IntegrationService {

    private static final Logger log = LoggerFactory.getLogger(IntegrationService.class);

    private final IntegrationConnectionRepository connections;
    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final EventService events;
    private final AutomationService automations;
    private final ObjectMapper json = new ObjectMapper();

    public IntegrationService(IntegrationConnectionRepository connections, WorkItemRepository workItems,
                              ProjectRepository projects, EventService events,
                              AutomationService automations) {
        this.connections = connections;
        this.workItems = workItems;
        this.projects = projects;
        this.events = events;
        this.automations = automations;
    }

    public List<Map<String, Object>> providers() {
        return IntegrationCatalog.all().stream().map(p -> Map.<String, Object>of(
            "id", p.id(), "label", p.label(), "category", p.category(),
            "requiredFields", p.requiredFields(), "inbound", p.inbound(), "outbound", p.outbound()
        )).collect(Collectors.toList());
    }

    public List<IntegrationConnection> list(String workspaceId) {
        return connections.findByWorkspaceIdOrderByProviderAsc(workspaceId);
    }

    @Transactional
    public IntegrationConnection connect(String workspaceId, String creatorId, String provider,
                                         String name, String configJson) {
        if (!IntegrationCatalog.isProvider(provider)) {
            throw ApiException.badRequest("UNKNOWN_PROVIDER", "Unknown integration provider: " + provider, "provider");
        }
        String p = provider.trim().toUpperCase(java.util.Locale.ROOT);
        Map<String, Object> config = parseConfig(configJson);
        validateConfig(p, config);
        String connName = (name == null || name.isBlank()) ? IntegrationCatalog.get(p).label() : name;
        IntegrationConnection conn = connections.findByWorkspaceIdAndProviderAndName(workspaceId, p, connName)
            .orElseGet(IntegrationConnection::new);
        boolean isNew = conn.getId() == null;
        if (isNew) {
            conn.setId("INT-" + shortId());
            conn.setWorkspaceId(workspaceId);
            conn.setProvider(p);
            conn.setName(connName);
            conn.setCreatedBy(creatorId);
            conn.setCreatedAt(OffsetDateTime.now());
        }
        conn.setConfig(configJson == null || configJson.isBlank() ? "{}" : configJson);
        conn.setStatus("CONNECTED");
        conn.setUpdatedAt(OffsetDateTime.now());
        return connections.save(conn);
    }

    @Transactional
    public IntegrationConnection disconnect(String workspaceId, String id) {
        IntegrationConnection conn = require(workspaceId, id);
        conn.setStatus("DISCONNECTED");
        conn.setUpdatedAt(OffsetDateTime.now());
        return connections.save(conn);
    }

    /** Deterministic connection test — a real provider ping plugs in here later. */
    public Map<String, Object> test(String workspaceId, String id) {
        IntegrationConnection conn = require(workspaceId, id);
        boolean ok = "CONNECTED".equals(conn.getStatus());
        return Map.of("id", conn.getId(), "provider", conn.getProvider(), "ok", ok,
            "message", ok ? "Connection healthy." : "Connection is disconnected.");
    }

    /** Email connector inbound: turn a message into a work item (Cap Q). RBAC is enforced upstream. */
    @Transactional
    public WorkItem ingestInboundEmail(String workspaceId, String creatorId, String subject,
                                       String body, String projectId) {
        String pid = projectId != null ? projectId
            : projects.findByWorkspaceId(workspaceId).stream().findFirst().map(Project::getId).orElse(null);
        if (pid == null) {
            throw ApiException.badRequest("NO_PROJECT", "No project available to receive the email.");
        }
        // Workspace-scope guard (RB-40 §1): the target project must belong to this workspace.
        boolean inWorkspace = projects.findByWorkspaceId(workspaceId).stream().anyMatch(p -> p.getId().equals(pid));
        if (!inWorkspace) {
            throw ApiException.forbidden("Project belongs to a different workspace.");
        }
        WorkItem w = new WorkItem();
        w.setId(pid.replace("PROJ-", "") + "-" + shortId());
        w.setTitle(subject == null || subject.isBlank() ? "Inbound email" : subject.trim());
        w.setDescription(body);
        w.setType("Service Request");
        w.setStatus("Todo");
        w.setPriority("Medium");
        w.setProjectId(pid);
        w.setCreatedBy(creatorId);
        w.setCreatedAt(OffsetDateTime.now());
        WorkItem saved = workItems.save(w);
        events.recordInWorkspace(workspaceId, saved.getId(), "WORK_ITEM_CREATED", creatorId,
            Map.of("via", "email_connector", "title", saved.getTitle()));
        // Fire ITEM_CREATED automations (non-fatal — must not roll back the ingest).
        try {
            automations.evaluateForItem(workspaceId, AutomationCatalog.TR_ITEM_CREATED, saved, creatorId);
        } catch (Exception ex) {
            log.warn("Automation evaluation failed after email-connector ingest of {}: {}", saved.getId(), ex.getMessage());
        }
        return saved;
    }

    private IntegrationConnection require(String workspaceId, String id) {
        IntegrationConnection conn = connections.findById(id)
            .orElseThrow(() -> ApiException.notFound("Integration connection", id));
        if (!workspaceId.equals(conn.getWorkspaceId())) {
            throw ApiException.forbidden("Connection belongs to a different workspace.");
        }
        return conn;
    }

    // ── Pure validation (unit-testable, RB-10 §7) ────────────────────────────────

    /** Throws 400 when a required config field for the provider is missing or blank. */
    static void validateConfig(String provider, Map<String, Object> config) {
        for (String field : IntegrationCatalog.requiredFields(provider)) {
            Object v = config == null ? null : config.get(field);
            if (v == null || v.toString().isBlank()) {
                throw ApiException.badRequest("MISSING_CONFIG",
                    "Provider " + provider + " requires config field: " + field, field);
            }
        }
    }

    private Map<String, Object> parseConfig(String configJson) {
        if (configJson == null || configJson.isBlank()) {
            return Map.of();
        }
        try {
            return json.readValue(configJson, new TypeReference<Map<String, Object>>() { });
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CONFIG", "config must be a JSON object.", "config");
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
