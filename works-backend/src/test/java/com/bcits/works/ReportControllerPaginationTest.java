package com.bcits.works;

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
 * Pagination contract for {@code GET /api/v1/reports} (RB-10 §4): page/size honoured, size capped,
 * sort allow-listed, and the existing workspace-vs-owner scoping + RBAC preserved (RB-40 §1).
 */
@Tag("unit")
class ReportControllerPaginationTest {

    private static final String CALLER = "user-A";
    private static final String WS = "ws-A";

    private final ReportRepository reportRepository = mock(ReportRepository.class);
    private final ReportService reportService = mock(ReportService.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ReportController controller = new ReportController(
            reportRepository, reportService, eventService, authenticatedUser, rbac);

    ReportControllerPaginationTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(reportRepository.findByOwnerId(any(), any()))
                .thenReturn(new PageImpl<>(List.of(new Report())));
        when(reportRepository.findByWorkspaceId(any(), any()))
                .thenReturn(new PageImpl<>(List.of(new Report())));
    }

    @Test
    void list_pageAndSizeRespected_defaultSortIsUpdatedAtDesc() {
        controller.list(null, 2, 25, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reportRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(25);
        assertThat(pageable.getValue().getSort().getOrderFor("updatedAt"))
                .isNotNull()
                .satisfies(o -> assertThat(o.getDirection()).isEqualTo(Sort.Direction.DESC));
    }

    @Test
    void list_sizeIsCappedAt200() {
        controller.list(null, 0, 5000, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reportRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(ListPaging.MAX_SIZE);
    }

    @Test
    void list_negativePageFlooredToZero() {
        controller.list(null, -3, 50, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reportRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
    }

    @Test
    void list_explicitAscSortHonoured() {
        controller.list(null, 0, 50, "name,asc");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(reportRepository).findByOwnerId(eq(CALLER), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("name"))
                .isNotNull()
                .satisfies(o -> assertThat(o.getDirection()).isEqualTo(Sort.Direction.ASC));
    }

    @Test
    void list_unknownSortFieldRejected() {
        assertThatThrownBy(() -> controller.list(null, 0, 50, "ssn,asc"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(reportRepository, never()).findByOwnerId(any(), any());
    }

    @Test
    void list_envelopeReportsPageMetadata() {
        when(reportRepository.findByOwnerId(any(), any()))
                .thenReturn(new PageImpl<>(List.of(new Report(), new Report()),
                        PageRequest.of(1, 10), 35));

        PageResponse<Report> body = controller.list(null, 1, 10, null);

        assertThat(body.items()).hasSize(2);
        assertThat(body.total()).isEqualTo(35);
        assertThat(body.page()).isEqualTo(1);
        assertThat(body.size()).isEqualTo(10);
        assertThat(body.totalPages()).isEqualTo(4);
    }

    @Test
    void list_withWorkspaceUsesWorkspaceScopedQuery() {
        controller.list(WS, 0, 50, null);

        verify(reportRepository).findByWorkspaceId(eq(WS), any());
        verify(reportRepository, never()).findByOwnerId(any(), any());
    }

    @Test
    void list_withoutWorkspaceUsesOwnerScopedQuery() {
        controller.list(null, 0, 50, null);

        verify(reportRepository).findByOwnerId(eq(CALLER), any());
        verify(reportRepository, never()).findByWorkspaceId(any(), any());
    }
}
