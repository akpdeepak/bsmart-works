package com.example.demo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap X · AI executive briefing (iteration 16). Workspace-scoped CRUD for the schedulable, editable
 * briefing card plus {@link #generate} which (re)computes the narrative through the AI Control Plane
 * and persists it. RBAC + tenant scoping live here (RB-10 §2, RB-40 §1).
 */
@Service
public class ExecutiveBriefingService {

    private final ExecutiveBriefingRepository repo;
    private final Iteration16AiService ai;
    private final RbacService rbac;
    private final EventService events;

    public ExecutiveBriefingService(ExecutiveBriefingRepository repo, Iteration16AiService ai,
                                    RbacService rbac, EventService events) {
        this.repo = repo;
        this.ai = ai;
        this.rbac = rbac;
        this.events = events;
    }

    private void requireWs(String callerId, String wsId, String permission) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        rbac.require(callerId, wsId, permission);
    }

    private ExecutiveBriefing loadForManage(String callerId, String id) {
        ExecutiveBriefing b = repo.findById(id).orElseThrow(() -> ApiException.notFound("ExecutiveBriefing", id));
        if (b.getWorkspaceId() == null || rbac.getUserTier(callerId, b.getWorkspaceId()) < 1) {
            throw ApiException.notFound("ExecutiveBriefing", id);
        }
        rbac.require(callerId, b.getWorkspaceId(), "manage_projects");
        return b;
    }

    public List<ExecutiveBriefing> list(String callerId, String workspaceId) {
        requireWs(callerId, workspaceId, "view_items");
        return repo.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional
    public ExecutiveBriefing create(String callerId, ExecutiveBriefing in) {
        requireWs(callerId, in.getWorkspaceId(), "manage_projects");
        in.setId("EB-" + shortId());
        in.setCreatedBy(callerId);
        if (in.getStatus() == null) in.setStatus("DRAFT");
        OffsetDateTime now = OffsetDateTime.now();
        in.setCreatedAt(now);
        in.setUpdatedAt(now);
        return repo.save(in);
    }

    @Transactional
    public ExecutiveBriefing update(String callerId, String id, ExecutiveBriefing updated) {
        ExecutiveBriefing b = loadForManage(callerId, id);
        b.setTitle(updated.getTitle());
        b.setFocus(updated.getFocus());
        b.setTone(updated.getTone());
        b.setLength(updated.getLength());
        b.setCadence(updated.getCadence());
        b.setStatus(updated.getStatus());
        b.setContent(updated.getContent());
        b.setUpdatedAt(OffsetDateTime.now());
        return repo.save(b);
    }

    @Transactional
    public void delete(String callerId, String id) {
        ExecutiveBriefing b = loadForManage(callerId, id);
        repo.delete(b);
    }

    /** (Re)generate the briefing narrative from current workspace data and persist it. */
    @Transactional
    public Map<String, Object> generate(String callerId, String id, boolean inContext) {
        ExecutiveBriefing b = loadForManage(callerId, id);
        Map<String, Object> result = ai.executiveBriefing(b.getWorkspaceId(), callerId,
            b.getFocus(), b.getTone(), b.getLength(), inContext);
        b.setContent(String.valueOf(result.get("narrative")));
        b.setPeriod(currentPeriod());
        b.setGeneratedAt(OffsetDateTime.now());
        b.setUpdatedAt(OffsetDateTime.now());
        repo.save(b);
        events.recordInWorkspace(b.getWorkspaceId(), b.getId(), "EXEC_BRIEFING_GENERATED", callerId,
            Map.of("period", b.getPeriod()));
        result.put("briefing", b);
        return result;
    }

    private static String currentPeriod() {
        OffsetDateTime now = OffsetDateTime.now();
        return now.getYear() + "-W" + now.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
