package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;
import com.bcits.works.workitems.api.WorkItem;
import com.bcits.works.workitems.api.WorkItemRepository;
import com.bcits.works.projects.Impediment;
import com.bcits.works.projects.ImpedimentRepository;
import com.bcits.works.projects.StandupEntryRepository;
import com.bcits.works.projects.StandupSession;
import com.bcits.works.projects.StandupSessionRepository;
import com.bcits.works.messaging.api.ActionItemRepository;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Cap V · Developer "My Day" lens of the Sprint Cockpit: one server-shaped payload with the
 * caller's standup entry for today, their open work items (with staleness), the impediments
 * they raised or own, and the action items assigned to them. The payload is always scoped to
 * the caller — it never exposes another member's day (RB-40 §1 field shaping).
 */
@Service
public class MyDayService {

    static final int STALE_AFTER_DAYS = 3;

    private final WorkItemRepository workItems;
    private final ImpedimentRepository impediments;
    private final ActionItemRepository actionItems;
    private final StandupSessionRepository standups;
    private final StandupEntryRepository entries;
    private final RbacGate rbac;

    public MyDayService(WorkItemRepository workItems, ImpedimentRepository impediments,
                        ActionItemRepository actionItems, StandupSessionRepository standups,
                        StandupEntryRepository entries, RbacGate rbac) {
        this.workItems = workItems;
        this.impediments = impediments;
        this.actionItems = actionItems;
        this.standups = standups;
        this.entries = entries;
        this.rbac = rbac;
    }

    /** EPIC-7: the daily attention list is capped so Home shows the few things that matter, not a firehose. */
    static final int MAX_ATTENTION = 5;

    // ── Pure helpers (unit-testable) ───────────────────────────────────────────
    /** Days since the last status change; 0 when unknown (fresh items aren't flagged stale). */
    static long staleDays(OffsetDateTime statusChangedAt, OffsetDateTime now) {
        if (statusChangedAt == null || now == null) return 0;
        long days = Duration.between(statusChangedAt, now).toDays();
        return Math.max(days, 0);
    }

    /**
     * Deterministic attention score for one of the caller's work items (EPIC-7). Higher = more
     * urgent. Done/closed items score 0 (never demand attention). The ranking is overdue → due-today
     * → priority → stalled → in-progress, which is the order Home surfaces work in.
     */
    static int attentionScore(String status, String priority, LocalDate dueDate, long staleDays, LocalDate today) {
        if (status != null && (status.equalsIgnoreCase("DONE") || status.equalsIgnoreCase("CLOSED"))) {
            return 0;
        }
        int score = 0;
        if (dueDate != null && today != null) {
            if (dueDate.isBefore(today)) {
                score += 100;
            } else if (dueDate.isEqual(today)) {
                score += 50;
            }
        }
        if (priority != null) {
            switch (priority.toLowerCase()) {
                case "critical" -> score += 60;
                case "high" -> score += 40;
                case "medium" -> score += 10;
                default -> { }
            }
        }
        if (staleDays >= STALE_AFTER_DAYS) score += 20;
        if (status != null && (status.equalsIgnoreCase("In Progress") || status.equalsIgnoreCase("IN_PROGRESS"))) {
            score += 10;
        }
        return score;
    }

    /** Short human reason for why an item is on the attention list, matching the dominant score factor. */
    static String attentionReason(String priority, LocalDate dueDate, long staleDays, LocalDate today) {
        if (dueDate != null && today != null && dueDate.isBefore(today)) return "Overdue";
        if (dueDate != null && today != null && dueDate.isEqual(today)) return "Due today";
        if ("critical".equalsIgnoreCase(priority)) return "Critical priority";
        if ("high".equalsIgnoreCase(priority)) return "High priority";
        if (staleDays >= STALE_AFTER_DAYS) return "Stalled " + staleDays + " days";
        return "Needs attention";
    }

    public Map<String, Object> myDay(String callerId, String projectId) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, "view_items");
        OffsetDateTime now = OffsetDateTime.now();

        LocalDate todayDate = LocalDate.now();
        Map<String, Object> out = new LinkedHashMap<>();

        List<WorkItem> myItemList = workItems.findByProjectId(projectId).stream()
                .filter(i -> i.getDeletedAt() == null && callerId.equals(i.getAssigneeId()))
                .toList();
        out.put("myItems", myItemList.stream()
                .map(i -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", i.getId());
                    row.put("title", i.getTitle());
                    row.put("status", i.getStatus());
                    row.put("storyPoints", i.getStoryPoints());
                    row.put("dueDate", i.getDueDate());
                    row.put("staleDays", staleDays(i.getStatusChangedAt(), now));
                    return row;
                })
                .toList());

        List<Impediment> myImpedimentList =
                impediments.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId).stream()
                .filter(imp -> !"RESOLVED".equals(imp.getStatus()))
                .filter(imp -> callerId.equals(imp.getRaisedBy()) || callerId.equals(imp.getOwnerId())
                        || callerId.equals(imp.getCreatedBy()))
                .toList();
        out.put("myImpediments", myImpedimentList);

        // EPIC-7 attention model: the ranked, capped-at-five "what needs me now" list Home renders.
        // Deterministic (no AI): scored work items plus any unresolved impediments (always high
        // attention), top MAX_ATTENTION by score. This is the sourced daily-signal the layout lacked.
        List<Map<String, Object>> attention = new ArrayList<>();
        for (WorkItem i : myItemList) {
            long stale = staleDays(i.getStatusChangedAt(), now);
            int score = attentionScore(i.getStatus(), i.getPriority(), i.getDueDate(), stale, todayDate);
            if (score <= 0) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", i.getId());
            row.put("title", i.getTitle());
            row.put("type", "work_item");
            row.put("reason", attentionReason(i.getPriority(), i.getDueDate(), stale, todayDate));
            row.put("score", score);
            attention.add(row);
        }
        for (Impediment imp : myImpedimentList) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", imp.getId());
            row.put("title", imp.getTitle());
            row.put("type", "impediment");
            row.put("reason", "Blocking impediment");
            row.put("score", 70);
            attention.add(row);
        }
        attention.sort(Comparator.comparingInt((Map<String, Object> r) -> (int) r.get("score")).reversed());
        out.put("attention", attention.stream().limit(MAX_ATTENTION).toList());

        out.put("myActions", actionItems.findByProjectIdScopedToUser(projectId, callerId).stream()
                .filter(a -> callerId.equals(a.getOwnerId()))
                .filter(a -> "OPEN".equals(a.getStatus()) || "IN_PROGRESS".equals(a.getStatus()))
                .toList());

        // Today's standup (if any) and the caller's own entry in it — for the async pre-submit.
        StandupSession today = standups.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .filter(s -> LocalDate.now().equals(s.getSessionDate()))
                .findFirst().orElse(null);
        out.put("todayStandup", today);
        out.put("myStandupEntry", today == null ? null
                : entries.findBySessionIdOrderByDisplayOrderAsc(today.getId()).stream()
                        .filter(e -> Objects.equals(e.getMemberId(), callerId))
                        .findFirst().orElse(null));
        return out;
    }
}
