package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.projects.ImpedimentRepository;
import com.bcits.works.projects.StandupEntryRepository;
import com.bcits.works.projects.StandupSession;
import com.bcits.works.projects.StandupSessionRepository;
import com.bcits.works.messaging.ActionItemRepository;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
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

    // ── Pure helper (unit-testable) ───────────────────────────────────────────
    /** Days since the last status change; 0 when unknown (fresh items aren't flagged stale). */
    static long staleDays(OffsetDateTime statusChangedAt, OffsetDateTime now) {
        if (statusChangedAt == null || now == null) return 0;
        long days = Duration.between(statusChangedAt, now).toDays();
        return Math.max(days, 0);
    }

    public Map<String, Object> myDay(String callerId, String projectId) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, "view_items");
        OffsetDateTime now = OffsetDateTime.now();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("myItems", workItems.findByProjectId(projectId).stream()
                .filter(i -> i.getDeletedAt() == null && callerId.equals(i.getAssigneeId()))
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

        out.put("myImpediments", impediments.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId).stream()
                .filter(imp -> !"RESOLVED".equals(imp.getStatus()))
                .filter(imp -> callerId.equals(imp.getRaisedBy()) || callerId.equals(imp.getOwnerId())
                        || callerId.equals(imp.getCreatedBy()))
                .toList());

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
