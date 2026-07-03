package com.bcits.works;

import com.bcits.works.shared.TenantContext;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.springframework.stereotype.Component;

/**
 * The one entry point a controller or service uses to bind the request's workspace to the central
 * tenant scope (RB-40 §1). Binding here both records the workspace in {@link TenantContext} and
 * activates the Hibernate {@code workspaceFilter} on the current session, so every subsequent
 * filtered-entity JPA read in the request is automatically narrowed to that workspace — the caller
 * does not repeat the predicate per query.
 *
 * <h2>How to use it</h2>
 * After a controller/service has <b>resolved and authorised</b> the workspace the usual way
 * (validated param or derived from data, then {@code rbac.require(...)}), call {@link #bind(String)}.
 * The central filter then backs up that explicit scoping as defence-in-depth. This call is purely
 * additive: existing explicit {@code findByWorkspaceId...} scoping continues to run unchanged, and
 * the filter can only ever narrow a result to the bound workspace, never widen it.
 *
 * <p>For legitimate cross-workspace work use {@link TenantScope#runAsSystem(Runnable)} instead of
 * binding a workspace — that is the documented escape hatch (schedulers, public share-token
 * dashboard, SCIM, login/signup, admin sweeps).
 */
@Component
public class CurrentWorkspace {

    private final WorkspaceFilterActivator activator;

    public CurrentWorkspace(WorkspaceFilterActivator activator) {
        this.activator = activator;
    }

    /** Bind {@code workspaceId} as the current tenant and enable the central filter for it. */
    public void bind(String workspaceId) {
        TenantContext.setWorkspace(workspaceId);
        activator.syncCurrentSession();
    }
}
