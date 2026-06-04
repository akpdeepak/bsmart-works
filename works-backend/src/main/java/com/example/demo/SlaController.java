package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HTTP surface for the SLA engine (iteration 8, Cap M). Parses requests and delegates: all
 * authorization, tenant scoping, events and business logic live in {@link SlaConfigService}
 * (config) and {@link SlaEngineService} (runtime + read surface) — never here (CLAUDE.md §2).
 */
@RestController
@RequestMapping("/api/v1/sla")
public class SlaController {

    private final SlaConfigService config;
    private final SlaEngineService engine;
    private final AuthenticatedUser authenticatedUser;

    public SlaController(SlaConfigService config, SlaEngineService engine, AuthenticatedUser authenticatedUser) {
        this.config = config;
        this.engine = engine;
        this.authenticatedUser = authenticatedUser;
    }

    // ── Calendars ──────────────────────────────────────────────────────────────

    @GetMapping("/calendars")
    public List<BusinessCalendar> listCalendars(@RequestParam String workspaceId) {
        return config.listCalendars(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/calendars")
    public BusinessCalendar createCalendar(@RequestParam String workspaceId,
                                           @Valid @RequestBody BusinessCalendar cal) {
        return config.createCalendar(authenticatedUser.id(), workspaceId, cal);
    }

    @PutMapping("/calendars/{id}")
    public BusinessCalendar updateCalendar(@PathVariable String id, @Valid @RequestBody BusinessCalendar cal) {
        return config.updateCalendar(authenticatedUser.id(), id, cal);
    }

    @DeleteMapping("/calendars/{id}")
    public ResponseEntity<Void> deleteCalendar(@PathVariable String id) {
        config.deleteCalendar(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Policies ───────────────────────────────────────────────────────────────

    @GetMapping("/policies")
    public List<SlaPolicy> listPolicies(@RequestParam String workspaceId) {
        return config.listPolicies(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/policies/templates")
    public List<SlaPolicy> templates() {
        return config.listTemplates();
    }

    @GetMapping("/policies/{id}")
    public Map<String, Object> getPolicy(@PathVariable String id) {
        return config.getPolicy(authenticatedUser.id(), id);
    }

    @PostMapping("/policies")
    public SlaPolicy createPolicy(@RequestParam String workspaceId, @Valid @RequestBody SlaPolicy policy) {
        return config.createPolicy(authenticatedUser.id(), workspaceId, policy);
    }

    @PutMapping("/policies/{id}")
    public SlaPolicy updatePolicy(@PathVariable String id, @Valid @RequestBody SlaPolicy policy) {
        return config.updatePolicy(authenticatedUser.id(), id, policy);
    }

    @PostMapping("/policies/{id}/activate")
    public SlaPolicy setActive(@PathVariable String id, @RequestParam(defaultValue = "true") boolean active) {
        return config.setActive(authenticatedUser.id(), id, active);
    }

    @DeleteMapping("/policies/{id}")
    public ResponseEntity<Void> deletePolicy(@PathVariable String id) {
        config.deletePolicy(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/policies/clone")
    public SlaPolicy cloneTemplate(@RequestParam String workspaceId, @RequestParam String templateId) {
        return config.cloneTemplate(authenticatedUser.id(), workspaceId, templateId);
    }

    // ── Targets ────────────────────────────────────────────────────────────────

    @PostMapping("/policies/{id}/targets")
    public SlaTarget addTarget(@PathVariable String id, @Valid @RequestBody SlaTarget target) {
        return config.addTarget(authenticatedUser.id(), id, target);
    }

    @DeleteMapping("/targets/{targetId}")
    public ResponseEntity<Void> deleteTarget(@PathVariable String targetId) {
        config.deleteTarget(authenticatedUser.id(), targetId);
        return ResponseEntity.noContent().build();
    }

    // ── Escalations ────────────────────────────────────────────────────────────

    @PostMapping("/policies/{id}/escalations")
    public SlaEscalation addEscalation(@PathVariable String id, @RequestBody SlaEscalation esc) {
        return config.addEscalation(authenticatedUser.id(), id, esc);
    }

    @DeleteMapping("/escalations/{escalationId}")
    public ResponseEntity<Void> deleteEscalation(@PathVariable String escalationId) {
        config.deleteEscalation(authenticatedUser.id(), escalationId);
        return ResponseEntity.noContent().build();
    }

    // ── Bulk application (preview + commit) ─────────────────────────────────────

    @GetMapping("/policies/{id}/preview")
    public Map<String, Object> previewBulkApply(@PathVariable String id) {
        return config.previewBulkApply(authenticatedUser.id(), id);
    }

    @PostMapping("/policies/{id}/apply")
    public Map<String, Object> commitBulkApply(@PathVariable String id) {
        return config.commitBulkApply(authenticatedUser.id(), id);
    }

    // ── Per-work-item read surface (countdown + audit) ─────────────────────────

    @GetMapping("/work-items/{workItemId}")
    public List<Map<String, Object>> instancesForItem(@PathVariable String workItemId) {
        return engine.instancesForItem(authenticatedUser.id(), workItemId);
    }

    @GetMapping("/work-items/{workItemId}/audit")
    public List<Map<String, Object>> audit(@PathVariable String workItemId) {
        return engine.audit(authenticatedUser.id(), workItemId);
    }

    // ── Reporting ──────────────────────────────────────────────────────────────

    @GetMapping("/report")
    public Map<String, Object> report(@RequestParam String workspaceId) {
        return engine.report(authenticatedUser.id(), workspaceId);
    }
}
