package com.bcits.works.automation;

import com.bcits.works.AutomationCatalog;
import com.bcits.works.AutomationService;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.PageResponse;
import com.bcits.works.shared.RbacGate;

import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
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
 * Automation engine API (iteration 13, Cap C). Reads need workspace membership; creating, editing,
 * toggling, testing and running rules require {@code manage_automations}. RBAC is enforced here at
 * the service boundary (RB-10 §2) and every endpoint is workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/automations")
public class AutomationController {

    private final AutomationService automation;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public AutomationController(AutomationService automation, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.automation = automation;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/catalog")
    public Map<String, Object> catalog(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return Map.of("triggers", AutomationCatalog.triggers(),
            "actions", AutomationCatalog.actions(), "templates", AutomationCatalog.templates());
    }

    @GetMapping
    public List<AutomationRule> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return automation.list(workspaceId);
    }

    @GetMapping("/{id}")
    public AutomationRule get(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return automation.require(workspaceId, id);
    }

    @PostMapping
    public AutomationRule create(@RequestParam String workspaceId, @Valid @RequestBody AutomationRule rule) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_automations");
        return automation.create(workspaceId, userId, rule);
    }

    @PutMapping("/{id}")
    public AutomationRule update(@RequestParam String workspaceId, @PathVariable String id,
                                @Valid @RequestBody AutomationRule rule) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_automations");
        return automation.update(workspaceId, id, rule);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_automations");
        automation.delete(workspaceId, id);
        return Map.of("ok", true);
    }

    @PostMapping("/{id}/toggle")
    public AutomationRule toggle(@RequestParam String workspaceId, @PathVariable String id,
                                @RequestParam boolean enabled) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_automations");
        return automation.setEnabled(workspaceId, id, enabled);
    }

    /** Test mode — preview the affected items without mutating anything (RB-05 Stage 3). */
    @PostMapping("/{id}/test")
    public AutomationService.Preview test(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_automations");
        return automation.test(workspaceId, id);
    }

    @PostMapping("/{id}/run")
    public AutomationService.Preview run(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_automations");
        return automation.runNow(workspaceId, id, userId);
    }

    @GetMapping("/runs")
    public PageResponse<AutomationRun> runs(@RequestParam String workspaceId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return PageResponse.of(automation.runLog(workspaceId,
            PageRequest.of(Math.max(0, page), Math.min(200, Math.max(1, size)))));
    }

    @PostMapping("/suggest")
    public Map<String, Object> suggest(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return automation.suggest(workspaceId, userId, true);
    }
}
