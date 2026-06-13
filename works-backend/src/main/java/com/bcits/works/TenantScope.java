package com.bcits.works;

import java.util.function.Supplier;

/**
 * Safe helpers for binding / suspending the central tenant scope (RB-40 §1). Prefer these over
 * touching {@link TenantContext} directly: they always restore the previous state in a {@code finally}
 * block, so a thrown exception or a thread reused from a pool can never leak a workspace binding into
 * the next piece of work.
 *
 * <h2>Escape hatch</h2>
 * {@link #runAsSystem(Runnable)} / {@link #callAsSystem(Supplier)} are the explicit, documented
 * "system / unfiltered" path for legitimate cross-workspace work — schedulers, the public
 * share-token dashboard, SCIM, login/signup (no workspace yet), and admin operations that iterate
 * every workspace. Inside them the central {@code workspaceFilter} is forced off; outside them, once
 * a workspace is bound, every filtered-entity JPA read is narrowed to that workspace automatically.
 */
public final class TenantScope {

    private TenantScope() {
    }

    /** Run {@code body} scoped to {@code workspaceId}, restoring the previous context afterwards. */
    public static void runScoped(String workspaceId, Runnable body) {
        String previous = TenantContext.getWorkspace();
        boolean previousSystem = TenantContext.isSystem();
        try {
            TenantContext.exitSystem();
            TenantContext.setWorkspace(workspaceId);
            body.run();
        } finally {
            restore(previous, previousSystem);
        }
    }

    /** Run {@code body} in the system/unfiltered escape hatch, restoring the previous context afterwards. */
    public static void runAsSystem(Runnable body) {
        callAsSystem(() -> {
            body.run();
            return null;
        });
    }

    /** As {@link #runAsSystem(Runnable)} but returns a value. */
    public static <T> T callAsSystem(Supplier<T> body) {
        String previous = TenantContext.getWorkspace();
        boolean previousSystem = TenantContext.isSystem();
        try {
            TenantContext.enterSystem();
            return body.get();
        } finally {
            restore(previous, previousSystem);
        }
    }

    private static void restore(String previousWorkspace, boolean previousSystem) {
        TenantContext.setWorkspace(previousWorkspace);
        if (previousSystem) {
            TenantContext.enterSystem();
        } else {
            TenantContext.exitSystem();
        }
    }
}
