package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Cap V · Sprint ceremonies with attendance. Schedules, starts and completes a ceremony
 * session of any type, seeding the expected attendee list when scheduled. Members mark
 * themselves JOINED while the session is LIVE; the facilitator may mark EXCUSED; anyone
 * still EXPECTED when the ceremony completes becomes ABSENT.
 *
 * <p>RBAC + tenant scoping live here (RB-10 §2): the workspace is resolved from the project;
 * running a ceremony requires {@code manage_sprints}; joining requires only membership.
 * The {@link #prepareSession} and {@link #markAbsentees} helpers are pure for unit testing
 * (RB-10 §7). Lifecycle and attendance transitions are recorded in the events table.
 */
@Service
public class CeremonyService {

    static final Set<String> CEREMONY_TYPES = Set.of("STANDUP", "PLANNING", "REVIEW", "RETRO", "REFINEMENT");

    private final CeremonySessionRepository sessions;
    private final CeremonyAttendeeRepository attendance;
    private final RbacService rbac;
    private final EventService events;

    public CeremonyService(CeremonySessionRepository sessions, CeremonyAttendeeRepository attendance,
                           RbacService rbac, EventService events) {
        this.sessions = sessions;
        this.attendance = attendance;
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

    private CeremonySession loadForMember(String callerId, String id) {
        CeremonySession s = sessions.findById(id)
                .orElseThrow(() -> ApiException.notFound("Ceremony", id));
        if (s.getWorkspaceId() == null || rbac.getUserTier(callerId, s.getWorkspaceId()) < 1) {
            throw ApiException.notFound("Ceremony", id);
        }
        return s;
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    CeremonySession prepareSession(CeremonySession s, String wsId, String callerId) {
        if (s.getCeremonyType() == null || !CEREMONY_TYPES.contains(s.getCeremonyType())) {
            throw ApiException.badRequest("INVALID_CEREMONY_TYPE",
                "Unknown ceremony type: " + s.getCeremonyType() + ". Expected one of " + CEREMONY_TYPES + ".",
                "ceremonyType");
        }
        s.setId("CER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setWorkspaceId(wsId);
        s.setCreatedBy(callerId);
        if (s.getFacilitatorId() == null) s.setFacilitatorId(callerId);
        s.setStatus("SCHEDULED");
        s.setCreatedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        return s;
    }

    /** Flip everyone still EXPECTED to ABSENT; returns how many were flipped. Pure. */
    static int markAbsentees(List<CeremonyAttendee> rows) {
        int absent = 0;
        for (CeremonyAttendee a : rows) {
            if ("EXPECTED".equals(a.getStatus())) {
                a.setStatus("ABSENT");
                absent++;
            }
        }
        return absent;
    }

    /** Attendance counts by status, for list rows and the completion event. Pure. */
    static Map<String, Long> summarize(List<CeremonyAttendee> rows) {
        Map<String, Long> out = new LinkedHashMap<>();
        for (String status : List.of("JOINED", "EXPECTED", "ABSENT", "EXCUSED")) {
            out.put(status.toLowerCase(), rows.stream().filter(a -> status.equals(a.getStatus())).count());
        }
        return out;
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<Map<String, Object>> listByProject(String callerId, String projectId) {
        requireWorkspaceForProject(callerId, projectId, "view_items");
        return sessions.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(s -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("session", s);
                    row.put("counts", summarize(attendance.findBySessionIdOrderByJoinedAtAsc(s.getId())));
                    return row;
                })
                .toList();
    }

    public Map<String, Object> getWithAttendance(String callerId, String id) {
        CeremonySession s = loadForMember(callerId, id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("session", s);
        List<CeremonyAttendee> rows = attendance.findBySessionIdOrderByJoinedAtAsc(id);
        out.put("attendance", rows);
        out.put("counts", summarize(rows));
        return out;
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> schedule(String callerId, CeremonySession in, List<String> memberIds) {
        String wsId = requireWorkspaceForProject(callerId, in.getProjectId(), "manage_sprints");
        prepareSession(in, wsId, callerId);
        sessions.save(in);
        if (memberIds != null) {
            for (String memberId : memberIds) {
                CeremonyAttendee a = new CeremonyAttendee();
                a.setId("CEA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                a.setWorkspaceId(wsId);
                a.setSessionId(in.getId());
                a.setUserId(memberId);
                a.setStatus("EXPECTED");
                attendance.save(a);
            }
        }
        events.recordInWorkspace(wsId, in.getId(), "CEREMONY_SCHEDULED", callerId,
                Map.of("projectId", in.getProjectId(), "ceremonyType", in.getCeremonyType(),
                       "expected", memberIds == null ? 0 : memberIds.size()));
        return getWithAttendance(callerId, in.getId());
    }

    @Transactional
    public Map<String, Object> start(String callerId, String id) {
        CeremonySession s = loadForMember(callerId, id);
        rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        if (!"SCHEDULED".equals(s.getStatus())) {
            throw ApiException.badRequest("CEREMONY_NOT_SCHEDULED",
                "Only a scheduled ceremony can be started.", "status");
        }
        s.setStatus("LIVE");
        s.setStartedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        sessions.save(s);
        events.recordInWorkspace(s.getWorkspaceId(), id, "CEREMONY_STARTED", callerId,
                Map.of("ceremonyType", s.getCeremonyType()));
        return getWithAttendance(callerId, id);
    }

    /** The caller marks themselves present. Open to every workspace member, not just leads. */
    @Transactional
    public Map<String, Object> join(String callerId, String id) {
        CeremonySession s = loadForMember(callerId, id);
        if (!"LIVE".equals(s.getStatus())) {
            throw ApiException.badRequest("CEREMONY_NOT_LIVE",
                "You can only join a ceremony while it is live.", "status");
        }
        CeremonyAttendee a = attendance.findBySessionIdAndUserId(id, callerId)
                .orElseGet(() -> {
                    CeremonyAttendee n = new CeremonyAttendee();
                    n.setId("CEA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    n.setWorkspaceId(s.getWorkspaceId());
                    n.setSessionId(id);
                    n.setUserId(callerId);
                    return n;
                });
        if (!"JOINED".equals(a.getStatus())) {
            a.setStatus("JOINED");
            a.setJoinedAt(OffsetDateTime.now());
            attendance.save(a);
            events.recordInWorkspace(s.getWorkspaceId(), id, "CEREMONY_JOINED", callerId,
                    Map.of("ceremonyType", s.getCeremonyType()));
        }
        return getWithAttendance(callerId, id);
    }

    /** The facilitator marks a member as excused (known absence, not a no-show). */
    @Transactional
    public Map<String, Object> excuse(String callerId, String id, String userId) {
        CeremonySession s = loadForMember(callerId, id);
        rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        CeremonyAttendee a = attendance.findBySessionIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Attendee", userId));
        a.setStatus("EXCUSED");
        attendance.save(a);
        return getWithAttendance(callerId, id);
    }

    @Transactional
    public Map<String, Object> complete(String callerId, String id) {
        CeremonySession s = loadForMember(callerId, id);
        rbac.require(callerId, s.getWorkspaceId(), "manage_sprints");
        List<CeremonyAttendee> rows = attendance.findBySessionIdOrderByJoinedAtAsc(id);
        int absent = markAbsentees(rows);
        attendance.saveAll(rows);
        s.setStatus("COMPLETED");
        s.setEndedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        sessions.save(s);
        Map<String, Long> counts = summarize(rows);
        events.recordInWorkspace(s.getWorkspaceId(), id, "CEREMONY_COMPLETED", callerId,
                Map.of("ceremonyType", s.getCeremonyType(),
                       "joined", counts.get("joined"), "absent", (long) absent,
                       "excused", counts.get("excused")));
        return getWithAttendance(callerId, id);
    }
}
