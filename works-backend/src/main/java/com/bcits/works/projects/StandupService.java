package com.bcits.works.projects;
import com.bcits.works.projects.api.Project;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap V · Standup facilitator (I15-S02). Runs the sequential, time-boxed daily standup: a session
 * with one ordered {@link StandupEntry} per member, a moving "current member" cursor, auto-recorded
 * updates, and a complete step that flags anyone still pending as MISSING.
 *
 * <p>RBAC + tenant scoping live here (RB-10 §2): the workspace is resolved from the project, and
 * running a ceremony requires {@code manage_sprints}. The {@link #prepareSession} helper is pure and
 * DB-free for unit testing (RB-10 §7).
 */
@Service
public class StandupService {

    private final StandupSessionRepository sessions;
    private final StandupEntryRepository entries;
    private final RbacGate rbac;
    private final EventService events;

    public StandupService(StandupSessionRepository sessions, StandupEntryRepository entries,
                          RbacGate rbac, EventService events) {
        this.sessions = sessions;
        this.entries = entries;
        this.rbac = rbac;
        this.events = events;
    }

    private String requireWorkspaceForProject(String callerId, String projectId, String permission) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, permission);
        return wsId;
    }

    private StandupSession loadForMember(String callerId, String id) {
        StandupSession s = sessions.findById(id)
                .orElseThrow(() -> ApiException.notFound("Standup", id));
        if (s.getWorkspaceId() == null || rbac.getUserTier(callerId, s.getWorkspaceId()) < 1) {
            throw ApiException.notFound("Standup", id);
        }
        return s;
    }

    // ── Pure helper (unit-testable) ───────────────────────────────────────────
    StandupSession prepareSession(StandupSession s, String wsId, String callerId) {
        s.setId("STD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setWorkspaceId(wsId);
        s.setCreatedBy(callerId);
        if (s.getFacilitatorId() == null) s.setFacilitatorId(callerId);
        if (s.getSessionDate() == null) s.setSessionDate(LocalDate.now()); {
        s.setStatus("IN_PROGRESS");
        }
        s.setCreatedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        return s;
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<StandupSession> listByProject(String callerId, String projectId) {
        requireWorkspaceForProject(callerId, projectId, "view_items");
        return sessions.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public Map<String, Object> getWithEntries(String callerId, String id) {
        StandupSession s = loadForMember(callerId, id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("session", s);
        out.put("entries", entries.findBySessionIdOrderByDisplayOrderAsc(id));
        return out;
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> create(String callerId, String projectId, String sprintId, List<String> memberIds) {
        String wsId = requireWorkspaceForProject(callerId, projectId, "manage_sprints");
        StandupSession s = new StandupSession();
        s.setProjectId(projectId);
        s.setSprintId(sprintId);
        prepareSession(s, wsId, callerId);
        s.setCurrentMemberId(memberIds != null && !memberIds.isEmpty() ? memberIds.get(0) : null);
        sessions.save(s);
        int order = 0;
        if (memberIds != null) {
            for (String memberId : memberIds) {
                StandupEntry e = new StandupEntry();
                e.setId("STE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                e.setSessionId(s.getId());
                e.setMemberId(memberId);
                e.setStatus("PENDING");
                e.setDisplayOrder(order++);
                entries.save(e);
            }
        }
        events.recordInWorkspace(wsId, s.getId(), "STANDUP_STARTED", callerId,
                Map.of("projectId", projectId, "members", memberIds == null ? 0 : memberIds.size()));
        return getWithEntries(callerId, s.getId());
    }

    @Transactional
    public StandupEntry recordEntry(String callerId, String sessionId, String entryId,
                                    String yesterday, String today, String blockers) {
        StandupSession s = loadForMember(callerId, sessionId);
        StandupEntry e = entries.findById(entryId)
                .orElseThrow(() -> ApiException.notFound("StandupEntry", entryId));
        if (!sessionId.equals(e.getSessionId())) {
            throw ApiException.notFound("StandupEntry", entryId);
        }
        // Async-first standup (My Day): any member may record THEIR OWN entry;
        // recording someone else's still requires the facilitator permission.
        if (!callerId.equals(e.getMemberId())) {
            rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        }
        e.setYesterday(yesterday);
        e.setToday(today);
        e.setBlockers(blockers);
        e.setStatus("RECORDED");
        e.setRecordedAt(OffsetDateTime.now());
        return entries.save(e);
    }

    @Transactional
    public StandupSession advance(String callerId, String sessionId) {
        StandupSession s = loadForMember(callerId, sessionId);
        rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        List<StandupEntry> ordered = entries.findBySessionIdOrderByDisplayOrderAsc(sessionId);
        String next = nextMember(ordered, s.getCurrentMemberId());
        s.setCurrentMemberId(next);
        s.setUpdatedAt(OffsetDateTime.now());
        return sessions.save(s);
    }

    /** Next member after the current cursor, in display order; null when the current is last. Pure. */
    static String nextMember(List<StandupEntry> ordered, String currentMemberId) {
        int idx = -1;
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getMemberId().equals(currentMemberId)) {
                idx = i;
                break;
            }
        }
        int next = idx + 1;
        return next >= 0 && next < ordered.size() ? ordered.get(next).getMemberId() : null;
    }

    @Transactional
    public Map<String, Object> complete(String callerId, String sessionId) {
        StandupSession s = loadForMember(callerId, sessionId);
        rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        int missing = 0;
        for (StandupEntry e : entries.findBySessionIdOrderByDisplayOrderAsc(sessionId)) {
            if ("PENDING".equals(e.getStatus())) {
                e.setStatus("MISSING");
                entries.save(e);
                missing++;
            }
        }
        s.setStatus("COMPLETED");
        s.setCurrentMemberId(null);
        s.setUpdatedAt(OffsetDateTime.now());
        sessions.save(s);
        events.recordInWorkspace(s.getWorkspaceId(), sessionId, "STANDUP_COMPLETED", callerId,
                Map.of("missing", missing));
        return getWithEntries(callerId, sessionId);
    }
}
