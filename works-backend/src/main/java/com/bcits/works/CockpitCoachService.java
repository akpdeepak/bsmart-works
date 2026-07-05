package com.bcits.works;

import com.bcits.works.workspaces.TeamRoleService;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Cap V · The cockpit's AI coach. Two capabilities, both routed through the
 * {@link AiControlPlaneService} (one budget, one cache, one audit — RB-40 §2), each with a
 * deterministic fallback served verbatim when AI is off, over budget, or unavailable:
 *
 * <ul>
 *   <li><b>Pro-tips</b> ({@code cockpit_protips}): rule-based coaching computed from live cockpit
 *       signals — stale items, unassigned sprint work, SLA-breached raises, ceremony attendance,
 *       recurring raise categories, open retro actions — targeted at the caller's team role.</li>
 *   <li><b>Retro clustering</b> ({@code retro_cluster}): keyword bucketing of retro notes into
 *       fixed themes with note/vote counts, optionally narrated by AI.</li>
 * </ul>
 *
 * <p>The {@link #tipsFor} and {@link #themeFor} helpers are pure and DB-free (RB-10 §7).
 */
@Service
public class CockpitCoachService {

    private final AiControlPlaneService controlPlane;
    private final JdbcTemplate jdbc;
    private final RetroSessionRepository retroSessions;
    private final RetroNoteRepository retroNotes;
    private final TeamRoleService teamRoles;
    private final RbacGate rbac;

    public CockpitCoachService(AiControlPlaneService controlPlane, JdbcTemplate jdbc,
                               RetroSessionRepository retroSessions, RetroNoteRepository retroNotes,
                               TeamRoleService teamRoles, RbacGate rbac) {
        this.controlPlane = controlPlane;
        this.jdbc = jdbc;
        this.retroSessions = retroSessions;
        this.retroNotes = retroNotes;
        this.teamRoles = teamRoles;
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

    // ── Pro-tips ────────────────────────────────────────────────────────────────

    /** The live signals the rule engine coaches from. */
    record Signals(int staleItems, int unassigned, int slaBreached, String topCategory,
                   int topCategoryCount, Integer attendanceRate, int actionsOpen, int actionsTotal) { }

    /** A one-click jump a tip can offer: a label and the cockpit tab to switch to. */
    record Action(String label, String tab) { }

    /**
     * One tip: who it is for, how urgent it reads, the advice, and an optional jump that lets the
     * reader act on it in one click (the frontend only renders it if the tab is in the caller's
     * role set). The 3-arg form is for tips with no action.
     */
    record Tip(String audience, String tone, String text, Action action) {
        Tip(String audience, String tone, String text) { this(audience, tone, text, null); }
    }

    /**
     * The rule engine — deterministic coaching per role. {@code audience} matches the caller's
     * role_key or "all". Pure, so the tip matrix is unit-testable (RB-10 §7).
     */
    static List<Tip> tipsFor(String roleKey, Signals s) {
        List<Tip> all = new ArrayList<>();
        if (s.slaBreached() > 0) {
            all.add(new Tip("all", "danger", s.slaBreached()
                + " critical raise(s) past the 1-day SLA — escalate or re-assign an owner today.",
                new Action("View impediments", "impediments")));
        }
        if (s.staleItems() > 0) {
            all.add(new Tip("developer", "warning", s.staleItems()
                + " of the project's in-progress items have had no status change for 3+ days — "
                + "post an update or raise a blocker so they don't stall silently.",
                new Action("Review my items", "myday")));
            all.add(new Tip("scrum-master", "warning", s.staleItems()
                + " in-progress items are 3+ days without movement — ask for blockers at standup.",
                new Action("Open risk panel", "risk")));
        }
        if (s.unassigned() > 0) {
            all.add(new Tip("scrum-master", "warning", s.unassigned()
                + " active-sprint items have no assignee — assign them before they slip.",
                new Action("Open risk panel", "risk")));
        }
        if (s.attendanceRate() != null && s.attendanceRate() < 70) {
            all.add(new Tip("scrum-master", "info", "Ceremony attendance is " + s.attendanceRate()
                + "% — try a different slot, a tighter time-box, or a smaller required list.",
                new Action("View ceremonies", "ceremonies")));
        }
        if (s.topCategoryCount() > 1 && s.topCategory() != null) {
            all.add(new Tip("scrum-master", "info", "'" + s.topCategory() + "' raises keep recurring ("
                + s.topCategoryCount() + "×) — worth a systemic fix, not another workaround.",
                new Action("See patterns", "patterns")));
            all.add(new Tip("product-owner", "info", "'" + s.topCategory() + "' keeps blocking delivery ("
                + s.topCategoryCount() + "×) — consider prioritising a permanent fix in the backlog.",
                new Action("See patterns", "patterns")));
        }
        if (s.actionsTotal() > 0 && s.actionsOpen() * 2 > s.actionsTotal()) {
            all.add(new Tip("scrum-master", "info", s.actionsOpen() + " of " + s.actionsTotal()
                + " retro actions are still open — start the next retro by reviewing them.",
                new Action("Open retro", "retro")));
        }
        if (all.isEmpty()) {
            all.add(new Tip("all", "info",
                "No flags right now — items are moving, raises are owned, and ceremonies are attended."));
        }
        return all.stream()
                .filter(t -> "all".equals(t.audience()) || t.audience().equals(roleKey)
                        || "admin".equals(roleKey) || "executive".equals(roleKey))
                .toList();
    }

    public Map<String, Object> proTips(String workspaceId, String userId, String projectId,
                                       boolean inContext) {
        assertProjectInWorkspace(workspaceId, projectId);
        rbac.require(userId, workspaceId, "view_items");
        String roleKey = teamRoles.roleFor(userId, projectId, workspaceId);

        Integer stale = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items WHERE project_id = ? AND deleted_at IS NULL "
            + "AND status = 'In Progress' AND status_changed_at < now() - INTERVAL '3 days'",
            Integer.class, projectId);
        Integer unassigned = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN sprints s ON s.id = wi.sprint_id "
            + "WHERE wi.project_id = ? AND wi.deleted_at IS NULL AND s.status = 'ACTIVE' "
            + "AND wi.assignee_id IS NULL AND wi.status <> 'Done'",
            Integer.class, projectId);
        Integer slaBreached = jdbc.queryForObject(
            "SELECT COUNT(*) FROM impediments WHERE project_id = ? AND deleted_at IS NULL "
            + "AND severity = 'CRITICAL' AND status <> 'RESOLVED' AND raised_at < CURRENT_DATE - 1",
            Integer.class, projectId);
        List<Map<String, Object>> topCat = jdbc.queryForList(
            "SELECT category, COUNT(*) AS n FROM impediments WHERE project_id = ? "
            + "AND deleted_at IS NULL AND category IS NOT NULL "
            + "GROUP BY category ORDER BY n DESC LIMIT 1", projectId);
        Map<String, Object> att = jdbc.queryForMap(
            "SELECT COUNT(*) FILTER (WHERE ca.status = 'JOINED') AS joined, "
            + "COUNT(*) FILTER (WHERE ca.status IN ('JOINED','ABSENT','EXPECTED')) AS eligible, "
            + "COUNT(DISTINCT cs.id) AS sessions "
            + "FROM ceremony_sessions cs LEFT JOIN ceremony_attendees ca ON ca.session_id = cs.id "
            + "WHERE cs.project_id = ? AND cs.status = 'COMPLETED'", projectId);
        Map<String, Object> actions = jdbc.queryForMap(
            "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status <> 'DONE' AND status <> 'CANCELLED') "
            + "AS open FROM action_item WHERE project_id = ? AND deleted_at IS NULL", projectId);

        long sessions = ((Number) att.get("sessions")).longValue();
        long eligible = ((Number) att.get("eligible")).longValue();
        Integer attendanceRate = sessions == 0 || eligible == 0 ? null
                : SprintVarianceService.rate(((Number) att.get("joined")).longValue(), eligible);
        Signals signals = new Signals(
                stale == null ? 0 : stale,
                unassigned == null ? 0 : unassigned,
                slaBreached == null ? 0 : slaBreached,
                topCat.isEmpty() ? null : (String) topCat.get(0).get("category"),
                topCat.isEmpty() ? 0 : ((Number) topCat.get(0).get("n")).intValue(),
                attendanceRate,
                ((Number) actions.get("open")).intValue(),
                ((Number) actions.get("total")).intValue());

        List<Tip> tips = tipsFor(roleKey, signals);
        String draft = String.join("\n", tips.stream().map(Tip::text).toList());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("roleKey", roleKey);
        payload.put("tips", tips);
        payload.put("signals", signals);
        return withNarrative(AiCapabilities.COCKPIT_PROTIPS, workspaceId, userId, inContext,
            "Rewrite these sprint-coaching tips for a " + roleKey
            + " as one short, encouraging paragraph. Keep every number:\n" + draft,
            draft, payload);
    }

    // ── Retro clustering ────────────────────────────────────────────────────────

    /** Keyword bucketing into fixed themes — the deterministic clusterer. Pure. */
    static String themeFor(String content) {
        String text = content == null ? "" : content.toLowerCase(Locale.ROOT);
        if (containsAny(text, "process", "approval", "sign-off", "handover", "workflow", "estimate",
                "planning", "scope")) {
            return "Process & planning";
        }
        if (containsAny(text, "communicat", "meeting", "standup", "sync", "update", "inform",
                "documentation", "docs")) {
            return "Communication";
        }
        if (containsAny(text, "test", "bug", "quality", "review", "regression", "incident")) {
            return "Quality";
        }
        if (containsAny(text, "tool", "ci", "pipeline", "build", "deploy", "environment", "infra",
                "staging")) {
            return "Tooling & environment";
        }
        if (containsAny(text, "team", "pair", "help", "collaborat", "morale", "workload",
                "capacity")) {
            return "People & teamwork";
        }
        return "Other";
    }

    private static boolean containsAny(String text, String... keys) {
        for (String k : keys) {
            if (text.contains(k)) {
                return true;
            }
        }
        return false;
    }

    public Map<String, Object> clusterRetro(String workspaceId, String userId, String retroId,
                                            boolean inContext) {
        RetroSession session = retroSessions.findById(retroId)
                .orElseThrow(() -> ApiException.notFound("Retro", retroId));
        assertProjectInWorkspace(workspaceId, session.getProjectId());
        rbac.require(userId, workspaceId, "view_items");

        Map<String, List<RetroNote>> byTheme = new LinkedHashMap<>();
        for (RetroNote note : retroNotes.findBySessionIdOrderByCreatedAtAsc(retroId)) {
            byTheme.computeIfAbsent(themeFor(note.getContent()), k -> new ArrayList<>()).add(note);
        }
        List<Map<String, Object>> themes = new ArrayList<>();
        StringBuilder draft = new StringBuilder();
        for (Map.Entry<String, List<RetroNote>> e : byTheme.entrySet()) {
            int votes = e.getValue().stream().mapToInt(RetroNote::getVotes).sum();
            RetroNote top = e.getValue().stream()
                    .max(java.util.Comparator.comparingInt(RetroNote::getVotes)).orElse(null);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("theme", e.getKey());
            row.put("noteCount", e.getValue().size());
            row.put("votes", votes);
            row.put("topNote", top == null ? null : top.getContent());
            themes.add(row);
            draft.append(e.getKey()).append(" — ").append(e.getValue().size()).append(" notes, ")
                 .append(votes).append(" votes. Top: ")
                 .append(top == null ? "—" : top.getContent()).append('\n');
        }
        themes.sort((a, b) -> Integer.compare((int) b.get("votes"), (int) a.get("votes")));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("retroId", retroId);
        payload.put("themes", themes);
        return withNarrative(AiCapabilities.RETRO_CLUSTER, workspaceId, userId, inContext,
            "Summarise these retro themes into 2-3 sentences a scrum master could read out, "
            + "leading with the highest-voted theme:\n" + draft,
            draft.toString(), payload);
    }
}
