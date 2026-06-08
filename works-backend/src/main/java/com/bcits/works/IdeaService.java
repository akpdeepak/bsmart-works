package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Cap W · Idea capture inbox business logic (I15-S10). Workspace-scoped (RB-40 §1): the workspace is
 * taken from the idea's {@code workspaceId} and membership + RBAC are asserted here, never in the
 * controller. {@link #classifyArea} and {@link #prepareNew}/{@link #applyUpdate} are pure helpers.
 */
@Service
public class IdeaService {

    private final IdeaRepository repo;
    private final RbacService rbac;
    private final EventService events;

    public IdeaService(IdeaRepository repo, RbacService rbac, EventService events) {
        this.repo = repo;
        this.rbac = rbac;
        this.events = events;
    }

    private void requireWs(String callerId, String wsId, String permission) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        rbac.require(callerId, wsId, permission);
    }

    private Idea loadForMember(String callerId, String id) {
        Idea i = repo.findById(id).orElseThrow(() -> ApiException.notFound("Idea", id));
        if (i.getWorkspaceId() == null || rbac.getUserTier(callerId, i.getWorkspaceId()) < 1) {
            throw ApiException.notFound("Idea", id);
        }
        return i;
    }

    /** Lightweight keyword classifier — the deterministic default area when none is supplied. Pure. */
    static String classifyArea(String title, String description) {
        String text = ((title == null ? "" : title) + " " + (description == null ? "" : description))
                .toLowerCase(Locale.ROOT);
        if (containsAny(text, "login", "auth", "sso", "password", "mfa", "saml")) return "Auth";
        if (containsAny(text, "mobile", "ios", "android", "phone", "responsive")) return "Mobile";
        if (containsAny(text, "report", "dashboard", "chart", "metric", "kpi")) return "Reporting";
        if (containsAny(text, "bill", "invoice", "payment", "pricing", "subscription")) return "Billing";
        if (containsAny(text, "api", "webhook", "integration", "connector", "slack", "github")) return "Integrations";
        if (containsAny(text, "ui", "design", "layout", "theme", "accessibility")) return "UX";
        return "General";
    }

    private static boolean containsAny(String text, String... keys) {
        for (String k : keys) {
            if (text.contains(k)) return true;
        }
        return false;
    }

    Idea prepareNew(Idea i, String callerId) {
        i.setId("IDEA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        i.setCreatedBy(callerId);
        if (i.getSubmittedBy() == null) i.setSubmittedBy(callerId);
        if (i.getStatus() == null) i.setStatus("NEW");
        if (i.getArea() == null || i.getArea().isBlank()) {
            i.setArea(classifyArea(i.getTitle(), i.getDescription()));
        }
        i.setCreatedAt(OffsetDateTime.now());
        i.setUpdatedAt(OffsetDateTime.now());
        return i;
    }

    void applyUpdate(Idea existing, Idea updated) {
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setArea(updated.getArea());
        existing.setStatus(updated.getStatus());
        existing.setProjectId(updated.getProjectId());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<Idea> list(String callerId, String workspaceId, String status) {
        requireWs(callerId, workspaceId, "view_items");
        return (status == null || status.isBlank())
                ? repo.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId)
                : repo.findByWorkspaceIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId, status);
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    @Transactional
    public Idea create(String callerId, Idea in) {
        requireWs(callerId, in.getWorkspaceId(), "create_items");
        Idea saved = repo.save(prepareNew(in, callerId));
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "IDEA_CAPTURED", callerId,
                Map.of("title", saved.getTitle(), "area", saved.getArea()));
        return saved;
    }

    @Transactional
    public Idea update(String callerId, String id, Idea updated) {
        Idea existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        applyUpdate(existing, updated);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        Idea existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }

    @Transactional
    public Idea promote(String callerId, String id, String promotedWorkItemId) {
        Idea existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        existing.setStatus("PROMOTED");
        if (promotedWorkItemId != null && !promotedWorkItemId.isBlank()) {
            existing.setPromotedWorkItemId(promotedWorkItemId);
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        Idea saved = repo.save(existing);
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "IDEA_PROMOTED", callerId,
                Map.of("workItemId", promotedWorkItemId == null ? "" : promotedWorkItemId));
        return saved;
    }

    @Transactional
    public Idea vote(String callerId, String id) {
        Idea existing = loadForMember(callerId, id);
        existing.setVotes(existing.getVotes() + 1);
        existing.setUpdatedAt(OffsetDateTime.now());
        return repo.save(existing);
    }
}
