package com.bcits.works.workitems;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Per-type field preferences — which fields show (and in what order) on the work item detail
 * surface, per work-item type. Workspace-scoped (RB-40 §1). Read returns all prefs for the
 * workspace; the bulk PUT replaces one type's prefs. Edited in Settings → Fields.
 */
@Tag(name = "Type Field Prefs", description = "Per-type field visibility/order on the detail surface")
@RestController
@RequestMapping("/api/v1/type-field-prefs")
public class TypeFieldPrefController {

    private final TypeFieldPrefRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public TypeFieldPrefController(TypeFieldPrefRepository repo, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "All per-type field prefs for a workspace")
    @GetMapping
    public List<TypeFieldPref> list(@RequestParam String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return repo.findByWorkspaceId(workspaceId);
    }

    @Operation(summary = "Replace the field prefs for one type")
    @PutMapping
    @Transactional
    public List<TypeFieldPref> replace(@RequestParam String workspaceId, @RequestParam String typeKey,
                                       @RequestBody List<PrefRequest> prefs) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_projects");
        repo.deleteByWorkspaceIdAndTypeKey(workspaceId, typeKey);
        int order = 0;
        for (PrefRequest p : prefs) {
            if (p.fieldKey() == null || p.fieldKey().isBlank()) continue;
            TypeFieldPref pref = new TypeFieldPref();
            pref.setId("tfp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
            pref.setWorkspaceId(workspaceId);
            pref.setTypeKey(typeKey);
            pref.setFieldKey(p.fieldKey());
            pref.setVisible(p.visible() == null ? Boolean.TRUE : p.visible());
            pref.setSortOrder(p.sortOrder() != null ? p.sortOrder() : order);
            pref.setCreatedAt(OffsetDateTime.now());
            repo.save(pref);
            order++;
        }
        return repo.findByWorkspaceId(workspaceId);
    }

    record PrefRequest(String fieldKey, Boolean visible, Integer sortOrder) {}
}
