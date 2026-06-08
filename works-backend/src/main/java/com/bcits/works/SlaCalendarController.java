package com.bcits.works;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Business-hours calendars (iteration 8, Cap M). Workspace-scoped CRUD for the calendars that SLA
 * policies measure against. RBAC at the service boundary (RB-10 §2): reads require workspace
 * membership; mutations require {@code manage_sla}. Every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/sla/calendars")
public class SlaCalendarController {

    private final SlaCalendarRepository calendars;
    private final SlaPolicyService policyService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SlaCalendarController(SlaCalendarRepository calendars, SlaPolicyService policyService,
                                EventService eventService, AuthenticatedUser authenticatedUser,
                                RbacService rbac) {
        this.calendars = calendars;
        this.policyService = policyService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<SlaCalendar> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return calendars.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @GetMapping("/{id}")
    public SlaCalendar get(@PathVariable String id) {
        SlaCalendar cal = load(id);
        rbac.require(authenticatedUser.id(), cal.getWorkspaceId(), "view_items");
        return cal;
    }

    @PostMapping
    public SlaCalendar create(@Valid @RequestBody SlaCalendar calendar) {
        String userId = authenticatedUser.id();
        if (calendar.getWorkspaceId() == null || calendar.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, calendar.getWorkspaceId(), "manage_sla");
        SlaCalendar saved = calendars.save(policyService.prepareCalendar(calendar, userId));
        eventService.record(saved.getId(), "SLA_CALENDAR_CREATED", userId,
            Map.of("name", safe(saved.getName()), "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PutMapping("/{id}")
    public SlaCalendar update(@PathVariable String id, @Valid @RequestBody SlaCalendar updated) {
        String userId = authenticatedUser.id();
        SlaCalendar existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_sla");
        SlaCalendar saved = calendars.save(policyService.applyCalendarUpdate(existing, updated));
        eventService.record(saved.getId(), "SLA_CALENDAR_UPDATED", userId, Map.of("name", safe(saved.getName())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        SlaCalendar cal = load(id);
        rbac.require(userId, cal.getWorkspaceId(), "manage_sla");
        calendars.deleteById(id);
        eventService.record(id, "SLA_CALENDAR_DELETED", userId, Map.of("name", safe(cal.getName())));
        return ResponseEntity.noContent().build();
    }

    private SlaCalendar load(String id) {
        return calendars.findById(id).orElseThrow(() -> ApiException.notFound("SLA calendar", id));
    }

    private String safe(String s) { return s == null ? "" : s; }
}
