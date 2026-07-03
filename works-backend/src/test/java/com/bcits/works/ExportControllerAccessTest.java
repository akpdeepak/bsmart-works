package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.NoSuchElementException;
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
 * Cross-tenant + authorization tests for the static export endpoints (RB-40 §1, RB-05 Stage 3).
 *
 * <p>The {@code workspaceId} is read from the persisted report/dashboard (never a request param),
 * membership is proven with {@code view_items} before any render, and the file carries the right
 * content type + {@code Content-Disposition}. A non-member is denied 403 <i>before</i> the export
 * runs; an unknown id is 404; an unknown format is 400.
 */
@Tag("unit")
class ExportControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final ReportRepository reportRepository = mock(ReportRepository.class);
    private final DashboardRepository dashboardRepository = mock(DashboardRepository.class);
    private final ExportService exportService = mock(ExportService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ExportController controller = new ExportController(
            reportRepository, dashboardRepository, exportService, authenticatedUser, rbac);

    ExportControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // Member of own workspace, NOT the foreign one.
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private static Report report(String id, String ws) {
        Report r = new Report();
        r.setId(id);
        r.setWorkspaceId(ws);
        r.setName("Q3 status");
        return r;
    }

    private static Dashboard dashboard(String id, String ws) {
        Dashboard d = new Dashboard();
        d.setId(id);
        d.setWorkspaceId(ws);
        d.setName("Delivery");
        return d;
    }

    @Test
    void report_pdf_inOwnWorkspace_returnsFileWithContentTypeAndDisposition() {
        when(reportRepository.findById("RPT-1")).thenReturn(Optional.of(report("RPT-1", OWN_WS)));
        when(exportService.render(eq(OWN_WS), eq("Q3 status"), eq(ExportService.Format.PDF)))
            .thenReturn(new ExportService.Export(new byte[] {1, 2, 3}, "application/pdf", "q3-status.pdf"));

        ResponseEntity<byte[]> res = controller.exportReport("RPT-1", "pdf");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
        assertThat(res.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"q3-status.pdf\"");
        assertThat(res.getBody()).containsExactly(1, 2, 3);
        verify(rbac).require(CALLER, OWN_WS, PERM);
    }

    @Test
    void dashboard_xlsx_inOwnWorkspace_returnsSpreadsheetContentType() {
        when(dashboardRepository.findById("DSH-1")).thenReturn(Optional.of(dashboard("DSH-1", OWN_WS)));
        String xlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        when(exportService.render(eq(OWN_WS), eq("Delivery"), eq(ExportService.Format.XLSX)))
            .thenReturn(new ExportService.Export(new byte[] {9}, xlsxType, "delivery.xlsx"));

        ResponseEntity<byte[]> res = controller.exportDashboard("DSH-1", "xlsx");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getHeaders().getContentType()).isEqualTo(MediaType.parseMediaType(xlsxType));
        verify(rbac).require(CALLER, OWN_WS, PERM);
    }

    @Test
    void report_inForeignWorkspace_isForbidden_beforeRender() {
        when(reportRepository.findById("RPT-x")).thenReturn(Optional.of(report("RPT-x", FOREIGN_WS)));

        assertThatThrownBy(() -> controller.exportReport("RPT-x", "pdf"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(exportService, never()).render(any(), any(), any());
    }

    @Test
    void dashboard_inForeignWorkspace_isForbidden_beforeRender() {
        when(dashboardRepository.findById("DSH-x")).thenReturn(Optional.of(dashboard("DSH-x", FOREIGN_WS)));

        assertThatThrownBy(() -> controller.exportDashboard("DSH-x", "png"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(exportService, never()).render(any(), any(), any());
    }

    @Test
    void report_unknownId_isNotFound() {
        when(reportRepository.findById("RPT-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.exportReport("RPT-missing", "pdf"))
            .isInstanceOf(NoSuchElementException.class); // → 404 via GlobalExceptionHandler

        verify(exportService, never()).render(any(), any(), any());
    }

    @Test
    void dashboard_unknownId_isNotFound() {
        when(dashboardRepository.findById("DSH-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.exportDashboard("DSH-missing", "xlsx"))
            .isInstanceOf(NoSuchElementException.class);

        verify(exportService, never()).render(any(), any(), any());
    }

    @Test
    void unknownFormat_isBadRequest() {
        when(reportRepository.findById("RPT-1")).thenReturn(Optional.of(report("RPT-1", OWN_WS)));

        assertThatThrownBy(() -> controller.exportReport("RPT-1", "docx"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(exportService, never()).render(any(), any(), any());
    }
}
