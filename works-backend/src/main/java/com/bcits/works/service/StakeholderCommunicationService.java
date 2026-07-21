package com.bcits.works.service;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap W · Stakeholder communication business logic (I15-S14). RBAC + tenant scoping live here, never
 * in the controller (RB-10 §2, CLAUDE.md §4). The workspace is carried on the entity, so a caller can
 * only read/write communications inside a workspace they belong to (RB-40 §1).
 *
 * <p>The {@link #prepareNew} / {@link #applyUpdate} helpers are pure and DB-free so they are
 * unit-testable without a Spring context (RB-10 §7).
 */
@Service
public class StakeholderCommunicationService {

    private final StakeholderCommunicationRepository repo;
    private final RbacGate rbac;
    private final EventService events;

    public StakeholderCommunicationService(StakeholderCommunicationRepository repo, RbacGate rbac,
                                           EventService events) {
        this.repo = repo;
        this.rbac = rbac;
        this.events = events;
    }

    // ── Tenant guard ─────────────────────────────────────────────────────────
    private void requireWs(String callerId, String wsId, String permission) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        rbac.require(callerId, wsId, permission);
    }

    private StakeholderCommunication loadForMember(String callerId, String id, String permission) {
        StakeholderCommunication c = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Stakeholder communication", id));
        requireWs(callerId, c.getWorkspaceId(), permission);
        return c;
    }

    // ── Reads (tenant-scoped) ─────────────────────────────────────────────────
    public List<StakeholderCommunication> listByProject(String callerId, String projectId) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, "view_items");
        return repo.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId);
    }

    public List<StakeholderCommunication> listByWorkspace(String callerId, String workspaceId) {
        requireWs(callerId, workspaceId, "view_items");
        return repo.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId);
    }

    public StakeholderCommunication get(String callerId, String id) {
        return loadForMember(callerId, id, "view_items");
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    StakeholderCommunication prepareNew(StakeholderCommunication c, String callerId) {
        c.setId("STK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setCreatedBy(callerId);
        if (c.getChannel() == null) c.setChannel("EMAIL");
        if (c.getStatus() == null) c.setStatus("DRAFT");
        if (c.getStakeholderIds() == null) c.setStakeholderIds("[]"); {
        c.setCreatedAt(OffsetDateTime.now());
        }
        c.setUpdatedAt(OffsetDateTime.now());
        return c;
    }

    void applyUpdate(StakeholderCommunication existing, StakeholderCommunication updated) {
        existing.setSubject(updated.getSubject());
        existing.setBody(updated.getBody());
        existing.setChannel(updated.getChannel());
        existing.setRelatedReleaseId(updated.getRelatedReleaseId());
        existing.setStakeholderIds(updated.getStakeholderIds() != null ? updated.getStakeholderIds() : "[]");
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Writes ────────────────────────────────────────────────────────────────
    @Transactional
    public StakeholderCommunication create(String callerId, StakeholderCommunication in) {
        requireWs(callerId, in.getWorkspaceId(), "create_items");
        StakeholderCommunication saved = repo.save(prepareNew(in, callerId));
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "STAKEHOLDER_COMM_CREATED",
                callerId, Map.of("subject", saved.getSubject(), "channel", saved.getChannel()));
        return saved;
    }

    @Transactional
    public StakeholderCommunication update(String callerId, String id, StakeholderCommunication updated) {
        StakeholderCommunication existing = loadForMember(callerId, id, "create_items");
        applyUpdate(existing, updated);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        StakeholderCommunication existing = loadForMember(callerId, id, "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }

    @Transactional
    public StakeholderCommunication send(String callerId, String id) {
        StakeholderCommunication existing = loadForMember(callerId, id, "create_items");
        existing.setStatus("SENT");
        existing.setSentAt(OffsetDateTime.now());
        existing.setUpdatedAt(OffsetDateTime.now());
        StakeholderCommunication saved = repo.save(existing);
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "STAKEHOLDER_COMM_SENT",
                callerId, Map.of("subject", saved.getSubject(), "channel", saved.getChannel()));
        return saved;
    }
}
