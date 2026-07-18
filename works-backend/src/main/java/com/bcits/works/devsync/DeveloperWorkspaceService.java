package com.bcits.works.devsync;

import com.bcits.works.AiCapabilities;
import com.bcits.works.automation.CalendarSyncService;
import com.bcits.works.FocusModeService;
import com.bcits.works.ai.AiControlPlaneService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The Developer Workspace engine (Cap U, iteration 14). It assembles the engineer's home surface
 * (today's work, PRs to review, blockers, focus, recent activity), the <b>private</b> personal
 * velocity, the standup-helper draft, the ranked code-review queue, code explanation, and the
 * "propose an item update from a commit message" suggestion.
 *
 * <p>Every read is workspace-scoped (RB-40 §1). Personal velocity is private by construction
 * (RB-20 §4 psychological safety): the only subject is {@code authenticatedUser.id()} — no endpoint
 * accepts a target userId, so a manager can never pull a report's numbers. Every AI surface routes
 * through {@link AiControlPlaneService} and ships a deterministic fallback (RB-40 §2). The ranking /
 * parsing / velocity helpers are pure + static so they unit-test without a database (RB-10 §7) and
 * double as the fallbacks.
 */
@Service
public class DeveloperWorkspaceService {

    private final DeveloperWorkspaceDao dao;
    private final PullRequestRepository pullRequests;
    private final PullRequestReviewerRepository reviewers;
    private final CodeLinkRepository codeLinks;
    private final FocusModeService focusMode;
    private final CodeContextService codeContext;
    private final CalendarSyncService calendarSync;
    private final RbacGate rbac;
    private final AiControlPlaneService controlPlane;

    public DeveloperWorkspaceService(DeveloperWorkspaceDao dao, PullRequestRepository pullRequests,
                                     PullRequestReviewerRepository reviewers, CodeLinkRepository codeLinks,
                                     FocusModeService focusMode, CodeContextService codeContext,
                                     CalendarSyncService calendarSync,
                                     RbacGate rbac, AiControlPlaneService controlPlane) {
        this.dao = dao;
        this.pullRequests = pullRequests;
        this.reviewers = reviewers;
        this.codeLinks = codeLinks;
        this.focusMode = focusMode;
        this.codeContext = codeContext;
        this.calendarSync = calendarSync;
        this.rbac = rbac;
        this.controlPlane = controlPlane;
    }

    // ── Pure helpers (unit-tested; double as AI fallbacks) ────────────────────────

    /** Urgency score for the review queue: older + bigger + higher-priority linked item ranks first;
     *  an expertise match (the reviewer has touched the same files/project) nudges it up. */
    public static int prUrgencyScore(long ageHours, int size, String linkedPriority, boolean expertiseMatch) {
        int score = (int) Math.min(ageHours, 240);              // age dominates, capped at 10 days
        score += Math.min(size, 1000) / 25;                     // bigger diffs need attention sooner
        if (linkedPriority != null) {
            String p = linkedPriority.toUpperCase(Locale.ROOT);
            if (p.equals("P0")) { score += 200; }
            else if (p.equals("CRITICAL")) { score += 120; }
            else if (p.equals("HIGH")) { score += 60; }
        }
        if (expertiseMatch) { score += 40; }
        return score;
    }

    /** Completion rate as a 0–100 percent, guarding divide-by-zero. */
    public static int completionRate(int done, int total) {
        if (total <= 0) return 0;
        return (int) Math.round((done * 100.0) / total);
    }

    /** Deterministic "propose an item update from a commit message": item ref + intent → status. */
    public static Map<String, String> suggestFromCommit(String message) {
        Map<String, String> out = new LinkedHashMap<>();
        String ref = CodeContextService.extractWorkItemRef(message);
        out.put("workItemId", ref);
        String m = message == null ? "" : message.toLowerCase(Locale.ROOT);
        String status = null;
        if (m.matches(".*\\b(fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved|done|complete|completed)\\b.*")) {
            status = "Done";
        } else if (m.matches(".*\\b(wip|start|starts|started|begin|begins|working on|in progress)\\b.*")) {
            status = "In Progress";
        }
        out.put("suggestedStatus", status);
        return out;
    }

    private static Map<String, Object> aiMeta(AiControlPlaneService.AiOutcome out) {
        return Map.of("usedAi", out.usedAi(), "fallback", out.fallback(),
            "tier", out.tier() == null ? "NONE" : out.tier().name(),
            "policyState", out.policyState(), "costCents", out.costCents(), "cacheHit", out.cacheHit());
    }

    // ── Home ──────────────────────────────────────────────────────────────────────

    public Map<String, Object> home(String workspaceId, String userId) {
        rbac.require(userId, workspaceId, "view_items");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("todaysWork", dao.todaysWork(workspaceId, userId));
        out.put("reviewQueue", reviewQueueRows(workspaceId, userId));
        out.put("blockers", dao.blockers(workspaceId, userId));
        out.put("focusBlocks", focusMode.list(workspaceId, userId).stream().map(b -> Map.<String, Object>of(
            "id", b.getId(), "title", b.getTitle(), "startsAt", b.getStartsAt(),
            "endsAt", b.getEndsAt(), "status", b.getStatus(), "allowP0", b.isAllowP0())).toList());
        out.put("focusStatus", focusMode.status(userId));
        out.put("recentActivity", dao.recentActivity(userId));
        return out;
    }

    // ── Code review queue (ranked) ─────────────────────────────────────────────────

    private List<Map<String, Object>> reviewQueueRows(String workspaceId, String userId) {
        OffsetDateTime now = OffsetDateTime.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PullRequestReviewer r : reviewers.findByReviewerIdAndState(userId, "REQUESTED")) {
            PullRequest pr = pullRequests.findById(r.getPullRequestId()).orElse(null);
            if (pr == null || !workspaceId.equals(pr.getWorkspaceId())) continue;   // tenant guard
            if (!"OPEN".equals(pr.getStatus()) && !"DRAFT".equals(pr.getStatus())) continue;
            String priority = null;
            if (pr.getWorkItemId() != null) {
                priority = dao.workItemPriority(pr.getWorkItemId());
            }
            long ageHours = pr.getCreatedAt() == null ? 0 : ChronoUnit.HOURS.between(pr.getCreatedAt(), now);
            int size = (pr.getAdditions() == null ? 0 : pr.getAdditions())
                     + (pr.getDeletions() == null ? 0 : pr.getDeletions());
            boolean expertise = !codeLinks.findByWorkspaceIdAndAuthorIdOrderByCreatedAtDesc(workspaceId, userId).isEmpty()
                && pr.getWorkItemId() != null
                && !codeLinks.findByWorkItemIdOrderByCreatedAtDesc(pr.getWorkItemId()).stream()
                        .noneMatch(cl -> userId.equals(cl.getAuthorId()));
            int score = prUrgencyScore(ageHours, size, priority, expertise);
            Map<String, Object> m = new LinkedHashMap<>(codeContext.prRow(pr));
            m.put("urgencyScore", score);
            m.put("ageHours", ageHours);
            m.put("linkedPriority", priority);
            m.put("expertiseMatch", expertise);
            rows.add(m);
        }
        rows.sort((a, b) -> Integer.compare((int) b.get("urgencyScore"), (int) a.get("urgencyScore")));
        return rows;
    }

    public Map<String, Object> reviewQueue(String workspaceId, String userId, boolean inContext) {
        rbac.require(userId, workspaceId, "view_items");
        List<Map<String, Object>> rows = reviewQueueRows(workspaceId, userId);
        String draft = rows.isEmpty() ? "No pull requests are waiting on your review."
            : "Top review: " + rows.get(0).get("title") + " (urgency " + rows.get(0).get("urgencyScore") + ").";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.REVIEW_RANK, "Rank review queue", draft, null, inContext));
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("queue", rows);                          // order is always the deterministic ranking
        res.put("summary", out.fallback() ? draft : out.text());
        res.put("meta", aiMeta(out));
        return res;
    }

    // ── Personal velocity (PRIVATE — own metrics only) ─────────────────────────────

    public Map<String, Object> velocity(String workspaceId, String userId) {
        rbac.require(userId, workspaceId, "view_items");
        DeveloperWorkspaceDao.VelocityCounts v = dao.velocity(workspaceId, userId);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("private", true);                          // never surfaced to a manager (RB-20 §4)
        m.put("assigned", v.assigned());
        m.put("completed", v.done());
        m.put("completionRate", completionRate(v.done(), v.assigned()));
        m.put("avgCycleTimeDays", Math.round(v.cycleDays() * 10.0) / 10.0);
        m.put("throughputLast14Days", v.throughput14());
        return m;
    }

    // ── Standup helper ──────────────────────────────────────────────────────────────

    public Map<String, Object> standup(String workspaceId, String userId, boolean inContext) {
        rbac.require(userId, workspaceId, "view_items");
        OffsetDateTime since = OffsetDateTime.now().minusHours(36);

        List<String> yesterday = dao.standupYesterday(workspaceId, userId, since);
        // Commits the engineer landed recently feed "yesterday" too (git activity, Cap U).
        codeLinks.findByWorkspaceIdAndAuthorIdOrderByCreatedAtDesc(workspaceId, userId).stream()
            .filter(cl -> "COMMIT".equals(cl.getKind()) && cl.getCreatedAt() != null && cl.getCreatedAt().isAfter(since))
            .limit(5).forEach(cl -> yesterday.add("commit " + cl.getRef() + " — " + nv(cl.getMessage())));

        List<String> today = dao.standupToday(workspaceId, userId);

        List<Map<String, Object>> blockerRows = dao.blockers(workspaceId, userId);
        List<String> blocked = blockerRows.stream()
            .map(b -> b.get("id") + " blocked by " + b.get("blockedBy") + " (" + b.get("blockerTitle") + ")").toList();

        String draft = renderStandup(yesterday, today, blocked);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.STANDUP, "Draft standup", draft, null, inContext));
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("draft", out.fallback() ? draft : out.text());   // user edits before posting
        res.put("yesterday", yesterday);
        res.put("today", today);
        res.put("blockers", blocked);
        res.put("meta", aiMeta(out));
        return res;
    }

    static String renderStandup(List<String> yesterday, List<String> today, List<String> blocked) {
        StringBuilder sb = new StringBuilder();
        sb.append("Yesterday:\n");
        if (yesterday.isEmpty()) sb.append("  • (nothing recorded)\n");
        else yesterday.forEach(y -> sb.append("  • ").append(y).append('\n')); {
        sb.append("Today:\n");
        }
        if (today.isEmpty()) sb.append("  • (nothing in progress)\n");
        else today.forEach(t -> sb.append("  • ").append(t).append('\n')); {
        sb.append("Blockers:\n");
        }
        if (blocked.isEmpty()) sb.append("  • None\n");
        else blocked.forEach(b -> sb.append("  • ").append(b).append('\n')); {
        return sb.toString();
        }
    }

    // ── Explain linked code ─────────────────────────────────────────────────────────

    public Map<String, Object> explainCode(String workItemId, String userId, boolean inContext) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null) throw ApiException.notFound("Work item", workItemId); {
        rbac.require(userId, wsId, "view_items");
        }
        List<CodeLink> links = codeLinks.findByWorkItemIdOrderByCreatedAtDesc(workItemId);
        StringBuilder draft = new StringBuilder("Linked code for " + workItemId + ":\n");
        if (links.isEmpty()) draft.append("  (no commits, branches or PRs linked yet)\n");
        links.forEach(cl -> draft.append("  • ").append(cl.getKind()).append(' ')
            .append(cl.getRef()).append(" — ").append(nv(cl.getMessage())).append('\n'));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            wsId, userId, AiCapabilities.CODE_EXPLAIN, "Explain linked code for " + workItemId,
            draft.toString(), null, inContext));
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("explanation", out.fallback() ? draft.toString() : out.text());
        res.put("links", codeContext.contextForWorkItem(workItemId, userId).get("links"));
        res.put("meta", aiMeta(out));
        return res;
    }

    // ── Propose item update from a commit message ────────────────────────────────────

    public Map<String, Object> commitSummary(String workspaceId, String userId, String message, boolean inContext) {
        rbac.require(userId, workspaceId, "view_items");
        Map<String, String> suggestion = suggestFromCommit(message);
        String draft = "Commit references " + nv(suggestion.get("workItemId"))
            + (suggestion.get("suggestedStatus") != null
               ? "; suggest moving it to '" + suggestion.get("suggestedStatus") + "'." : "; no status change suggested.");
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.COMMIT_SUMMARY, "Summarise commit: " + nv(message),
            draft, null, inContext));
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("workItemId", suggestion.get("workItemId"));
        res.put("suggestedStatus", suggestion.get("suggestedStatus"));
        res.put("summary", out.fallback() ? draft : out.text());
        res.put("meta", aiMeta(out));
        return res;
    }

    // ── Calendar sync ────────────────────────────────────────────────────────────────

    /**
     * Return upcoming calendar events for {@code userId} pulled from any active calendar
     * integration (Google Calendar or Microsoft 365) connected to {@code workspaceId}.
     *
     * <p>Empty list when no calendar is connected — the caller is responsible for surfacing a
     * "connect your calendar" nudge in that case. Workspace-scoped; never crosses tenant boundaries.
     *
     * @param workspaceId tenant scope (RB-40 §1)
     * @param userId      the developer whose calendar is fetched
     * @param lookaheadDays how many days ahead to look (capped at 30)
     */
    public List<CalendarSyncService.CalendarEvent> calendarEvents(
            String workspaceId, String userId, int lookaheadDays) {
        rbac.require(userId, workspaceId, "view_items");
        return calendarSync.syncEvents(workspaceId, userId, lookaheadDays);
    }

    /**
     * Convert a calendar event into a bSmart Works "Meeting" work item, record the domain event,
     * and return the new item's id. Idempotent on the external event id.
     *
     * @param workspaceId tenant scope (RB-40 §1)
     * @param projectId   target project for the new Meeting item
     * @param userId      the developer creating the item (RBAC + audit)
     * @param event       the normalised calendar event from {@link #calendarEvents}
     */
    public CalendarSyncService.MeetingCreationResult createMeeting(
            String workspaceId, String projectId, String userId,
            CalendarSyncService.CalendarEvent event) {
        rbac.require(userId, workspaceId, "create_items");
        return calendarSync.createMeetingFromCalendarEvent(workspaceId, projectId, userId, event);
    }

    private static String nv(String s) { return s == null ? "" : s; }
}
