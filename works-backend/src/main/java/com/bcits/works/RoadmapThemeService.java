package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap W · Product roadmap business logic (I15-S08). Workspace-scoped CRUD for roadmap themes; RBAC +
 * tenant scoping live here. Pure {@link #prepareNew}/{@link #applyUpdate} helpers are DB-free.
 */
@Service
public class RoadmapThemeService {

    private final RoadmapThemeRepository repo;
    private final RbacService rbac;
    private final EventService events;

    public RoadmapThemeService(RoadmapThemeRepository repo, RbacService rbac, EventService events) {
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

    private RoadmapTheme loadForMember(String callerId, String id) {
        RoadmapTheme t = repo.findById(id).orElseThrow(() -> ApiException.notFound("RoadmapTheme", id));
        if (t.getWorkspaceId() == null || rbac.getUserTier(callerId, t.getWorkspaceId()) < 1) {
            throw ApiException.notFound("RoadmapTheme", id);
        }
        return t;
    }

    RoadmapTheme prepareNew(RoadmapTheme t, String callerId) {
        t.setId("THM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        t.setCreatedBy(callerId);
        if (t.getStatus() == null) t.setStatus("PLANNED"); {
        t.setCreatedAt(OffsetDateTime.now());
        }
        t.setUpdatedAt(OffsetDateTime.now());
        return t;
    }

    void applyUpdate(RoadmapTheme existing, RoadmapTheme updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setStatus(updated.getStatus());
        existing.setQuarter(updated.getQuarter());
        existing.setStartDate(updated.getStartDate());
        existing.setTargetDate(updated.getTargetDate());
        existing.setColor(updated.getColor());
        existing.setObjectiveId(updated.getObjectiveId());
        existing.setProjectId(updated.getProjectId());
        existing.setDisplayOrder(updated.getDisplayOrder());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<RoadmapTheme> list(String callerId, String workspaceId) {
        requireWs(callerId, workspaceId, "view_items");
        return repo.findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscCreatedAtAsc(workspaceId);
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    @Transactional
    public RoadmapTheme create(String callerId, RoadmapTheme in) {
        requireWs(callerId, in.getWorkspaceId(), "manage_sprints");
        RoadmapTheme saved = repo.save(prepareNew(in, callerId));
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "ROADMAP_THEME_CREATED", callerId,
                Map.of("name", saved.getName(), "quarter", saved.getQuarter() == null ? "" : saved.getQuarter()));
        return saved;
    }

    @Transactional
    public RoadmapTheme update(String callerId, String id, RoadmapTheme updated) {
        RoadmapTheme existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sprints");
        applyUpdate(existing, updated);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        RoadmapTheme existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sprints");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }
}
