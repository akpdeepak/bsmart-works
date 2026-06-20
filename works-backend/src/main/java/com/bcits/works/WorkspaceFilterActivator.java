package com.bcits.works;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

/**
 * Turns the central Hibernate {@code workspaceFilter} on or off on the current Hibernate
 * {@link Session} to match {@link TenantContext} (RB-40 §1: "scoping applied centrally, not re-typed
 * per query"). The canonical {@code @FilterDef} is declared once at package scope (see
 * {@code package-info.java}); workspace-owned entities then apply it with {@code @Filter} (see
 * {@link Project}). This component is the single place that decides <i>when</i> it is enabled, so
 * scoping cannot be forgotten on an individual query.
 *
 * <h2>Semantics (additive, never widening)</h2>
 * When {@link TenantContext#isFilterActive()} is true (a workspace is bound and we are not in the
 * system escape hatch), the filter adds {@code AND workspace_id = :workspaceId} to reads of filtered
 * entities. This is defence-in-depth <i>on top of</i> the explicit per-query scoping the code already
 * has — it can only narrow a result set to the bound workspace, never widen one. When no workspace is
 * bound, or the thread is in the system context, the filter is disabled and behaviour is identical to
 * before this layer existed.
 *
 * <h2>Where it is applied</h2>
 * {@link #syncCurrentSession()} is invoked by {@link TenantFilterInterceptor} once per request, after
 * the controller-resolved workspace (if any) has been bound to {@link TenantContext}. It is safe to
 * call repeatedly and on a request with no session.
 */
@Component
public class WorkspaceFilterActivator {

    /** Filter name declared in {@code @FilterDef} on the workspace-owned entities. */
    public static final String FILTER_NAME = "workspaceFilter";
    /** Parameter name inside the filter condition {@code workspace_id = :workspaceId}. */
    public static final String PARAM_NAME = "workspaceId";

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Enable or disable the filter on the current Hibernate session to match {@link TenantContext}.
     * No-op if there is no active session (e.g. a request that never touches the DB).
     */
    public void syncCurrentSession() {
        Session session = currentSessionOrNull();
        if (session == null) {
            return;
        }
        apply(session);
    }

    /**
     * Force the central filter <b>off</b> on the current Hibernate session, regardless of
     * {@link TenantContext}. Used by the {@link TenantScope} system escape hatch (which must read
     * across tenants) and defensively by {@link TenantFilterInterceptor} at request completion.
     * No-op if there is no active session.
     */
    public void disableForCurrentSession() {
        Session session = currentSessionOrNull();
        if (session == null) {
            return;
        }
        if (session.getEnabledFilter(FILTER_NAME) != null) {
            session.disableFilter(FILTER_NAME);
        }
    }

    /** Apply the {@link TenantContext} decision to a specific session. Visible for testing. */
    void apply(Session session) {
        if (TenantContext.isFilterActive()) {
            Filter filter = session.getEnabledFilter(FILTER_NAME);
            if (filter == null) {
                filter = session.enableFilter(FILTER_NAME);
            }
            filter.setParameter(PARAM_NAME, TenantContext.getWorkspace());
        } else {
            // No workspace bound, or system/unfiltered escape hatch → make sure the filter is off.
            if (session.getEnabledFilter(FILTER_NAME) != null) {
                session.disableFilter(FILTER_NAME);
            }
        }
    }

    private Session currentSessionOrNull() {
        try {
            if (entityManager == null) {
                return null;
            }
            return entityManager.unwrap(Session.class);
        } catch (RuntimeException ex) {
            // No EntityManager bound to this thread (e.g. outside a transaction / OSIV scope).
            return null;
        }
    }
}
