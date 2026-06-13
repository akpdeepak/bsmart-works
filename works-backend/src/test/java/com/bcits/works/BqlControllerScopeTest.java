package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tenant-scope tests for the BQL executor (RB-40 §1, RB-10 §6, RB-05 Stage 3).
 *
 * <p>BQL must be workspace-scoped at compilation: a query — even an empty one — can only ever see
 * work items whose project lives in the caller's workspace, and the caller must hold {@code
 * view_items}. Before the fix, {@code /bql/execute} ran {@code FROM work_items WHERE deleted_at IS
 * NULL} with no workspace predicate, leaking up to 500 rows across every tenant.
 */
@Tag("unit")
class BqlControllerScopeTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS = "ws-A";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BqlCompiler compiler = new BqlCompiler(); // real, pure
    private final BqlFilterRepository filterRepo = mock(BqlFilterRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final BqlController controller =
            new BqlController(jdbc, compiler, filterRepo, authenticatedUser, rbac);

    BqlControllerScopeTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(jdbc.queryForObject(contains("FROM users"), eq(String.class), any()))
                .thenReturn(OWN_WS);
    }

    @Test
    void execute_withoutViewItems_isForbidden_beforeAnyQuery() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, OWN_WS, "view_items");

        assertThatThrownBy(() -> controller.execute(Map.of("query", "status = Done")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).queryForList(anyString(), any(Object[].class));
    }

    @Test
    void execute_emptyQuery_isWorkspaceScoped() {
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        when(jdbc.queryForList(sql.capture(), any(Object[].class))).thenReturn(List.of());

        controller.execute(Map.of("query", ""));

        assertThat(sql.getValue()).contains("project_id IN (SELECT id FROM projects WHERE workspace_id = ?)");
        verify(rbac).require(CALLER, OWN_WS, "view_items");
    }

    @Test
    void execute_withFilter_keepsWorkspaceScopeAndBindsWorkspaceFirst() {
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        when(jdbc.queryForList(sql.capture(), params.capture())).thenReturn(List.of());

        controller.execute(Map.of("query", "status = Done"));

        assertThat(sql.getValue()).contains("project_id IN (SELECT id FROM projects WHERE workspace_id = ?)");
        assertThat(params.getValue()[0]).isEqualTo(OWN_WS); // workspace bound ahead of BQL params
        assertThat(params.getValue()).contains("Done");
    }
}
