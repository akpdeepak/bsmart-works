package com.bcits.works.devsync;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Developer Workspace surface (Cap U, iteration 14). Home, the ranked code-review queue, the
 * standup-helper draft, code explanation and commit→item suggestions. RBAC is enforced in
 * {@link DeveloperWorkspaceService} (RB-10 §2); every endpoint is workspace-scoped (RB-40 §1).
 *
 * <p><b>Personal velocity is private.</b> {@code /velocity} reports only the caller's own metrics —
 * there is deliberately no userId parameter, so a manager can never request a report's numbers
 * (RB-20 §4).
 */
@RestController
@RequestMapping("/api/v1/developer-workspace")
public class DeveloperWorkspaceController {

    private final DeveloperWorkspaceService service;
    private final AuthenticatedUser authenticatedUser;

    public DeveloperWorkspaceController(DeveloperWorkspaceService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    private static boolean inContext(Map<String, Object> body) {
        Object v = body == null ? null : body.get("aiInContext");
        return !(v instanceof Boolean b) || b;   // default true
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }

    @GetMapping
    public Map<String, Object> home(@RequestParam String workspaceId) {
        return service.home(workspaceId, authenticatedUser.id());
    }

    @GetMapping("/velocity")
    public Map<String, Object> velocity(@RequestParam String workspaceId) {
        // No userId param by design — a user only ever sees their own velocity (RB-20 §4).
        return service.velocity(workspaceId, authenticatedUser.id());
    }

    @GetMapping("/review-queue")
    public Map<String, Object> reviewQueue(@RequestParam String workspaceId,
                                           @RequestParam(required = false, defaultValue = "true") boolean aiInContext) {
        return service.reviewQueue(workspaceId, authenticatedUser.id(), aiInContext);
    }

    @PostMapping("/standup")
    public Map<String, Object> standup(@RequestParam String workspaceId,
                                       @RequestBody(required = false) Map<String, Object> body) {
        return service.standup(workspaceId, authenticatedUser.id(), inContext(body));
    }

    @PostMapping("/explain-code")
    public Map<String, Object> explainCode(@RequestParam String workItemId,
                                           @RequestBody(required = false) Map<String, Object> body) {
        return service.explainCode(workItemId, authenticatedUser.id(), inContext(body));
    }

    @PostMapping("/commit-summary")
    public Map<String, Object> commitSummary(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        return service.commitSummary(workspaceId, authenticatedUser.id(), str(body, "message"), inContext(body));
    }
}
