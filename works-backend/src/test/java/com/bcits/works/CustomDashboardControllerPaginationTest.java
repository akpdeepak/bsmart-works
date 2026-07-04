package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.ListPaging;
import com.bcits.works.shared.PageResponse;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pagination contract for {@code GET /api/v1/dashboards} (RB-10 §4): page/size honoured, size
 * capped, sort allow-listed, owner-vs-workspace scoping preserved (RB-40 §1).
 */
@Tag("unit")
class CustomDashboardControllerPaginationTest {

    private static final String CALLER = "user-A";
    private static final String WS = "ws-A";

    private final DashboardRepository dashboardRepository = mock(DashboardRepository.class);
    private final DashboardWidgetRepository widgetRepository = mock(DashboardWidgetRepository.class);
    private final DashboardLayoutService layoutService = mock(DashboardLayoutService.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final CustomDashboardController controller = new CustomDashboardController(
            dashboardRepository, widgetRepository, layoutService, eventService, authenticatedUser, rbac);

    CustomDashboardControllerPaginationTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(dashboardRepository.findByOwnerId(any(), any()))
                .thenReturn(new PageImpl<>(List.of(new Dashboard())));
        when(dashboardRepository.findByWorkspaceId(any(), any()))
                .thenReturn(new PageImpl<>(List.of(new Dashboard())));
    }

    @Test
    void list_pageAndSizeRespected_defaultSortIsUpdatedAtDesc() {
        controller.list(null, 3, 15, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(dashboardRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(3);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(15);
        assertThat(pageable.getValue().getSort().getOrderFor("updatedAt"))
                .isNotNull()
                .satisfies(o -> assertThat(o.getDirection()).isEqualTo(Sort.Direction.DESC));
    }

    @Test
    void list_sizeIsCappedAt200() {
        controller.list(null, 0, 999, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(dashboardRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(ListPaging.MAX_SIZE);
    }

    @Test
    void list_unknownSortFieldRejected() {
        assertThatThrownBy(() -> controller.list(null, 0, 50, "shareToken,asc"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(dashboardRepository, never()).findByOwnerId(any(), any());
    }

    @Test
    void list_envelopeReportsPageMetadata() {
        when(dashboardRepository.findByWorkspaceId(any(), any()))
                .thenReturn(new PageImpl<>(
                        List.of(new Dashboard(), new Dashboard(), new Dashboard(),
                                new Dashboard(), new Dashboard()),
                        PageRequest.of(0, 5), 7));

        PageResponse<Dashboard> body = controller.list(WS, 0, 5, null);

        assertThat(body.total()).isEqualTo(7);
        assertThat(body.page()).isZero();
        assertThat(body.size()).isEqualTo(5);
        assertThat(body.totalPages()).isEqualTo(2);
    }

    @Test
    void list_withWorkspaceUsesWorkspaceScopedQuery() {
        controller.list(WS, 0, 50, null);

        verify(dashboardRepository).findByWorkspaceId(eq(WS), any());
        verify(dashboardRepository, never()).findByOwnerId(any(), any());
    }

    @Test
    void list_withoutWorkspaceUsesOwnerScopedQuery() {
        controller.list(null, 0, 50, null);

        verify(dashboardRepository).findByOwnerId(eq(CALLER), any());
        verify(dashboardRepository, never()).findByWorkspaceId(any(), any());
    }
}
