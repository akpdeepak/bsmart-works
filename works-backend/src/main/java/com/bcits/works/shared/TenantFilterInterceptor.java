package com.bcits.works.shared;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * The single Spring component that enables the central Hibernate {@code workspaceFilter} once per
 * request, from the workspace currently bound in {@link TenantContext} (RB-40 §1, #243).
 *
 * <p>This is the component referenced (but previously missing) by {@link WorkspaceFilterActivator}'s
 * Javadoc. It runs as a Spring MVC {@link HandlerInterceptor} registered by {@link TenantFilterConfig}.
 *
 * <h2>Why an interceptor and not the servlet filter</h2>
 * The workspace is <b>not</b> known at servlet-filter time: a user may belong to several workspaces,
 * so the request's workspace is resolved and authorised <i>inside</i> the controller/service the
 * usual way and bound via {@link CurrentWorkspace#bind(String)} (which already syncs the session at
 * the moment of binding). This interceptor provides the single, declared, central point that syncs
 * the Hibernate session to {@link TenantContext} at well-defined request boundaries:
 *
 * <ul>
 *   <li><b>{@link #preHandle}</b> — runs after the JWT auth filter and after Spring has opened the
 *       Open-Session-In-View session, but before the controller. If a prior request on this pooled
 *       thread (or any earlier code) left the session's filter state inconsistent with the current
 *       {@link TenantContext}, this re-asserts it. It is idempotent and safe when no workspace is
 *       bound (the filter simply stays off — the dormant default).</li>
 *   <li><b>{@link #afterCompletion}</b> — defensively disables the filter at the end of handling.
 *       The authoritative thread-local cleanup is still {@link TenantContextCleanupFilter} (it clears
 *       {@link TenantContext} in a {@code finally} so a pooled thread never leaks a binding); this is
 *       belt-and-braces on the Hibernate session itself.</li>
 * </ul>
 *
 * <p>It delegates all session manipulation to {@link WorkspaceFilterActivator} so that the
 * enable/disable logic — and the {@link TenantContext} decision of when the filter is active — lives
 * in exactly one place.
 */
@Component
public class TenantFilterInterceptor implements HandlerInterceptor {

    private final WorkspaceFilterActivator activator;

    public TenantFilterInterceptor(WorkspaceFilterActivator activator) {
        this.activator = activator;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Sync the current Hibernate session to whatever TenantContext holds right now (typically
        // nothing yet — the controller binds the workspace). Safe + idempotent on a request with no
        // DB session and on a request with no workspace bound.
        activator.syncCurrentSession();
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // Belt-and-braces: make sure the filter is not left enabled on the session. The thread-local
        // itself is cleared by TenantContextCleanupFilter; this guards the Hibernate session.
        activator.disableForCurrentSession();
    }
}
