package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Definition-of-Done checklists (Cap U, iteration 14). Authoring is admin-gated, toggling respects
 * the work item's edit RBAC, and required items gate resolution — all enforced in
 * {@link DodChecklistService} (RB-10 §2). Workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/dod-checklists")
public class DodChecklistController {

    private final DodChecklistService service;
    private final AuthenticatedUser authenticatedUser;

    public DodChecklistController(DodChecklistService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam String workspaceId) {
        return service.list(workspaceId, authenticatedUser.id());
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
        return service.create(workspaceId, authenticatedUser.id(),
            str(body, "scopeType"), str(body, "scopeRef"), str(body, "name"), items);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestParam String workspaceId, @PathVariable String id) {
        service.delete(workspaceId, authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/for-work-item")
    public Map<String, Object> forWorkItem(@RequestParam String workItemId) {
        return service.forWorkItem(workItemId, authenticatedUser.id());
    }

    @PostMapping("/toggle")
    public Map<String, Object> toggle(@RequestBody Map<String, Object> body) {
        Object checked = body.get("checked");
        boolean isChecked = (checked instanceof Boolean b) && b;
        Long itemId = Long.valueOf(str(body, "itemId"));
        return service.toggle(str(body, "workItemId"), itemId, isChecked, authenticatedUser.id());
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }
}
