package com.bcits.works.shared;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Feature-flag holder for the central tenant-filter <b>binding</b> rollout (RB-40 §1, #243 Slice A).
 *
 * <p>The central Hibernate {@code workspaceFilter} infrastructure
 * ({@link WorkspaceFilterActivator}/{@link TenantContext}/{@link CurrentWorkspace}) has shipped, but
 * until this slice the only code that <i>bound</i> a workspace to it was {@link ProjectService}, so the
 * filter was dormant on every other read path. Slice A extends binding to <b>every
 * single-workspace-authorized path</b> via the one app-wide authorization choke point
 * ({@link RbacGate#getUserTier(String, String)} — see {@code EPIC-P1-243-central-tenant-filter.md}).
 *
 * <p>Because activating a backstop on every authorized read is a tenant-isolation change with a real
 * over-filtering failure mode (a request that authorizes one workspace but legitimately needs another),
 * it ships behind this flag, <b>default {@code false}</b>:
 * <ul>
 *   <li><b>off (default)</b> — merging this slice changes no runtime behaviour. Binding stays exactly
 *       where it was before (the explicit {@code ProjectService} call), every existing per-query
 *       predicate still does the scoping, and the filter is dormant elsewhere — byte-for-byte the
 *       pre-slice behaviour.</li>
 *   <li><b>on</b> — flip per-environment, canary-first. A successful member-tier check binds the
 *       central filter to that workspace as defence-in-depth behind the explicit predicates. It can
 *       only ever narrow a read to the authorized workspace, never widen one.</li>
 * </ul>
 *
 * <p>Multi-workspace read paths (work-item lists, {@code /my}, {@code findAllScopedToUser…}) do not
 * pass through a single-workspace tier check and so are never bound — their membership-join predicate
 * remains their (correct) isolation. That distinction is what keeps "on" safe.
 */
@Component
public class TenantFilterSettings {

    private final boolean bindingEnabled;

    public TenantFilterSettings(
            @Value("${tenant.filter.binding.enabled:false}") boolean bindingEnabled) {
        this.bindingEnabled = bindingEnabled;
    }

    /**
     * Whether the central tenant filter should be bound from the authorization choke point
     * (#243 Slice A). Default {@code false} — binding stays {@code ProjectService}-only until flipped.
     */
    public boolean isBindingEnabled() {
        return bindingEnabled;
    }
}
