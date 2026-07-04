package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Command-palette search (iteration 18, Cap S). Returns the dynamic results — matching work items
 * and people — for the Cmd-K palette. RBAC ({@code view_items}) and workspace scoping are applied
 * here through {@link RbacService} / {@link CommandSearchService} (RB-10 §2, RB-40 §1). An empty
 * query returns nothing rather than the whole workspace.
 */
@RestController
@RequestMapping("/api/v1/command-palette")
public class CommandPaletteController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final CommandSearchService search;

    public CommandPaletteController(AuthenticatedUser authenticatedUser, RbacService rbac,
                                    CommandSearchService search) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.search = search;
    }

    @GetMapping("/search")
    public Map<String, Object> search(@RequestParam String workspaceId,
                                      @RequestParam(required = false, defaultValue = "") String q) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        if (q.isBlank()) {
            return Map.of("items", List.of(), "people", List.of());
        }
        return search.search(workspaceId, q);
    }
}
