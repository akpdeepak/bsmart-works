package com.bcits.works.workitems;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Per-type field preferences — which fields show (and in what order) on the work item detail
 * surface, per work-item type. Workspace-scoped (RB-40 §1). Read returns all prefs for the
 * workspace; the bulk PUT replaces one type's prefs. Edited in Settings → Fields.
 */
@Tag(name = "Type Field Prefs", description = "Per-type field visibility/order on the detail surface")
@RestController
@RequestMapping("/api/v1/type-field-prefs")
public class TypeFieldPrefController {

    private final TypeFieldPrefService service;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public TypeFieldPrefController(TypeFieldPrefService service, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "All per-type field prefs for a workspace")
    @GetMapping
    public List<TypeFieldPref> list(@RequestParam String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return service.list(workspaceId);
    }

    @Operation(summary = "Replace the field prefs for one type")
    @PutMapping
    public List<TypeFieldPref> replace(@RequestParam String workspaceId, @RequestParam String typeKey,
                                       @RequestBody List<TypeFieldPrefService.PrefRequest> prefs) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_projects");
        return service.replace(workspaceId, typeKey, prefs);
    }
}
