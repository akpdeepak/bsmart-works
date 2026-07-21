package com.bcits.works.shared;

import org.hibernate.Filter;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves the central tenant-scope activator (RB-40 §1) turns the Hibernate {@code workspaceFilter}
 * on with the bound workspace, and off for the system/unfiltered escape hatch — without a database
 * (the Hibernate {@link Session} is mocked so this is a unit test that runs under {@code mvn test}).
 * The companion {@code WorkspaceFilterScopeIT} proves the end-to-end narrowing against real Postgres.
 */
@Tag("unit")
class WorkspaceFilterActivatorTest {

    private final WorkspaceFilterActivator activator = new WorkspaceFilterActivator();
    private final Session session = mock(Session.class);

    @AfterEach
    void cleanup() {
        TenantContext.clear();
    }

    @Test
    void boundWorkspace_enablesFilterWithThatWorkspace() {
        Filter filter = mock(Filter.class);
        when(session.getEnabledFilter(WorkspaceFilterActivator.FILTER_NAME)).thenReturn(null);
        when(session.enableFilter(WorkspaceFilterActivator.FILTER_NAME)).thenReturn(filter);

        TenantContext.setWorkspace("WS-1");
        activator.apply(session);

        verify(session).enableFilter(WorkspaceFilterActivator.FILTER_NAME);
        verify(filter).setParameter(WorkspaceFilterActivator.PARAM_NAME, "WS-1");
    }

    @Test
    void alreadyEnabledFilter_isReusedNotReEnabled() {
        Filter filter = mock(Filter.class);
        when(session.getEnabledFilter(WorkspaceFilterActivator.FILTER_NAME)).thenReturn(filter);

        TenantContext.setWorkspace("WS-9");
        activator.apply(session);

        verify(session, never()).enableFilter(eq(WorkspaceFilterActivator.FILTER_NAME));
        verify(filter).setParameter(WorkspaceFilterActivator.PARAM_NAME, "WS-9");
    }

    @Test
    void noWorkspaceBound_filterIsDisabled_dormantDefault() {
        when(session.getEnabledFilter(WorkspaceFilterActivator.FILTER_NAME)).thenReturn(mock(Filter.class));

        // No workspace set on the thread.
        activator.apply(session);

        verify(session).disableFilter(WorkspaceFilterActivator.FILTER_NAME);
        verify(session, never()).enableFilter(WorkspaceFilterActivator.FILTER_NAME);
    }

    @Test
    void systemEscapeHatch_disablesFilterEvenWhenWorkspaceBound() {
        when(session.getEnabledFilter(WorkspaceFilterActivator.FILTER_NAME)).thenReturn(mock(Filter.class));

        TenantContext.setWorkspace("WS-1");
        TenantScope.runAsSystem(() -> {
            // Inside the escape hatch the filter must be forced off, regardless of the binding.
            activator.apply(session);
        });

        verify(session).disableFilter(WorkspaceFilterActivator.FILTER_NAME);
        verify(session, never()).enableFilter(WorkspaceFilterActivator.FILTER_NAME);
    }
}
