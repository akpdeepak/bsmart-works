package com.bcits.works.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.function.Supplier;

/**
 * Safe helpers for binding / suspending the central tenant scope (RB-40 §1). Prefer these over
 * touching {@link TenantContext} directly: they always restore the previous state in a {@code finally}
 * block, so a thrown exception or a thread reused from a pool can never leak a workspace binding into
 * the next piece of work.
 *
 * <h2>Escape hatch</h2>
 * {@link #systemUnscoped(Supplier)} / {@link #runAsSystem(Runnable)} / {@link #callAsSystem(Supplier)}
 * are the explicit, documented "system / unfiltered" path for legitimate cross-workspace work —
 * schedulers, the public share-token dashboard, SCIM, login/signup (no workspace yet), and admin
 * operations that iterate every workspace (see the escape-hatch inventory in
 * {@code docs/implementation/epics/EPIC-P1-243-central-tenant-filter.md}). Inside them the central
 * {@code workspaceFilter} is forced off; outside them, once a workspace is bound, every
 * filtered-entity JPA read is narrowed to that workspace automatically.
 *
 * <p><b>Why {@code systemUnscoped} actively toggles the session.</b> Flipping the
 * {@link TenantContext} thread-local is not enough on its own: code that enters the hatch may already
 * be inside a request whose Hibernate session has the filter <i>enabled</i> (a controller bound a
 * workspace earlier). So {@link #systemUnscoped(Supplier)} also calls
 * {@link WorkspaceFilterActivator#disableForCurrentSession()} on entry to physically disable the
 * filter on the live session, and re-syncs the session on exit so the previous scope is restored.
 * This guarantee is what the cross-tenant schedulers and public/token paths rely on.
 */
public final class TenantScope {

    private static final Logger log = LoggerFactory.getLogger(TenantScope.class);

    /**
     * Static handle to the per-session filter toggler, injected once at startup by
     * {@link TenantScopeBootstrap}. Null in plain unit tests that never start Spring — in that case
     * {@link #systemUnscoped(Supplier)} degrades to thread-local-only behaviour (still correct,
     * because with no live Hibernate session there is nothing to physically disable).
     */
    private static volatile WorkspaceFilterActivator activator;

    private TenantScope() {
    }

    /** Wired once by {@link TenantScopeBootstrap}; package-visible for the same-package test. */
    static void setActivator(WorkspaceFilterActivator activator) {
        TenantScope.activator = activator;
    }

    /** Run {@code body} scoped to {@code workspaceId}, restoring the previous context afterwards. */
    public static void runScoped(String workspaceId, Runnable body) {
        String previous = TenantContext.getWorkspace();
        boolean previousSystem = TenantContext.isSystem();
        try {
            TenantContext.exitSystem();
            TenantContext.setWorkspace(workspaceId);
            syncSession();
            body.run();
        } finally {
            restore(previous, previousSystem);
        }
    }

    /**
     * The canonical system / unscoped escape hatch (EPIC #243 §3.4). Runs {@code body} with the
     * central tenant filter <b>reliably disabled</b> for its duration — both the {@link TenantContext}
     * decision and the physical filter on the current Hibernate session — and restores the previous
     * scope afterwards, even on exception. Writes one audit log line so an unscoped read is never
     * silent.
     */
    public static <T> T systemUnscoped(Supplier<T> body) {
        String previous = TenantContext.getWorkspace();
        boolean previousSystem = TenantContext.isSystem();
        log.info("tenant-filter: entering systemUnscoped escape hatch "
                + "(previousWorkspace={}, previouslySystem={}) — central workspace filter DISABLED for this block",
                previous, previousSystem);
        try {
            TenantContext.enterSystem();
            // Physically disable the filter on any already-open session, not just the thread-local.
            disableSession();
            return body.get();
        } finally {
            restore(previous, previousSystem);
            log.debug("tenant-filter: exited systemUnscoped escape hatch — scope restored "
                    + "(workspace={}, system={})", previous, previousSystem);
        }
    }

    /** {@code void} convenience over {@link #systemUnscoped(Supplier)}. */
    public static void systemUnscoped(Runnable body) {
        systemUnscoped(() -> {
            body.run();
            return null;
        });
    }

    /** Run {@code body} in the system/unfiltered escape hatch, restoring the previous context afterwards. */
    public static void runAsSystem(Runnable body) {
        systemUnscoped(body);
    }

    /** As {@link #runAsSystem(Runnable)} but returns a value. Alias of {@link #systemUnscoped(Supplier)}. */
    public static <T> T callAsSystem(Supplier<T> body) {
        return systemUnscoped(body);
    }

    private static void restore(String previousWorkspace, boolean previousSystem) {
        TenantContext.setWorkspace(previousWorkspace);
        if (previousSystem) {
            TenantContext.enterSystem();
        } else {
            TenantContext.exitSystem();
        }
        // Re-assert the physical session filter to match the restored TenantContext decision.
        syncSession();
    }

    private static void syncSession() {
        WorkspaceFilterActivator a = activator;
        if (a != null) {
            a.syncCurrentSession();
        }
    }

    private static void disableSession() {
        WorkspaceFilterActivator a = activator;
        if (a != null) {
            a.disableForCurrentSession();
        }
    }
}
