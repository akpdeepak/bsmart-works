package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventRepository;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * First-run workspace setup wizard (WI-12). Returns the workspace's activation checklist and
 * completeness score, and emits the WORKSPACE_CREATED funnel event (step 1) on first access.
 *
 * <p>Any workspace member may call the status endpoint; the score and wizard-needed flag guide
 * the frontend to show or hide the onboarding wizard. The wizard itself uses the existing
 * {@link ConfigTemplateService#apply} and workspace-invite endpoints for its action steps.
 */
@Service
public class WorkspaceSetupService {

    /** Show wizard for workspaces created within this many days (inclusive). */
    private static final int WIZARD_WINDOW_DAYS = 30;

    private static final String[] ONBOARDING_TEMPLATE_IDS = {
        "TPL-ONBOARD-SCRUM", "TPL-ONBOARD-KANBAN", "TPL-ONBOARD-BUG", "TPL-ONBOARD-RAID"
    };

    private final RbacGate rbac;
    private final FunnelService funnelService;
    private final EventRepository eventRepository;
    private final JdbcTemplate jdbc;

    public WorkspaceSetupService(RbacGate rbac, FunnelService funnelService,
                                 EventRepository eventRepository, JdbcTemplate jdbc) {
        this.rbac = rbac;
        this.funnelService = funnelService;
        this.eventRepository = eventRepository;
        this.jdbc = jdbc;
    }

    /**
     * Returns the workspace's setup status. Any workspace member may call this.
     *
     * <p>Side-effect: emits WORKSPACE_CREATED (funnel step 1) on the first call, idempotent.
     */
    public Map<String, Object> getSetupStatus(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);

        // Emit step 1 idempotently — first time any member loads setup status.
        funnelService.onWorkspaceCreated(workspaceId, callerId);

        boolean templateApplied = alreadyEmitted(workspaceId, "WORKSPACE_TEMPLATE_APPLIED");
        boolean firstItem       = alreadyEmitted(workspaceId, "WORKSPACE_FIRST_VALUE");
        boolean teammateInvited = alreadyEmitted(workspaceId, "WORKSPACE_TEAMMATE_INVITED");

        List<Map<String, Object>> steps = new ArrayList<>();
        steps.add(step("template",  "Choose your workflow",   templateApplied));
        steps.add(step("first_item","Create your first item", firstItem));
        steps.add(step("teammate",  "Invite your team",       teammateInvited));

        long doneCount = steps.stream().filter(s -> Boolean.TRUE.equals(s.get("done"))).count();
        int  score     = (int) Math.round(doneCount * 100.0 / steps.size());
        boolean allDone = doneCount == steps.size();

        boolean needsWizard = !allDone && workspaceIsNew(workspaceId);

        List<Map<String, Object>> templates = loadOnboardingTemplates();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("needsWizard", needsWizard);
        result.put("score", score);
        result.put("steps", steps);
        result.put("templates", templates);
        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void requireMember(String callerId, String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        int tier = rbac.getUserTier(callerId, workspaceId);
        if (tier < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
    }

    private boolean alreadyEmitted(String workspaceId, String eventType) {
        return eventRepository.existsByWorkspaceIdAndEventType(workspaceId, eventType);
    }

    private boolean workspaceIsNew(String workspaceId) {
        try {
            OffsetDateTime created = jdbc.queryForObject(
                    "SELECT created_at FROM workspaces WHERE id = ?",
                    OffsetDateTime.class, workspaceId);
            if (created == null) return false;
            long daysSince = ChronoUnit.DAYS.between(created.toLocalDate(),
                    java.time.LocalDate.now());
            return daysSince <= WIZARD_WINDOW_DAYS;
        } catch (Exception e) {
            return false;
        }
    }

    private List<Map<String, Object>> loadOnboardingTemplates() {
        if (ONBOARDING_TEMPLATE_IDS.length == 0) return List.of();
        String placeholders = "?,".repeat(ONBOARDING_TEMPLATE_IDS.length);
        placeholders = placeholders.substring(0, placeholders.length() - 1);
        return jdbc.queryForList(
                "SELECT id, name, description FROM config_templates WHERE id IN (" + placeholders + ")",
                (Object[]) ONBOARDING_TEMPLATE_IDS);
    }

    private static Map<String, Object> step(String id, String label, boolean done) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("id", id);
        s.put("label", label);
        s.put("done", done);
        return s;
    }
}
