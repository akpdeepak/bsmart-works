package com.bcits.works.workitems.api;
import com.bcits.works.workspaces.WorkspaceSetupService;

import com.bcits.works.shared.EventRepository;
import com.bcits.works.shared.EventService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * Emits workspace-scoped HEART activation-funnel events (WI-09 / docs/HEART-METRICS.md §4).
 *
 * <p>Rules (RB-40 §3, DPDP):
 * <ul>
 *   <li>All events use {@link EventService#recordInWorkspace} — every row carries workspace_id.</li>
 *   <li>No raw PII in payloads — only UUIDs and type strings.</li>
 *   <li>Methods are non-fatal: a telemetry failure must never roll back the business write that
 *       triggered it. Exceptions are caught and logged at WARN.</li>
 *   <li>Idempotent events (FIRST_VALUE, DAY_2_RETURN) check the events table before emitting.</li>
 * </ul>
 *
 * <p>Step 1 (WORKSPACE_CREATED) is emitted via {@link #onWorkspaceCreated} called from
 * {@link WorkspaceSetupService} when the first-run wizard status is first requested (WI-12).
 * Steps 2–5 are instrumented here.
 */
@Service
public class FunnelService {

    private static final Logger log = LoggerFactory.getLogger(FunnelService.class);

    // Day-2-return window: detect the first return on day 1 through day 30 after workspace creation.
    private static final int DAY2_WINDOW_MIN_DAYS = 1;
    private static final int DAY2_WINDOW_MAX_DAYS = 30;

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final JdbcTemplate jdbc;

    public FunnelService(EventService eventService, EventRepository eventRepository, JdbcTemplate jdbc) {
        this.eventService = eventService;
        this.eventRepository = eventRepository;
        this.jdbc = jdbc;
    }

    // ── Step 1 ───────────────────────────────────────────────────────────────

    /** Workspace activated — the first-run wizard was requested (funnel step 1). Idempotent. */
    public void onWorkspaceCreated(String workspaceId, String actorId) {
        if (workspaceId == null) return;
        try {
            if (alreadyEmitted(workspaceId, "WORKSPACE_CREATED")) return;
            eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_CREATED", actorId,
                    Map.of());
        } catch (Exception e) {
            log.warn("funnel: WORKSPACE_CREATED skipped for {}: {}", workspaceId, e.getMessage());
        }
    }

    // ── Step 2 ───────────────────────────────────────────────────────────────

    /** Config template applied to a workspace (funnel step 2). Fires on every apply. */
    public void onTemplateApplied(String workspaceId, String actorId, String templateId, String templateName) {
        if (workspaceId == null) return;
        try {
            eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_TEMPLATE_APPLIED", actorId,
                    Map.of("templateId", safe(templateId), "templateName", safe(templateName)));
        } catch (Exception e) {
            log.warn("funnel: WORKSPACE_TEMPLATE_APPLIED skipped for {}: {}", workspaceId, e.getMessage());
        }
    }

    // ── Step 3 ───────────────────────────────────────────────────────────────

    /**
     * First real work item created in a real project (funnel step 3). Idempotent — emits at most
     * once per workspace. Callers must guard: only invoke when workspaceId and projectId are
     * non-null (item belongs to a known workspace with a real project).
     */
    public void onFirstValueCandidate(String workspaceId, String actorId,
                                      String projectId, String workItemId, String workItemType) {
        if (workspaceId == null || projectId == null) return;
        try {
            if (alreadyEmitted(workspaceId, "WORKSPACE_FIRST_VALUE")) return;
            eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_FIRST_VALUE", actorId,
                    Map.of("projectId", safe(projectId),
                           "workItemId", safe(workItemId),
                           "workItemType", safe(workItemType)));
        } catch (Exception e) {
            log.warn("funnel: WORKSPACE_FIRST_VALUE skipped for {}: {}", workspaceId, e.getMessage());
        }
    }

    // ── Step 4 ───────────────────────────────────────────────────────────────

    /** Teammate invited to a workspace (funnel step 4). Fires on every invite so the dashboard
     *  can count distinct invites and identify the first-invite milestone. */
    public void onTeammateInvited(String workspaceId, String actorId, String invitedUserId) {
        if (workspaceId == null) return;
        try {
            eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_TEAMMATE_INVITED", actorId,
                    Map.of("invitedUserId", safe(invitedUserId)));
        } catch (Exception e) {
            log.warn("funnel: WORKSPACE_TEAMMATE_INVITED skipped for {}: {}", workspaceId, e.getMessage());
        }
    }

    // ── Step 5 ───────────────────────────────────────────────────────────────

    /**
     * Meaningful action detected within the day-1…day-30 window since workspace creation (funnel
     * step 5). Idempotent — emits at most once per workspace. Reads workspaces.created_at (V91).
     * No-op when the workspace is too new (same-day) or too old (beyond the window).
     */
    public void onMeaningfulAction(String workspaceId, String actorId) {
        if (workspaceId == null) return;
        try {
            if (alreadyEmitted(workspaceId, "WORKSPACE_DAY_2_RETURN")) return;
            OffsetDateTime createdAt = workspaceCreatedAt(workspaceId);
            if (createdAt == null) return;
            long daysSince = ChronoUnit.DAYS.between(createdAt.toLocalDate(), LocalDate.now());
            if (daysSince >= DAY2_WINDOW_MIN_DAYS && daysSince <= DAY2_WINDOW_MAX_DAYS) {
                eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_DAY_2_RETURN", actorId,
                        Map.of("daysSinceCreation", daysSince));
            }
        } catch (Exception e) {
            log.warn("funnel: WORKSPACE_DAY_2_RETURN skipped for {}: {}", workspaceId, e.getMessage());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private boolean alreadyEmitted(String workspaceId, String eventType) {
        return eventRepository.existsByWorkspaceIdAndEventType(workspaceId, eventType);
    }

    private OffsetDateTime workspaceCreatedAt(String workspaceId) {
        return jdbc.queryForObject(
                "SELECT created_at FROM workspaces WHERE id = ?",
                OffsetDateTime.class, workspaceId);
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }
}
