package com.bcits.works;

import com.bcits.works.shared.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Tag(name = "Custom Field Definitions", description = "Workspace-scoped custom fields that extend work item cards")
@RestController
@RequestMapping("/api/v1/custom-field-definitions")
public class CustomFieldDefinitionController {

    private final CustomFieldDefinitionRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CustomFieldDefinitionController(CustomFieldDefinitionRepository repo,
                                            AuthenticatedUser authenticatedUser,
                                            RbacService rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "List custom field definitions for a workspace")
    @GetMapping
    public List<CustomFieldDefinition> list(@RequestParam String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return repo.findActiveByWorkspaceId(workspaceId);
    }

    @Operation(summary = "Create a custom field definition")
    @PostMapping
    public CustomFieldDefinition create(@Valid @RequestBody CreateRequest req) {
        rbac.require(authenticatedUser.id(), req.workspaceId(), "manage_projects");

        CustomFieldDefinition def = new CustomFieldDefinition();
        def.setId("cfd_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        def.setWorkspaceId(req.workspaceId());
        def.setName(req.name());
        def.setFieldType(req.fieldType());
        def.setOptions(req.options());
        def.setCreatedBy(authenticatedUser.id());
        def.setCreatedAt(OffsetDateTime.now());
        return repo.save(def);
    }

    @Operation(summary = "Delete (soft) a custom field definition")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        CustomFieldDefinition def = repo.findById(id)
            .orElseThrow(() -> ApiException.notFound("CustomFieldDefinition", id));
        rbac.require(authenticatedUser.id(), def.getWorkspaceId(), "manage_projects");
        def.setDeletedAt(OffsetDateTime.now());
        repo.save(def);
        return ResponseEntity.noContent().build();
    }

    record CreateRequest(
        @NotBlank String workspaceId,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Pattern(regexp = "TEXT|NUMBER|DATE|SELECT") String fieldType,
        String options
    ) {}
}
