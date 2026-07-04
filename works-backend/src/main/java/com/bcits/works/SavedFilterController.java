package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/saved-filters")
public class SavedFilterController {

    private final SavedFilterRepository repository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public SavedFilterController(SavedFilterRepository repository, AuthenticatedUser authenticatedUser,
                                 RbacGate rbac) {
        this.repository = repository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<SavedFilter> getFilters(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        return repository.findByWorkspaceIdAndIsSharedOrCreatedBy(workspaceId, true, userId);
    }

    @PostMapping
    public SavedFilter createFilter(@Valid @RequestBody SavedFilter filter,
                                    @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        filter.setWorkspaceId(workspaceId);
        filter.setCreatedBy(userId);
        filter.setCreatedAt(OffsetDateTime.now());
        return repository.save(filter);
    }

    @PutMapping("/{id}/share")
    public SavedFilter toggleShare(@PathVariable Long id) {
        // findById bypasses @Filter (#243 Slice D) — re-check membership of the filter's workspace.
        SavedFilter f = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("SavedFilter", String.valueOf(id)));
        rbac.require(authenticatedUser.id(), f.getWorkspaceId(), "view_items");
        f.setShared(!Boolean.TRUE.equals(f.isShared()));
        return repository.save(f);
    }

    @DeleteMapping("/{id}")
    public void deleteFilter(@PathVariable Long id) {
        SavedFilter f = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("SavedFilter", String.valueOf(id)));
        rbac.require(authenticatedUser.id(), f.getWorkspaceId(), "view_items");
        repository.deleteById(id);
    }
}
