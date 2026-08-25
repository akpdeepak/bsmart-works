package com.bcits.works.projects;
import com.bcits.works.projects.api.ProjectTeamMember;
import com.bcits.works.projects.api.ProjectTeamMemberRepository;
import com.bcits.works.projects.api.Sprint;
import com.bcits.works.projects.api.SprintRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap V · Sprint Cockpit Capacity tab. Plans capacity <em>across every team member</em>: each
 * member's availability is modelled in working-days (sprint working days − time off, scaled by a
 * focus factor) and converted to a story-points budget via the team's rolling velocity, then shown
 * against their actual allocation (story points on work items assigned to them this sprint).
 *
 * <p>Only the editable config is stored ({@link SprintMemberCapacity}); the points budget is
 * computed here at read time so it always reflects current velocity/headcount. Every read is
 * workspace-scoped via the sprint → project → workspace guard (RB-40 §1); the upsert additionally
 * requires {@code manage_sprints} (RB-10 §2) and is audited (RB-20 §5). The pure derivation helpers
 * are static and unit-testable without a database.
 */
@Service
public class SprintCapacityService {

    /** Default focus factor (%) for a member with no saved capacity row. */
    static final int DEFAULT_FOCUS_PCT = 80;
    /** Utilization sentinel used when a member carries work but has zero computed capacity. */
    static final int OVER_NO_CAPACITY = 999;
    /** Below this utilization a member is flagged "under". */
    static final int UNDER_THRESHOLD_PCT = 70;

    private final SprintRepository sprints;
    private final SprintDao sprintDao;
    private final SprintMemberCapacityRepository capacities;
    private final ProjectTeamMemberRepository teamMembers;
    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final EventService events;

    public SprintCapacityService(SprintRepository sprints, SprintDao sprintDao,
                                 SprintMemberCapacityRepository capacities,
                                 ProjectTeamMemberRepository teamMembers, JdbcTemplate jdbc,
                                 RbacGate rbac, EventService events) {
        this.sprints = sprints;
        this.sprintDao = sprintDao;
        this.capacities = capacities;
        this.teamMembers = teamMembers;
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.events = events;
    }

    /** Cross-tenant guard: the sprint's project must live in the workspace the caller is acting in. */
    private Sprint loadSprintInWorkspace(String workspaceId, String sprintId) {
        Sprint sprint = sprints.findById(sprintId).orElseThrow(() -> ApiException.notFound("Sprint", sprintId));
        String owner = rbac.workspaceForProject(sprint.getProjectId());
        if (owner == null || !owner.equals(workspaceId)) {
            throw ApiException.notFound("Sprint", sprintId);
        }
        return sprint;
    }

    // ── Pure helpers (unit-testable, no DB) ──────────────────────────────────────

    /** Count of weekdays (Mon–Fri) between two dates, inclusive. 0 if either is null or end &lt; start. */
    static int workingDaysBetween(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) return 0;
        int days = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            switch (d.getDayOfWeek()) {
                case SATURDAY, SUNDAY -> { }
                default -> days++;
            }
        }
        return days;
    }

    /** Available working days = (override ?? sprint working days) − time off, floored at 0. */
    static int effectiveWorkingDays(Integer override, int sprintWorkingDays, int timeOffDays) {
        int base = override != null ? override : sprintWorkingDays;
        return Math.max(0, base - Math.max(0, timeOffDays));
    }

    /** Project-wide points-per-day rate. 0 when there are no working days or no members. */
    static double teamPointsPerDay(int avgVelocity, int sprintWorkingDays, int memberCount) {
        int denom = sprintWorkingDays * memberCount;
        return denom <= 0 ? 0.0 : avgVelocity / (double) denom;
    }

    /** A member's points budget = effective days × points-per-day × focus factor, rounded, floored at 0. */
    static int capacityPoints(int effectiveDays, double pointsPerDay, int focusFactorPct) {
        return Math.max(0, (int) Math.round(effectiveDays * pointsPerDay * focusFactorPct / 100.0));
    }

    /** Utilization %: allocated/capacity. {@link #OVER_NO_CAPACITY} when allocated work has no capacity. */
    static int utilizationPct(int allocated, int capacity) {
        if (capacity > 0) return (int) Math.round(allocated * 100.0 / capacity);
        return allocated > 0 ? OVER_NO_CAPACITY : 0;
    }

    /** Status flag: "over" (allocated &gt; capacity), "under" (utilization below threshold), else "ok". */
    static String capacityStatus(int allocated, int capacity) {
        if (allocated > capacity) return "over";
        return utilizationPct(allocated, capacity) < UNDER_THRESHOLD_PCT ? "under" : "ok";
    }

    /** Clamp a focus factor to 0..100; null → the default. */
    static int clampFocus(Integer pct) {
        if (pct == null) return DEFAULT_FOCUS_PCT;
        return Math.max(0, Math.min(100, pct));
    }

    /** Even velocity-per-head split, used as the fallback budget when the sprint has no dates. */
    static int flatSplit(int avgVelocity, int memberCount) {
        return (int) Math.round(avgVelocity / (double) Math.max(1, memberCount));
    }

    // ── Read: the capacity board ─────────────────────────────────────────────────

    public Map<String, Object> capacityBoard(String workspaceId, String userId, String sprintId) {
        Sprint sprint = loadSprintInWorkspace(workspaceId, sprintId);
        String projectId = sprint.getProjectId();

        boolean datesMissing = sprint.getStartDate() == null || sprint.getEndDate() == null;
        int sprintWorkingDays = workingDaysBetween(sprint.getStartDate(), sprint.getEndDate());

        List<ProjectTeamMember> members = teamMembers.findByProjectIdOrderByCreatedAtAsc(projectId);
        int memberCount = members.size();
        int avgVelocity = sprintDao.averageVelocity(projectId);
        double pointsPerDay = teamPointsPerDay(avgVelocity, sprintWorkingDays, memberCount);
        int flatSplit = flatSplit(avgVelocity, memberCount);

        Map<String, Integer> allocByUser = new HashMap<>();
        int[] unassigned = {0};
        jdbc.query(
            "SELECT assignee_id, COALESCE(SUM(story_points),0) AS pts FROM work_items "
                + "WHERE sprint_id = ? AND deleted_at IS NULL GROUP BY assignee_id",
            rs -> {
                String aid = rs.getString("assignee_id");
                int pts = rs.getInt("pts");
                if (aid == null) {
                    unassigned[0] += pts;
                } else {
                    allocByUser.put(aid, pts);
                }
            }, sprintId);

        Map<String, String> names = memberNames(members);
        Map<String, SprintMemberCapacity> rowByUser = new HashMap<>();
        for (SprintMemberCapacity row : capacities.findBySprintId(sprintId)) {
            rowByUser.put(row.getUserId(), row);
        }

        List<Map<String, Object>> memberRows = new ArrayList<>();
        int teamCapacity = 0;
        int teamAllocated = 0;
        long utilSum = 0;
        int utilCount = 0;
        for (ProjectTeamMember m : members) {
            SprintMemberCapacity row = rowByUser.get(m.getUserId());
            boolean hasRow = row != null;
            Integer override = row != null ? row.getWorkingDays() : null;
            int timeOff = row != null && row.getTimeOffDays() != null ? row.getTimeOffDays() : 0;
            int focus = clampFocus(row != null ? row.getFocusFactorPct() : null);

            int effectiveDays;
            int cap;
            if (datesMissing) {
                effectiveDays = 0;
                cap = flatSplit; // no dates yet → even velocity split keeps the board useful
            } else {
                effectiveDays = effectiveWorkingDays(override, sprintWorkingDays, timeOff);
                cap = capacityPoints(effectiveDays, pointsPerDay, focus);
            }
            int alloc = allocByUser.getOrDefault(m.getUserId(), 0);
            int util = utilizationPct(alloc, cap);

            teamCapacity += cap;
            teamAllocated += alloc;
            if (cap > 0) {
                utilSum += util;
                utilCount++;
            }

            Map<String, Object> mr = new LinkedHashMap<>();
            mr.put("userId", m.getUserId());
            mr.put("name", names.getOrDefault(m.getUserId(), m.getUserId()));
            mr.put("roleKey", m.getRoleKey());
            mr.put("workingDays", override);          // null → UI shows sprintWorkingDays as placeholder
            mr.put("timeOffDays", timeOff);
            mr.put("focusFactor", focus);
            mr.put("effectiveWorkingDays", effectiveDays);
            mr.put("capacityPoints", cap);
            mr.put("allocatedPoints", alloc);
            mr.put("remainingPoints", cap - alloc);
            mr.put("utilizationPct", util);
            mr.put("status", capacityStatus(alloc, cap));
            mr.put("hasRow", hasRow);
            memberRows.add(mr);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sprint", sprint);
        out.put("members", memberRows);
        out.put("memberCount", memberCount);
        out.put("sprintWorkingDays", sprintWorkingDays);
        out.put("datesMissing", datesMissing);
        out.put("averageVelocity", avgVelocity);
        out.put("suggestedDefaultPointsPerMember", flatSplit);
        out.put("teamCapacityPoints", teamCapacity);
        out.put("teamAllocatedPoints", teamAllocated);
        out.put("teamRemainingPoints", teamCapacity - teamAllocated);
        out.put("avgUtilizationPct", utilCount == 0 ? 0 : (int) Math.round((double) utilSum / utilCount));
        out.put("unassignedPoints", unassigned[0]);
        return out;
    }

    /** Batched display-name lookup for the member set (no N+1). */
    private Map<String, String> memberNames(List<ProjectTeamMember> members) {
        Map<String, String> names = new HashMap<>();
        if (members.isEmpty()) return names;
        List<String> ids = members.stream().map(ProjectTeamMember::getUserId).toList();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        jdbc.query("SELECT id, full_name FROM users WHERE id IN (" + placeholders + ")",
            rs -> { names.put(rs.getString("id"), rs.getString("full_name")); }, ids.toArray());
        return names;
    }

    // ── Write: upsert a member's capacity config ─────────────────────────────────

    @Transactional
    public Map<String, Object> upsertMemberCapacity(String workspaceId, String callerId, String sprintId,
                                                    String targetUserId, Integer workingDays,
                                                    Integer timeOffDays, Integer focusFactor) {
        Sprint sprint = loadSprintInWorkspace(workspaceId, sprintId);
        rbac.require(callerId, workspaceId, "manage_sprints");

        if (targetUserId == null || targetUserId.isBlank()) {
            throw ApiException.badRequest("USER_REQUIRED", "userId is required.", "userId");
        }
        if (teamMembers.findByProjectIdAndUserId(sprint.getProjectId(), targetUserId).isEmpty()) {
            throw ApiException.badRequest("NOT_A_TEAM_MEMBER",
                "User is not a team member of this project.", "userId");
        }
        if (workingDays != null && workingDays < 0) {
            throw ApiException.badRequest("INVALID_WORKING_DAYS", "Working days cannot be negative.", "workingDays");
        }
        if (timeOffDays != null && timeOffDays < 0) {
            throw ApiException.badRequest("INVALID_TIME_OFF", "Time off cannot be negative.", "timeOffDays");
        }
        int focus = clampFocus(focusFactor);
        int timeOff = timeOffDays == null ? 0 : timeOffDays;

        SprintMemberCapacity row = capacities.findBySprintIdAndUserId(sprintId, targetUserId)
            .orElseGet(() -> {
                SprintMemberCapacity n = new SprintMemberCapacity();
                n.setId("SMC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                n.setWorkspaceId(workspaceId);
                n.setSprintId(sprintId);
                n.setUserId(targetUserId);
                n.setCreatedBy(callerId);
                n.setCreatedAt(OffsetDateTime.now());
                return n;
            });
        row.setWorkingDays(workingDays);
        row.setTimeOffDays(timeOff);
        row.setFocusFactorPct(focus);
        row.setUpdatedAt(OffsetDateTime.now());
        SprintMemberCapacity saved = capacities.save(row);

        events.recordInWorkspace(workspaceId, saved.getId(), "SPRINT_MEMBER_CAPACITY_SET", callerId,
            Map.of("sprintId", sprintId, "userId", targetUserId,
                "workingDays", workingDays == null ? "" : workingDays,
                "timeOffDays", timeOff, "focusFactorPct", focus));

        return capacityBoard(workspaceId, callerId, sprintId);
    }
}
