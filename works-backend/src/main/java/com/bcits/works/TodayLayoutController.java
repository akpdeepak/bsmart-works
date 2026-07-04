package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Per-role Home → Today layouts. Thin HTTP layer — resolution, validation, RBAC
 * and tenancy all live in {@link TodayLayoutService} (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/today-layouts")
public class TodayLayoutController {

    private final TodayLayoutService service;
    private final AuthenticatedUser authenticatedUser;

    public TodayLayoutController(TodayLayoutService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    /** Resolved layout for the caller: personal → workspace template → builtin (null dashboard). */
    @GetMapping("/effective")
    public Map<String, Object> effective(@RequestParam String workspaceId, @RequestParam String role) {
        TodayLayoutService.EffectiveLayout out =
            service.effective(authenticatedUser.id(), workspaceId, role);
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("source", out.source());
        body.put("dashboard", out.dashboard()); // null when the built-in default applies
        return body;
    }

    /** Save the caller's personal Today layout for a role. */
    @PutMapping("/personal")
    public Dashboard savePersonal(@RequestBody LayoutRequest request) {
        return service.savePersonal(authenticatedUser.id(), request.workspaceId(), request.role(),
            request.widgets() == null ? List.of() : request.widgets());
    }

    /** Save the workspace-wide role template (ADMIN+; enforced in the service). */
    @PutMapping("/workspace-template")
    public Dashboard saveWorkspaceTemplate(@RequestBody LayoutRequest request) {
        return service.saveWorkspaceTemplate(authenticatedUser.id(), request.workspaceId(),
            request.role(), request.widgets() == null ? List.of() : request.widgets());
    }

    /** Drop the caller's personal override — falls back to the workspace/built-in default. */
    @DeleteMapping("/personal")
    public ResponseEntity<Void> resetPersonal(@RequestParam String workspaceId, @RequestParam String role) {
        service.resetPersonal(authenticatedUser.id(), workspaceId, role);
        return ResponseEntity.noContent().build();
    }

    /** Save payload: target workspace + role plus the full widget list (replace semantics). */
    public record LayoutRequest(String workspaceId, String role, List<DashboardWidget> widgets) { }
}
