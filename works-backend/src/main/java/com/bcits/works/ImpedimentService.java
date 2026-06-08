package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap V · Impediment tracker business logic (I15-S03). RBAC + tenant scoping live here, never in the
 * controller (RB-10 §2, CLAUDE.md §4). The workspace is resolved from the impediment's project, so a
 * caller can only read/write impediments inside a workspace they belong to (RB-40 §1).
 *
 * <p>The {@link #prepareNew} / {@link #applyUpdate} / {@link #ageDays} helpers are pure and
 * DB-free so they are unit-testable without a Spring context (RB-10 §7).
 */
@Service
public class ImpedimentService {

    private final ImpedimentRepository repo;
    private final RbacService rbac;
    private final EventService events;

    public ImpedimentService(ImpedimentRepository repo, RbacService rbac, EventService events) {
        this.repo = repo;
        this.rbac = rbac;
        this.events = events;
    }

    // ── Tenant guard ─────────────────────────────────────────────────────────
    private String requireWorkspaceForProject(String callerId, String projectId, String permission) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, permission);
        return wsId;
    }

    private Impediment loadForMember(String callerId, String id) {
        Impediment i = repo.findById(id).orElseThrow(() -> ApiException.notFound("Impediment", id));
        String wsId = i.getWorkspaceId();
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Impediment", id);
        }
        return i;
    }

    // ── Reads (tenant-scoped) ─────────────────────────────────────────────────
    public List<Impediment> listByProject(String callerId, String projectId) {
        requireWorkspaceForProject(callerId, projectId, "view_items");
        return repo.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId);
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    Impediment prepareNew(Impediment i, String wsId, String callerId) {
        i.setId("IMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        i.setWorkspaceId(wsId);
        i.setCreatedBy(callerId);
        if (i.getRaisedBy() == null) i.setRaisedBy(callerId);
        if (i.getRaisedAt() == null) i.setRaisedAt(LocalDate.now());
        if (i.getStatus() == null) i.setStatus("OPEN");
        if (i.getSeverity() == null) i.setSeverity("MEDIUM");
        i.setCreatedAt(OffsetDateTime.now());
        i.setUpdatedAt(OffsetDateTime.now());
        return i;
    }

    void applyUpdate(Impediment existing, Impediment updated) {
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setSeverity(updated.getSeverity());
        existing.setSprintId(updated.getSprintId());
        existing.setOwnerId(updated.getOwnerId());
        existing.setRelatedWorkItemId(updated.getRelatedWorkItemId());
        existing.setEscalated(updated.isEscalated());
        String newStatus = updated.getStatus();
        if (newStatus != null && !newStatus.equals(existing.getStatus())) {
            existing.setStatus(newStatus);
            if ("RESOLVED".equals(newStatus) && existing.getResolvedAt() == null) {
                existing.setResolvedAt(LocalDate.now());
            }
        }
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    /** Age of an open impediment in whole days from when it was raised; 0 if unknown. */
    static long ageDays(Impediment i, LocalDate today) {
        if (i.getRaisedAt() == null) return 0;
        LocalDate end = i.getResolvedAt() != null ? i.getResolvedAt() : today;
        long days = end.toEpochDay() - i.getRaisedAt().toEpochDay();
        return Math.max(0, days);
    }

    // ── Writes ────────────────────────────────────────────────────────────────
    @Transactional
    public Impediment create(String callerId, Impediment in) {
        String wsId = requireWorkspaceForProject(callerId, in.getProjectId(), "create_items");
        Impediment saved = repo.save(prepareNew(in, wsId, callerId));
        events.recordInWorkspace(wsId, saved.getId(), "IMPEDIMENT_RAISED", callerId,
                Map.of("title", saved.getTitle(), "severity", saved.getSeverity()));
        return saved;
    }

    @Transactional
    public Impediment update(String callerId, String id, Impediment updated) {
        Impediment existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        String oldStatus = existing.getStatus();
        applyUpdate(existing, updated);
        Impediment saved = repo.save(existing);
        if (!oldStatus.equals(saved.getStatus())) {
            events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "IMPEDIMENT_STATUS_CHANGED",
                    callerId, Map.of("from", oldStatus, "to", saved.getStatus()));
        }
        return saved;
    }

    @Transactional
    public void delete(String callerId, String id) {
        Impediment existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }
}
