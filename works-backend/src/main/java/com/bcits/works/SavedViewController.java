package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import jakarta.validation.Valid;
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
 * Custom saved views (iteration 17, Cap R). Reads require workspace membership; create/update/delete
 * require {@code manage_projects}. RBAC at the service boundary (RB-10 §2), workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/saved-views")
public class SavedViewController {

    private final SavedViewService savedViewService;
    private final AuthenticatedUser authenticatedUser;

    public SavedViewController(SavedViewService savedViewService, AuthenticatedUser authenticatedUser) {
        this.savedViewService = savedViewService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<SavedView> list(@RequestParam String workspaceId,
                                @RequestParam(required = false) String projectId) {
        return savedViewService.list(authenticatedUser.id(), workspaceId, projectId);
    }

    @PostMapping
    public SavedView create(@RequestParam String workspaceId, @Valid @RequestBody SavedView view) {
        return savedViewService.create(authenticatedUser.id(), workspaceId, view);
    }

    @PutMapping("/{id}")
    public SavedView update(@RequestParam String workspaceId, @PathVariable String id,
                            @RequestBody SavedView patch) {
        return savedViewService.update(authenticatedUser.id(), workspaceId, id, patch);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@RequestParam String workspaceId, @PathVariable String id) {
        savedViewService.delete(authenticatedUser.id(), workspaceId, id);
        return Map.of("ok", true);
    }

    /**
     * Run a saved view's query server-side and return the matching rows. Unlike {@code /bql/execute},
     * this is an audited, named run (RB-20 §5) — every call is recorded in the run-audit log.
     */
    @PostMapping("/{id}/run")
    public List<Map<String, Object>> run(@RequestParam String workspaceId, @PathVariable String id,
                                         @RequestParam(required = false, defaultValue = "100") int size) {
        return savedViewService.run(authenticatedUser.id(), workspaceId, id, size);
    }

    /** The workspace's saved/automated-run audit log (newest first). Requires manage_projects. */
    @GetMapping("/audit")
    public List<BqlRunAudit> audit(@RequestParam String workspaceId,
                                   @RequestParam(required = false, defaultValue = "100") int limit) {
        return savedViewService.auditLog(authenticatedUser.id(), workspaceId, limit);
    }
}
