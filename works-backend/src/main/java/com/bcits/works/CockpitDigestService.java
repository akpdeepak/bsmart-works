package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cap V · Executive / manager Health digest — the read-only landing lens of the cockpit.
 * One at-a-glance RAG verdict plus the delivery, impediment-portfolio and ceremony-cadence
 * rollup for a project's active sprint.
 *
 * <p><b>Aggregate-only by construction.</b> The digest returns counts and rates, never
 * per-person rows, so a manager/executive cannot drill into individuals through it — the
 * field-level-security commitment for manager surfaces (RB-40 §1) holds without a special
 * filter. Everything is workspace-scoped to the caller's project (RB-40 §1). The RAG and
 * sprint-progress helpers are pure (RB-10 §7).
 */
@Service
public class CockpitDigestService {

    private final JdbcTemplate jdbc;
    private final SprintRepository sprints;
    private final RbacGate rbac;

    public CockpitDigestService(JdbcTemplate jdbc, SprintRepository sprints, RbacGate rbac) {
        this.jdbc = jdbc;
        this.sprints = sprints;
        this.rbac = rbac;
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    /** Elapsed share of the sprint window as a 0–100 percent; 0 when dates are unknown. Pure. */
    static int sprintProgressPct(LocalDate start, LocalDate end, LocalDate today) {
        if (start == null || end == null || !end.isAfter(start)) return 0;
        long total = end.toEpochDay() - start.toEpochDay();
        long elapsed = today.toEpochDay() - start.toEpochDay();
        if (elapsed <= 0) return 0;
        if (elapsed >= total) return 100;
        return (int) Math.round(elapsed * 100.0 / total);
    }

    /** The RAG verdict + its reasons. RED beats AMBER beats GREEN; reasons explain the colour. Pure. */
    static Map<String, Object> rag(int slaBreached, int criticalOpen, Integer attendanceRate,
                                   int deliveryRate, int progressPct) {
        List<String> red = new ArrayList<>();
        List<String> amber = new ArrayList<>();
        if (slaBreached > 0) red.add(slaBreached + " SLA-breached impediment(s)");
        if (progressPct >= 50 && deliveryRate < 50) {
            red.add("delivery at " + deliveryRate + "% past the sprint midpoint");
        }
        if (criticalOpen > 0) amber.add(criticalOpen + " open critical impediment(s)");
        if (attendanceRate != null && attendanceRate < 70) {
            amber.add("ceremony attendance at " + attendanceRate + "%");
        }
        if (progressPct >= 50 && deliveryRate < progressPct - 20) {
            amber.add("delivery behind the burn pace");
        }
        String status = !red.isEmpty() ? "RED" : !amber.isEmpty() ? "AMBER" : "GREEN";
        List<String> reasons = !red.isEmpty() ? red : !amber.isEmpty() ? amber
                : List.of("On track — delivery, impediments and attendance are all healthy.");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", status);
        out.put("reasons", reasons);
        return out;
    }

    // ── The digest ────────────────────────────────────────────────────────────
    public Map<String, Object> digest(String workspaceId, String userId, String projectId) {
        String owner = rbac.workspaceForProject(projectId);
        if (owner == null || !owner.equals(workspaceId)) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(userId, workspaceId, "view_items");
        LocalDate today = LocalDate.now();

        List<Sprint> active = sprints.findByProjectIdAndStatus(projectId, "ACTIVE");
        Sprint sprint = active.isEmpty() ? null : active.get(0);

        int committed = 0;
        int delivered = 0;
        int progressPct = 0;
        Integer dayOf = null;
        Integer dayTotal = null;
        List<Map<String, Object>> burndown = List.of();
        if (sprint != null) {
            Map<String, Object> pts = jdbc.queryForMap(
                "SELECT COALESCE(SUM(story_points),0) AS committed, "
                + "COALESCE(SUM(CASE WHEN status = 'Done' THEN story_points ELSE 0 END),0) AS delivered "
                + "FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL", sprint.getId());
            committed = ((Number) pts.get("committed")).intValue();
            delivered = ((Number) pts.get("delivered")).intValue();
            progressPct = sprintProgressPct(sprint.getStartDate(), sprint.getEndDate(), today);
            if (sprint.getStartDate() != null && sprint.getEndDate() != null) {
                dayTotal = (int) (sprint.getEndDate().toEpochDay() - sprint.getStartDate().toEpochDay()) + 1;
                dayOf = (int) Math.min(Math.max(today.toEpochDay() - sprint.getStartDate().toEpochDay() + 1, 1), dayTotal);
            }
            // Compact burndown for the context-bar sparkline — Done points burn on the day they
            // entered Done (status_changed_at, V74), same basis as the Variance tab.
            java.util.Map<LocalDate, Integer> doneByDay = new java.util.TreeMap<>();
            for (Map<String, Object> row : jdbc.queryForList(
                    "SELECT status_changed_at, COALESCE(story_points,0) AS pts FROM work_items "
                    + "WHERE sprint_id = ? AND deleted_at IS NULL AND status = 'Done' "
                    + "AND status_changed_at IS NOT NULL", sprint.getId())) {
                LocalDate day = jdbcDay(row.get("status_changed_at"));
                doneByDay.merge(day, ((Number) row.get("pts")).intValue(), Integer::sum);
            }
            LocalDate upTo = sprint.getEndDate() == null || today.isBefore(sprint.getEndDate())
                    ? today : sprint.getEndDate();
            burndown = SprintVarianceService.burndown(sprint.getStartDate(), upTo, committed, doneByDay);
        }
        int deliveryRate = SprintVarianceService.rate(delivered, committed);

        // Impediment portfolio (counts only — no individuals).
        Map<String, Object> imp = jdbc.queryForMap(
            "SELECT COUNT(*) FILTER (WHERE status <> 'RESOLVED') AS open, "
            + "COUNT(*) FILTER (WHERE status <> 'RESOLVED' AND severity = 'CRITICAL') AS critical_open, "
            + "COUNT(*) FILTER (WHERE status <> 'RESOLVED' AND severity = 'CRITICAL' "
            + "AND raised_at < CURRENT_DATE - 1) AS sla_breached "
            + "FROM impediments WHERE project_id = ? AND deleted_at IS NULL", projectId);
        int openImp = ((Number) imp.get("open")).intValue();
        int criticalOpen = ((Number) imp.get("critical_open")).intValue();
        int slaBreached = ((Number) imp.get("sla_breached")).intValue();

        // Ceremony cadence (counts + rate only).
        Map<String, Object> cer = jdbc.queryForMap(
            "SELECT COUNT(DISTINCT cs.id) AS sessions, "
            + "COUNT(*) FILTER (WHERE ca.status = 'JOINED') AS joined, "
            + "COUNT(*) FILTER (WHERE ca.status IN ('JOINED','ABSENT','EXPECTED')) AS eligible "
            + "FROM ceremony_sessions cs LEFT JOIN ceremony_attendees ca ON ca.session_id = cs.id "
            + "WHERE cs.project_id = ? AND cs.status = 'COMPLETED'", projectId);
        long eligible = ((Number) cer.get("eligible")).longValue();
        Integer attendanceRate = eligible == 0 ? null
                : SprintVarianceService.rate(((Number) cer.get("joined")).longValue(), eligible);

        // Velocity trend — last 3 completed sprints' delivered points.
        List<Integer> velocityTrend = jdbc.query(
            "SELECT COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END),0) AS done_points "
            + "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
            + "WHERE s.project_id = ? AND s.status = 'COMPLETED' "
            + "GROUP BY s.id, s.created_at ORDER BY s.created_at DESC LIMIT 3",
            (rs, n) -> rs.getInt("done_points"), projectId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sprint", sprint);
        out.put("sprintDayOf", dayOf);
        out.put("sprintDayTotal", dayTotal);
        out.put("committedPoints", committed);
        out.put("deliveredPoints", delivered);
        out.put("deliveryRate", deliveryRate);
        out.put("openImpediments", openImp);
        out.put("criticalOpenImpediments", criticalOpen);
        out.put("slaBreachedImpediments", slaBreached);
        out.put("ceremoniesHeld", ((Number) cer.get("sessions")).intValue());
        out.put("attendanceRate", attendanceRate);
        out.put("velocityTrend", velocityTrend);
        out.put("burndown", burndown);
        out.put("rag", rag(slaBreached, criticalOpen, attendanceRate, deliveryRate, progressPct));
        return out;
    }

    static LocalDate jdbcDay(Object value) {
        if (value instanceof java.sql.Timestamp ts) return ts.toLocalDateTime().toLocalDate();
        if (value instanceof OffsetDateTime odt) return odt.toLocalDate();
        if (value instanceof LocalDateTime ldt) return ldt.toLocalDate();
        if (value instanceof LocalDate day) return day;
        throw new IllegalArgumentException("Unsupported timestamp value: "
                + (value == null ? "null" : value.getClass().getName()));
    }
}
