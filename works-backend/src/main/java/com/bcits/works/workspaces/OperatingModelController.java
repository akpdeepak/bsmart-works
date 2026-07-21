package com.bcits.works.workspaces;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import com.bcits.works.shared.ApiException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/operating-model")
public class OperatingModelController {

    private final OperatingModelPolicyRepository repository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public OperatingModelController(OperatingModelPolicyRepository repository, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.repository = repository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<OperatingModelPolicy> list(@PathVariable String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return repository.findByWorkspaceId(workspaceId);
    }

    @PostMapping
    public OperatingModelPolicy createOrUpdate(@PathVariable String workspaceId, @RequestBody OperatingModelPolicy policy) {
        // Only ADMIN (Tier 2) or OWNER (Tier 3) can manage operating model
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 2) {
            throw ApiException.forbidden("You must be an Admin or Owner to manage the operating model.");
        }
        
        List<OperatingModelPolicy> existing = repository.findByWorkspaceId(workspaceId);
        for (OperatingModelPolicy p : existing) {
            if (p.getUserType().equals(policy.getUserType()) &&
                p.getResourceType().equals(policy.getResourceType()) &&
                p.getActionName().equals(policy.getActionName())) {
                p.setAllowed(policy.isAllowed());
                p.setUpdatedAt(OffsetDateTime.now());
                return repository.save(p);
            }
        }
        
        policy.setId("OMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        policy.setWorkspaceId(workspaceId);
        policy.setCreatedAt(OffsetDateTime.now());
        policy.setUpdatedAt(OffsetDateTime.now());
        return repository.save(policy);
    }
}
