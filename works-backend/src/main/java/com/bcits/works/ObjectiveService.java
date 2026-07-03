package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap W · OKR linkage business logic (I15-S12). RBAC + tenant scoping live here, never in the
 * controller (RB-10 §2, CLAUDE.md §4). Objectives, key results and links all carry workspaceId, so a
 * caller can only read/write OKRs inside a workspace they belong to (RB-40 §1).
 *
 * <p>The {@link #prepareNew} / {@link #applyUpdate} helpers and the {@link #krProgress} /
 * {@link #objectiveProgress} calculators are pure and DB-free so they are unit-testable without a
 * Spring context (RB-10 §7).
 */
@Service
public class ObjectiveService {

    private final ObjectiveRepository repo;
    private final KeyResultRepository krRepo;
    private final OkrLinkRepository linkRepo;
    private final RbacService rbac;
    private final EventService events;

    public ObjectiveService(ObjectiveRepository repo, KeyResultRepository krRepo,
                            OkrLinkRepository linkRepo, RbacService rbac, EventService events) {
        this.repo = repo;
        this.krRepo = krRepo;
        this.linkRepo = linkRepo;
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

    private Objective loadObjective(String callerId, String id, String permission) {
        Objective o = repo.findById(id).orElseThrow(() -> ApiException.notFound("Objective", id));
        requireWs(callerId, o.getWorkspaceId(), permission);
        return o;
    }

    private KeyResult loadKeyResult(String callerId, String id, String permission) {
        KeyResult kr = krRepo.findById(id).orElseThrow(() -> ApiException.notFound("Key result", id));
        requireWs(callerId, kr.getWorkspaceId(), permission);
        return kr;
    }

    // ── Reads (tenant-scoped) ─────────────────────────────────────────────────
    public List<Objective> listByWorkspace(String callerId, String workspaceId) {
        requireWs(callerId, workspaceId, "view_items");
        return repo.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId);
    }

    public Map<String, Object> getWithKeyResults(String callerId, String objectiveId) {
        Objective o = loadObjective(callerId, objectiveId, "view_items");
        List<KeyResult> keyResults = krRepo.findByObjectiveIdOrderByDisplayOrderAsc(objectiveId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("objective", o);
        out.put("keyResults", keyResults);
        out.put("progressPercent", objectiveProgress(keyResults));
        return out;
    }

    public List<OkrLink> listLinks(String callerId, String krId) {
        KeyResult kr = loadKeyResult(callerId, krId, "view_items");
        return linkRepo.findByKeyResultId(kr.getId());
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    Objective prepareNew(Objective o, String callerId) {
        o.setId("OBJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        o.setCreatedBy(callerId);
        if (o.getLevel() == null) o.setLevel("TEAM");
        if (o.getStatus() == null) o.setStatus("ON_TRACK"); {
        o.setCreatedAt(OffsetDateTime.now());
        }
        o.setUpdatedAt(OffsetDateTime.now());
        return o;
    }

    void applyUpdate(Objective existing, Objective updated) {
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setProjectId(updated.getProjectId());
        existing.setLevel(updated.getLevel());
        existing.setQuarter(updated.getQuarter());
        existing.setStatus(updated.getStatus());
        existing.setOwnerId(updated.getOwnerId());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    KeyResult prepareNewKr(KeyResult kr, String objectiveId, String wsId) {
        kr.setId("KR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        kr.setObjectiveId(objectiveId);
        kr.setWorkspaceId(wsId);
        if (kr.getMetricType() == null) kr.setMetricType("PERCENT");
        if (kr.getStatus() == null) kr.setStatus("ON_TRACK"); {
        kr.setCreatedAt(OffsetDateTime.now());
        }
        kr.setUpdatedAt(OffsetDateTime.now());
        return kr;
    }

    void applyKrUpdate(KeyResult existing, KeyResult updated) {
        existing.setTitle(updated.getTitle());
        existing.setMetricType(updated.getMetricType());
        existing.setStartValue(updated.getStartValue());
        existing.setTargetValue(updated.getTargetValue());
        existing.setCurrentValue(updated.getCurrentValue());
        existing.setStatus(updated.getStatus());
        existing.setDisplayOrder(updated.getDisplayOrder());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    /** Progress of a single key result as a 0..100 percent. */
    static int krProgress(KeyResult kr) {
        if ("BOOLEAN".equals(kr.getMetricType())) {
            return kr.getCurrentValue() >= kr.getTargetValue() ? 100 : 0;
        }
        if (kr.getTargetValue() == kr.getStartValue()) return 0;
        double raw = (kr.getCurrentValue() - kr.getStartValue())
                / (kr.getTargetValue() - kr.getStartValue()) * 100;
        long rounded = Math.round(raw);
        return (int) Math.max(0, Math.min(100, rounded));
    }

    /** Average progress across an objective's key results; 0 when there are none. */
    static int objectiveProgress(List<KeyResult> keyResults) {
        if (keyResults == null || keyResults.isEmpty()) return 0;
        long sum = 0;
        for (KeyResult kr : keyResults) {
            sum += krProgress(kr);
        }
        return (int) (sum / keyResults.size());
    }

    // ── Objective writes ──────────────────────────────────────────────────────
    @Transactional
    public Objective create(String callerId, Objective in) {
        requireWs(callerId, in.getWorkspaceId(), "create_items");
        Objective saved = repo.save(prepareNew(in, callerId));
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "OBJECTIVE_CREATED", callerId,
                Map.of("title", saved.getTitle(), "level", saved.getLevel()));
        return saved;
    }

    @Transactional
    public Objective update(String callerId, String id, Objective updated) {
        Objective existing = loadObjective(callerId, id, "create_items");
        applyUpdate(existing, updated);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        Objective existing = loadObjective(callerId, id, "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }

    // ── Key-result writes ─────────────────────────────────────────────────────
    @Transactional
    public KeyResult addKeyResult(String callerId, String objectiveId, KeyResult kr) {
        Objective o = loadObjective(callerId, objectiveId, "create_items");
        return krRepo.save(prepareNewKr(kr, o.getId(), o.getWorkspaceId()));
    }

    @Transactional
    public KeyResult updateKeyResult(String callerId, String krId, KeyResult updated) {
        KeyResult existing = loadKeyResult(callerId, krId, "create_items");
        applyKrUpdate(existing, updated);
        return krRepo.save(existing);
    }

    @Transactional
    public void deleteKeyResult(String callerId, String krId) {
        KeyResult existing = loadKeyResult(callerId, krId, "delete_items");
        krRepo.delete(existing);
    }

    // ── Linking ───────────────────────────────────────────────────────────────
    @Transactional
    public OkrLink linkEntity(String callerId, String krId, String entityType, String entityId) {
        KeyResult kr = loadKeyResult(callerId, krId, "create_items");
        if (linkRepo.existsByKeyResultIdAndEntityTypeAndEntityId(kr.getId(), entityType, entityId)) {
            List<OkrLink> existing = linkRepo.findByKeyResultId(kr.getId());
            for (OkrLink l : existing) {
                if (l.getEntityType().equals(entityType) && l.getEntityId().equals(entityId)) {
                    return l;
                }
            }
        }
        OkrLink link = new OkrLink();
        link.setId("OKL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        link.setWorkspaceId(kr.getWorkspaceId());
        link.setKeyResultId(kr.getId());
        link.setEntityType(entityType);
        link.setEntityId(entityId);
        link.setCreatedBy(callerId);
        link.setCreatedAt(OffsetDateTime.now());
        OkrLink saved = linkRepo.save(link);
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "OKR_LINKED", callerId,
                Map.of("keyResultId", kr.getId(), "entityType", entityType, "entityId", entityId));
        return saved;
    }

    @Transactional
    public void unlink(String callerId, String linkId) {
        OkrLink link = linkRepo.findById(linkId).orElseThrow(() -> ApiException.notFound("OKR link", linkId));
        requireWs(callerId, link.getWorkspaceId(), "delete_items");
        linkRepo.delete(link);
    }
}
