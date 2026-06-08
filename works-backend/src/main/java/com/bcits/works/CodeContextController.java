package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Code context + code review queue source (Cap U, iteration 14). The IDE extensions and the
 * {@code works} CLI POST commit/branch/PR links here; the web work-item panel reads the context.
 * RBAC + workspace scoping live in {@link CodeContextService} (RB-10 §2, RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/code")
public class CodeContextController {

    private final CodeContextService codeContext;
    private final AuthenticatedUser authenticatedUser;

    public CodeContextController(CodeContextService codeContext, AuthenticatedUser authenticatedUser) {
        this.codeContext = codeContext;
        this.authenticatedUser = authenticatedUser;
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }

    @PostMapping("/links")
    public CodeLink linkCode(@RequestBody Map<String, Object> body) {
        return codeContext.linkCode(authenticatedUser.id(), str(body, "workItemId"), str(body, "kind"),
            str(body, "ref"), str(body, "message"), str(body, "url"), str(body, "filesTouched"));
    }

    @GetMapping("/context")
    public Map<String, Object> context(@RequestParam String workItemId) {
        return codeContext.contextForWorkItem(workItemId, authenticatedUser.id());
    }

    @GetMapping("/pull-requests")
    public List<Map<String, Object>> pullRequests(@RequestParam String workspaceId,
                                                  @RequestParam(required = false) String status) {
        return codeContext.listPullRequests(workspaceId, authenticatedUser.id(), status);
    }
}
