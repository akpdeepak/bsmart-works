package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Iteration-15 AI + analytics engine for the Scrum Master cockpit (Cap V) and Product Owner
 * workspace (Cap W). Every capability gathers <em>workspace-scoped</em> data (RB-40 §1), and the
 * AI-backed ones route through {@link AiControlPlaneService#invoke} (so scope / budget / cache /
 * audit apply once, centrally) and ship a deterministic fallback — the candidate computed from real
 * data, served verbatim when AI is off, over budget, or unavailable (RB-40 §2). The pure
 * scoring/ranking helpers double as those fallbacks and are unit-testable without a database.
 */
@Service
public class Iteration15AiService {

    private final AiControlPlaneService controlPlane;
    private final JdbcTemplate jdbc;
    private final SprintRepository sprints;
    private final ImpedimentRepository impediments;
    private final CustomerFeedbackRepository feedback;
    private final RbacService rbac;

    public Iteration15AiService(AiControlPlaneService controlPlane, JdbcTemplate jdbc,
                                SprintRepository sprints, ImpedimentRepository impediments,
                                CustomerFeedbackRepository feedback, RbacService rbac) {
        this.controlPlane = controlPlane;
        this.jdbc = jdbc;
        this.impediments = impediments;
        this.sprints = sprints;
        this.feedback = feedback;
        this.rbac = rbac;
    }

    /** Cross-tenant guard: the project must live in the workspace the caller is acting in. */
    private void assertProjectInWorkspace(String workspaceId, String projectId) {
        String owner = rbac.workspaceForProject(projectId);
        if (owner == null || !owner.equals(workspaceId)) {
            throw ApiException.notFound("Project", projectId);
        }
    }

    private Map<String, Object> withNarrative(String capability, String workspaceId, String userId,
                                              boolean inContext, String prompt, String draft,
                                              Map<String, Object> payload) {
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, capability, prompt, draft, null, inContext));
        payload.put("narrative", out.fallback() || out.text() == null ? draft : out.text());
        payload.put("meta", AiAssistService.AiMeta.of(out));
        return payload;
    }

    // ── Cap V · Sprint planning helper (I15-S01) ─────────────────────────────────

    public Map<String, Object> sprintPlanningHelper(String workspaceId, String userId, String projectId,
                                                    Integer timeOffPoints, boolean inContext) {
        assertProjectInWorkspace(workspaceId, projectId);
        int avgVelocity = averageVelocity(projectId);
        int capacity = Math.max(0, avgVelocity - (timeOffPoints == null ? 0 : timeOffPoints));

        // Refined, ready backlog items (have points + description), ranked by priority then points.
        List<Map<String, Object>> ready = jdbc.queryForList(
            "SELECT id, title, type, priority, COALESCE(story_points,0) AS story_points "
            + "FROM work_items WHERE project_id = ? AND sprint_id IS NULL AND deleted_at IS NULL "
            + "AND status <> 'Done' AND story_points IS NOT NULL AND COALESCE(description,'') <> '' "
            + "ORDER BY CASE priority WHEN 'Highest' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 "
            + "WHEN 'Low' THEN 3 ELSE 4 END, story_points DESC", projectId);

        List<Map<String, Object>> commit = suggestCommit(ready, capacity);
        int committedPoints = commit.stream().mapToInt(m -> ((Number) m.get("story_points")).intValue()).sum();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("averageVelocity", avgVelocity);
        payload.put("timeOffPoints", timeOffPoints == null ? 0 : timeOffPoints);
        payload.put("capacity", capacity);
        payload.put("suggestedItems", commit);
        payload.put("suggestedPoints", committedPoints);
        payload.put("readyCount", ready.size());

        String draft = "Velocity " + avgVelocity + " pts; suggested commit " + committedPoints
            + " pts across " + commit.size() + " ready items (capacity " + capacity + ").";
        return withNarrative(AiCapabilities.SPRINT_PLAN, workspaceId, userId, inContext,
            "Suggest a sprint commit for project " + projectId, draft, payload);
    }

    /** Greedy commit: take ready items in order while they fit the capacity budget. Pure. */
    static List<Map<String, Object>> suggestCommit(List<Map<String, Object>> ready, int capacity) {
        List<Map<String, Object>> out = new ArrayList<>();
        int running = 0;
        for (Map<String, Object> item : ready) {
            int pts = ((Number) item.getOrDefault("story_points", 0)).intValue();
            if (running + pts <= capacity) {
                out.add(item);
                running += pts;
            }
        }
        return out;
    }

    private int averageVelocity(String projectId) {
        List<Map<String, Object>> done = jdbc.queryForList(
            "SELECT s.id, COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END),0) AS done_points "
            + "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
            + "WHERE s.project_id = ? AND s.status = 'COMPLETED' GROUP BY s.id ORDER BY s.created_at DESC LIMIT 3",
            projectId);
        if (done.isEmpty()) return 0;
        long sum = done.stream().mapToLong(m -> ((Number) m.get("done_points")).longValue()).sum();
        return (int) Math.round((double) sum / done.size());
    }

    // ── Cap V · Mid-sprint risk panel (I15-S04, deterministic) ───────────────────

    public Map<String, Object> midSprintRiskPanel(String workspaceId, String userId, String sprintId) {
        Sprint sprint = sprints.findById(sprintId).orElseThrow(() -> ApiException.notFound("Sprint", sprintId));
        assertProjectInWorkspace(workspaceId, sprint.getProjectId());

        List<Map<String, Object>> scopeCreep = jdbc.queryForList(
            "SELECT e.occurred_at, e.aggregate_id AS work_item_id, wi.title "
            + "FROM events e LEFT JOIN work_items wi ON wi.id = e.aggregate_id "
            + "WHERE e.field_name = 'sprint_id' AND e.new_value = ? ORDER BY e.occurred_at DESC", sprintId);

        List<Map<String, Object>> staleRaw = jdbc.queryForList(
            "SELECT wi.id, wi.title, COALESCE(MAX(e.occurred_at), wi.created_at) AS last_activity "
            + "FROM work_items wi LEFT JOIN events e ON e.aggregate_id = wi.id "
            + "WHERE wi.sprint_id = ? AND wi.status = 'In Progress' AND wi.deleted_at IS NULL "
            + "GROUP BY wi.id, wi.title, wi.created_at", sprintId);
        List<Map<String, Object>> stale = new ArrayList<>();
        for (Map<String, Object> row : staleRaw) {
            if (isStale(row.get("last_activity"), 3)) stale.add(row); {
        }
            }

        List<Map<String, Object>> unassigned = jdbc.queryForList(
            "SELECT id, title FROM work_items WHERE sprint_id = ? AND assignee_id IS NULL "
            + "AND deleted_at IS NULL AND status <> 'Done'", sprintId);

        List<Map<String, Object>> breachRisk = jdbc.queryForList(
            "SELECT id, title, due_date FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL "
            + "AND status <> 'Done' AND due_date IS NOT NULL AND (? IS NULL OR due_date <= ?) "
            + "ORDER BY due_date ASC",
            sprintId, sprint.getEndDate(), sprint.getEndDate());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sprint", sprint);
        out.put("scopeCreep", scopeCreep);
        out.put("staleItems", stale);
        out.put("unassignedItems", unassigned);
        out.put("breachPredictions", breachRisk);
        out.put("riskScore", scopeCreep.size() + stale.size() * 2 + breachRisk.size() * 3);
        return out;
    }

    /** True when the last-activity instant is older than {@code days} days from now. */
    static boolean isStale(Object lastActivity, int days) {
        if (lastActivity == null) return true;
        OffsetDateTime ts;
        if (lastActivity instanceof OffsetDateTime o) {
            ts = o;
        } else if (lastActivity instanceof java.sql.Timestamp t) {
            ts = t.toInstant().atOffset(OffsetDateTime.now().getOffset());
        } else if (lastActivity instanceof java.time.Instant i) {
            ts = i.atOffset(OffsetDateTime.now().getOffset());
        } else {
            return false;
        }
        return ChronoUnit.DAYS.between(ts, OffsetDateTime.now()) >= days;
    }

    // ── Cap V · Sprint review prep (I15-S06) ─────────────────────────────────────

    public Map<String, Object> sprintReviewPrep(String workspaceId, String userId, String sprintId, boolean inContext) {
        Sprint sprint = sprints.findById(sprintId).orElseThrow(() -> ApiException.notFound("Sprint", sprintId));
        assertProjectInWorkspace(workspaceId, sprint.getProjectId());
        List<Map<String, Object>> items = jdbc.queryForList(
            "SELECT id, title, status, type, COALESCE(story_points,0) AS story_points "
            + "FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL", sprintId);

        List<Map<String, Object>> shipped = new ArrayList<>();
        List<Map<String, Object>> slipped = new ArrayList<>();
        int totalPoints = 0;
        int donePoints = 0;
        for (Map<String, Object> i : items) {
            int pts = ((Number) i.get("story_points")).intValue();
            totalPoints += pts;
            if ("Done".equals(i.get("status"))) {
                shipped.add(i);
                donePoints += pts;
            } else {
                slipped.add(i);
            }
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sprint", sprint);
        payload.put("shipped", shipped);
        payload.put("slipped", slipped);
        payload.put("demoList", shipped);
        payload.put("totalPoints", totalPoints);
        payload.put("donePoints", donePoints);
        payload.put("completionRate", items.isEmpty() ? 0 : Math.round(shipped.size() * 100.0 / items.size()));

        String draft = "Sprint " + sprint.getName() + ": shipped " + shipped.size() + " items ("
            + donePoints + "/" + totalPoints + " pts); " + slipped.size() + " slipped.";
        return withNarrative(AiCapabilities.SPRINT_REVIEW, workspaceId, userId, inContext,
            "Draft a sprint review summary for " + sprintId, draft, payload);
    }

    // ── Cap V · Cross-sprint pattern detection (I15-S07) ─────────────────────────

    public Map<String, Object> crossSprintPatterns(String workspaceId, String userId, String projectId, boolean inContext) {
        assertProjectInWorkspace(workspaceId, projectId);

        // Recurring impediment categories (count > 1).
        Map<String, Integer> impByCategory = new TreeMap<>();
        for (Impediment imp : impediments.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId)) {
            String cat = imp.getCategory() == null || imp.getCategory().isBlank() ? "Uncategorized" : imp.getCategory();
            impByCategory.merge(cat, 1, Integer::sum);
        }
        List<Map<String, Object>> recurringImpediments = new ArrayList<>();
        impByCategory.forEach((cat, count) -> {
            if (count > 1) recurringImpediments.add(Map.of("category", cat, "count", count));
        });

        // Estimation misses: completed sprints whose done points fell short of committed capacity.
        List<Map<String, Object>> sprintStats = jdbc.queryForList(
            "SELECT s.id, s.name, COALESCE(s.capacity,0) AS capacity, "
            + "COALESCE(SUM(CASE WHEN wi.status='Done' THEN wi.story_points ELSE 0 END),0) AS done_points "
            + "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
            + "WHERE s.project_id = ? AND s.status = 'COMPLETED' GROUP BY s.id, s.name, s.capacity "
            + "ORDER BY s.created_at DESC", projectId);
        List<Map<String, Object>> estimationMisses = new ArrayList<>();
        for (Map<String, Object> s : sprintStats) {
            int cap = ((Number) s.get("capacity")).intValue();
            int done = ((Number) s.get("done_points")).intValue();
            if (cap > 0 && done < cap) {
                estimationMisses.add(Map.of("sprintId", s.get("id"), "sprintName", s.get("name"),
                    "committed", cap, "delivered", done, "missedBy", cap - done));
            }
        }

        List<Map<String, Object>> scopeCreepSources = jdbc.queryForList(
            "SELECT u.full_name AS actor, COUNT(*) AS additions FROM events e "
            + "LEFT JOIN users u ON u.id = e.actor_id "
            + "JOIN work_items wi ON wi.id = e.aggregate_id "
            + "WHERE e.field_name = 'sprint_id' AND e.new_value IS NOT NULL AND wi.project_id = ? "
            + "GROUP BY u.full_name HAVING COUNT(*) > 1 ORDER BY additions DESC", projectId);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recurringImpediments", recurringImpediments);
        payload.put("estimationMisses", estimationMisses);
        payload.put("scopeCreepSources", scopeCreepSources);

        String draft = recurringImpediments.size() + " recurring impediment categories, "
            + estimationMisses.size() + " sprints under-delivered vs commitment.";
        return withNarrative(AiCapabilities.SPRINT_PATTERNS, workspaceId, userId, inContext,
            "Detect cross-sprint patterns for project " + projectId, draft, payload);
    }

    // ── Cap W · Backlog refinement helper (I15-S09) ──────────────────────────────

    public Map<String, Object> backlogRefinement(String workspaceId, String userId, String projectId, boolean inContext) {
        assertProjectInWorkspace(workspaceId, projectId);
        List<Map<String, Object>> backlog = jdbc.queryForList(
            "SELECT id, title, type, priority, parent_id, COALESCE(description,'') AS description, "
            + "story_points FROM work_items WHERE project_id = ? AND sprint_id IS NULL "
            + "AND deleted_at IS NULL AND status <> 'Done'", projectId);

        List<Map<String, Object>> ranked = new ArrayList<>();
        List<Map<String, Object>> needsDetail = new ArrayList<>();
        for (Map<String, Object> item : backlog) {
            int score = refinementScore(item);
            Map<String, Object> row = new LinkedHashMap<>(item);
            row.put("score", score);
            boolean detail = item.get("story_points") == null
                || item.get("description") == null || item.get("description").toString().isBlank();
            row.put("needsDetail", detail);
            ranked.add(row);
            if (detail) needsDetail.add(row); {
        }
            }
        ranked.sort(Comparator.comparingInt((Map<String, Object> m) -> (int) m.get("score")).reversed());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ranked", ranked);
        payload.put("needsDetail", needsDetail);
        payload.put("backlogSize", backlog.size());

        String draft = "Ranked " + backlog.size() + " backlog items by value/effort/strategic-fit; "
            + needsDetail.size() + " need more detail before they are ready.";
        return withNarrative(AiCapabilities.BACKLOG_REFINE, workspaceId, userId, inContext,
            "Rank and refine the backlog for project " + projectId, draft, payload);
    }

    /** Weighted refinement score: value (priority) + strategic-fit (has parent) − effort (points). Pure. */
    static int refinementScore(Map<String, Object> item) {
        int value = switch (String.valueOf(item.get("priority"))) {
            case "Highest" -> 40;
            case "High" -> 30;
            case "Medium" -> 20;
            case "Low" -> 10;
            default -> 15;
        };
        int strategicFit = item.get("parent_id") != null ? 20 : 0;
        Object pts = item.get("story_points");
        int effort = pts == null ? 0 : Math.min(20, ((Number) pts).intValue());
        return value + strategicFit - effort;
    }

    // ── Cap W · Customer feedback clustering (I15-S11) ───────────────────────────

    public Map<String, Object> clusterFeedback(String workspaceId, String userId, boolean inContext) {
        List<CustomerFeedback> all = feedback.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId);
        Map<String, List<CustomerFeedback>> byTheme = new TreeMap<>();
        for (CustomerFeedback f : all) {
            String theme = f.getTheme() != null && !f.getTheme().isBlank()
                ? f.getTheme() : themeForFeedback(f.getContent());
            byTheme.computeIfAbsent(theme, k -> new ArrayList<>()).add(f);
        }
        List<Map<String, Object>> clusters = new ArrayList<>();
        byTheme.forEach((theme, list) -> {
            long pos = list.stream().filter(f -> "POSITIVE".equals(f.getSentiment())).count();
            long neg = list.stream().filter(f -> "NEGATIVE".equals(f.getSentiment())).count();
            Map<String, Object> cluster = new LinkedHashMap<>();
            cluster.put("theme", theme);
            cluster.put("count", list.size());
            cluster.put("positive", pos);
            cluster.put("negative", neg);
            cluster.put("neutral", list.size() - pos - neg);
            cluster.put("samples", list.stream().limit(3).map(CustomerFeedback::getContent).toList());
            clusters.add(cluster);
        });
        clusters.sort(Comparator.comparingInt((Map<String, Object> m) -> (int) m.get("count")).reversed());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("clusters", clusters);
        payload.put("totalFeedback", all.size());

        String draft = all.size() + " feedback items clustered into " + clusters.size() + " themes.";
        return withNarrative(AiCapabilities.FEEDBACK_CLUSTER, workspaceId, userId, inContext,
            "Cluster customer feedback into themes", draft, payload);
    }

    /** Keyword theme bucketer — reuses idea-area vocabulary so clustering is deterministic. Pure. */
    static String themeForFeedback(String content) {
        String area = IdeaService.classifyArea(content, null);
        return "General".equals(area) ? "Other" : area;
    }

    // ── Cap W · Release-notes auto-draft (I15-S13) ───────────────────────────────

    public Map<String, Object> draftReleaseNotes(String workspaceId, String userId, String projectId,
                                                 String releaseName, boolean inContext) {
        assertProjectInWorkspace(workspaceId, projectId);
        List<Map<String, Object>> doneItems = jdbc.queryForList(
            "SELECT id, title, type FROM work_items WHERE project_id = ? AND status = 'Done' "
            + "AND deleted_at IS NULL ORDER BY type, title", projectId);

        Map<String, List<String>> byType = new TreeMap<>();
        for (Map<String, Object> i : doneItems) {
            String type = String.valueOf(i.getOrDefault("type", "Other"));
            byType.computeIfAbsent(type, k -> new ArrayList<>()).add(String.valueOf(i.get("title")));
        }
        String markdown = renderReleaseNotes(releaseName, byType);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("releaseName", releaseName);
        payload.put("itemCount", doneItems.size());
        payload.put("groups", byType);
        payload.put("markdown", markdown);
        return withNarrative(AiCapabilities.RELEASE_NOTES, workspaceId, userId, inContext,
            "Draft release notes for " + releaseName, markdown, payload);
    }

    /** Group completed items by type into a plain markdown changelog. Pure (the deterministic fallback). */
    static String renderReleaseNotes(String releaseName, Map<String, List<String>> byType) {
        StringBuilder sb = new StringBuilder("# ").append(releaseName == null ? "Release notes" : releaseName).append("\n\n");
        if (byType.isEmpty()) {
            sb.append("_No completed items yet._\n");
            return sb.toString();
        }
        byType.forEach((type, titles) -> {
            sb.append("## ").append(typeHeading(type)).append("\n");
            for (String t : titles) {
                sb.append("- ").append(t).append("\n");
            }
            sb.append("\n");
        });
        return sb.toString();
    }

    private static String typeHeading(String type) {
        String t = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if (t.contains("bug")) return "Fixes";
        if (t.contains("story") || t.contains("feature")) return "Features";
        if (t.contains("task")) return "Improvements"; {
        return type;
        }
    }

    /** Convenience used by tests/UI for a one-line capacity figure. */
    static int planningCapacity(int avgVelocity, Integer timeOffPoints) {
        return Math.max(0, avgVelocity - (timeOffPoints == null ? 0 : timeOffPoints));
    }
}
