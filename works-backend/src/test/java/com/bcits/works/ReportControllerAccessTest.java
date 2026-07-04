package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for ReportController (RB-40 §1, RB-05 Stage 3).
 * Report carries workspaceId directly (Pattern B).
 * A caller whose workspace differs is denied with FORBIDDEN (403) before any mutation runs.
 */
@Tag("unit")
class ReportControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final ReportRepository reportRepository = mock(ReportRepository.class);
    private final ReportService reportService = mock(ReportService.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ReportController controller = new ReportController(
            reportRepository, reportService, eventService, authenticatedUser, rbac);

    ReportControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private Report reportInForeignWorkspace() {
        Report r = new Report();
        r.setId("RPT-1");
        r.setWorkspaceId(FOREIGN_WS);
        r.setName("Foreign report");
        return r;
    }

    @Test
    void get_crossTenantReturnsForbidden() {
        when(reportRepository.findById("RPT-1")).thenReturn(Optional.of(reportInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("RPT-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(reportRepository.findById("RPT-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("RPT-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsForbidden() {
        when(reportRepository.findById("RPT-1")).thenReturn(Optional.of(reportInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("RPT-1", new Report()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(reportRepository, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(reportRepository.findById("RPT-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("RPT-missing", new Report()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void delete_crossTenantReturnsForbidden() {
        when(reportRepository.findById("RPT-1")).thenReturn(Optional.of(reportInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("RPT-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(reportRepository, never()).deleteById(any());
    }
}
