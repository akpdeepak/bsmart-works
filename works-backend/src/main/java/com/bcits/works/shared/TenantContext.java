package com.bcits.works.shared;

/**
 * Request-scoped holder for the current tenant (workspace) and the system/unfiltered escape hatch
 * (RB-40 §1: "scoping applied centrally, not re-typed per query, so it cannot be forgotten").
 *
 * <p>This is the single source of truth the central Hibernate {@code workspaceFilter}
 * ({@link WorkspaceFilterActivator}) reads from. It is a {@link ThreadLocal} because the app is
 * stateless and one request is served on one thread (Spring MVC); nothing persists between requests.
 *
 * <h2>Three states</h2>
 * <ul>
 *   <li><b>Unset (default)</b> — no workspace bound. The central filter stays <b>off</b>, so behaviour
 *       is byte-for-byte identical to before this layer existed. Existing explicit per-query scoping
 *       (the {@code findByWorkspaceId...} methods, the hand-written predicates) is unchanged and still
 *       in force. This is why the layer is <b>additive and dormant by default</b>: nothing regresses.</li>
 *   <li><b>Scoped to a workspace</b> — {@link #setWorkspace(String)}. The filter, where enabled by
 *       {@link WorkspaceFilterActivator}, adds an <b>extra {@code AND workspace_id = :ws}</b> predicate
 *       to filtered-entity reads. It can only ever <i>narrow</i> a result set, never widen one, so it is
 *       compatible with — and defence-in-depth on top of — the explicit scoping already in place.</li>
 *   <li><b>System / unfiltered</b> — {@link #enterSystem()}. The explicit escape hatch for legitimate
 *       cross-workspace work: schedulers, the public share-token dashboard, SCIM, login/signup
 *       (no workspace yet), and admin operations that iterate every workspace. The filter is forced
 *       off for the duration. Use {@link TenantScope#runAsSystem(Runnable)} rather than calling this
 *       directly so the context is always cleared.</li>
 * </ul>
 *
 * <p><b>Boundary:</b> the Hibernate filter only governs JPA/Hibernate reads of filtered entities.
 * Native {@code JdbcTemplate} SQL is <b>not</b> covered (Hibernate never sees it); those paths keep
 * their existing per-query predicates and the guardrail tripwire. This holder does not change
 * that boundary.
 */
public final class TenantContext {

    private static final ThreadLocal<String> WORKSPACE = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> SYSTEM = ThreadLocal.withInitial(() -> Boolean.FALSE);

    private TenantContext() {
    }

    /** Bind the current workspace for this thread. Passing {@code null}/blank clears the binding. */
    public static void setWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            WORKSPACE.remove();
        } else {
            WORKSPACE.set(workspaceId);
        }
    }

    /** The workspace bound to this thread, or {@code null} if none (filter stays off). */
    public static String getWorkspace() {
        return WORKSPACE.get();
    }

    /** Whether a workspace is currently bound. */
    public static boolean hasWorkspace() {
        return WORKSPACE.get() != null;
    }

    /** Enter the system/unfiltered escape hatch — the central filter is forced off. */
    public static void enterSystem() {
        SYSTEM.set(Boolean.TRUE);
    }

    /** Leave the system/unfiltered escape hatch. */
    public static void exitSystem() {
        SYSTEM.set(Boolean.FALSE);
    }

    /** Whether the current thread is running in the system/unfiltered context. */
    public static boolean isSystem() {
        return Boolean.TRUE.equals(SYSTEM.get());
    }

    /**
     * The central filter is active only when a workspace is bound and we are <b>not</b> in the
     * system context. Unset workspace ⇒ off (dormant default); system context ⇒ off (escape hatch).
     */
    public static boolean isFilterActive() {
        return !isSystem() && hasWorkspace();
    }

    /** Clear all tenant state for this thread. Always called at the end of a request / scoped block. */
    public static void clear() {
        WORKSPACE.remove();
        SYSTEM.remove();
    }
}
