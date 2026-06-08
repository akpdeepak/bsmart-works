package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Live SLA clocks (iteration 8, Cap M) — the read side that powers the visible countdown badge on a
 * work item and the agent's workspace-wide timer view. Each clock is returned with its live elapsed,
 * remaining minutes, consumed percent, and display band (OK / WARN / BREACH) computed against its
 * policy's business-hours calendar. Reads are workspace-scoped and gated by membership (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/sla/instances")
public class SlaInstanceController {

    private final SlaInstanceRepository instances;
    private final SlaPolicyRepository policies;
    private final SlaCalendarRepository calendars;
    private final SlaCalculationService calc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SlaInstanceController(SlaInstanceRepository instances, SlaPolicyRepository policies,
                                SlaCalendarRepository calendars, SlaCalculationService calc,
                                AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.instances = instances;
        this.policies = policies;
        this.calendars = calendars;
        this.calc = calc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Clocks for a single work item (countdown badges + SLA panel), or all clocks in a workspace. */
    @GetMapping
    public List<Map<String, Object>> list(@RequestParam String workspaceId,
                                          @RequestParam(required = false) String workItemId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<SlaInstance> rows = workItemId != null
            ? instances.findByWorkspaceIdAndWorkItemId(workspaceId, workItemId)
            : instances.findByWorkspaceIdOrderByDueAtAsc(workspaceId);
        OffsetDateTime now = OffsetDateTime.now();
        Map<String, SlaCalculationService.BusinessCalendar> calCache = new HashMap<>();
        List<Map<String, Object>> out = new ArrayList<>();
        for (SlaInstance i : rows) {
            out.add(view(i, calCache, now));
        }
        return out;
    }

    private Map<String, Object> view(SlaInstance i,
                                     Map<String, SlaCalculationService.BusinessCalendar> calCache,
                                     OffsetDateTime now) {
        SlaCalculationService.BusinessCalendar cal = calendarFor(i.getPolicyId(), calCache);
        int target = i.getTargetMinutes() == null ? 0 : i.getTargetMinutes();
        int banked = i.getElapsedMinutes() == null ? 0 : i.getElapsedMinutes();
        int live = "RUNNING".equals(i.getState())
            ? banked + (int) calc.businessMinutesBetween(i.getLastResumedAt(), now, cal)
            : banked;
        boolean terminal = "MET".equals(i.getState()) || "BREACHED".equals(i.getState())
            || "STOPPED".equals(i.getState());
        int displayElapsed = terminal ? banked : live;
        int remaining = Math.max(0, target - displayElapsed);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", i.getId());
        m.put("workItemId", i.getWorkItemId());
        m.put("metric", i.getMetric());
        m.put("state", i.getState());
        m.put("targetMinutes", target);
        m.put("elapsedMinutes", displayElapsed);
        m.put("remainingMinutes", remaining);
        m.put("consumedPercent", calc.consumptionPercent(displayElapsed, target));
        m.put("band", terminal ? ("MET".equals(i.getState()) ? "MET" : "BREACH")
            : calc.band(displayElapsed, target));
        m.put("dueAt", i.getDueAt());
        m.put("breachedAt", i.getBreachedAt());
        m.put("completedAt", i.getCompletedAt());
        return m;
    }

    private SlaCalculationService.BusinessCalendar calendarFor(
            String policyId, Map<String, SlaCalculationService.BusinessCalendar> cache) {
        if (cache.containsKey(policyId)) {
            return cache.get(policyId);
        }
        SlaCalculationService.BusinessCalendar cal = policies.findById(policyId)
            .filter(p -> p.getCalendarId() != null)
            .flatMap(p -> calendars.findById(p.getCalendarId()))
            .map(c -> calc.from(c.getTimezone(), c.getWorkWeek(), c.getHolidays()))
            .orElse(null);
        cache.put(policyId, cal);
        return cal;
    }
}
