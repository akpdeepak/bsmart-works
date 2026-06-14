package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Renderer + scoping coverage for {@link ExportService}. The data query is mocked, so this proves:
 * (1) the workspace predicate is bound (tenant scope, RB-40 §1), and (2) each format emits a
 * well-formed file (correct magic bytes / OOXML structure) with the right content type + filename.
 */
@Tag("unit")
class ExportServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ExportService service = new ExportService(jdbc);

    private static List<Map<String, Object>> sampleRows() {
        Map<String, Object> r1 = new LinkedHashMap<>();
        r1.put("id", "WI-1");
        r1.put("title", "Fix login & <redirect>");
        r1.put("type", "BUG");
        r1.put("status", "Open");
        r1.put("priority", "HIGH");
        r1.put("assignee_id", "USR-1");
        r1.put("due_date", "2026-07-01");
        return List.of(r1);
    }

    private void stubRows(List<Map<String, Object>> rows) {
        when(jdbc.queryForList(anyString(), eq("ws-A"))).thenReturn(rows);
    }

    @Test
    void render_bindsWorkspaceId_asScopePredicate() {
        stubRows(sampleRows());
        service.render("ws-A", "Report", ExportService.Format.XLSX);
        // The single bind param is the workspaceId, and the SQL carries the workspace scope predicate.
        verify(jdbc).queryForList(
            org.mockito.ArgumentMatchers.contains("workspace_id = ?"), eq("ws-A"));
    }

    @Test
    void pdf_hasPdfMagicAndContentType() {
        stubRows(sampleRows());
        ExportService.Export out = service.render("ws-A", "Q3 Status", ExportService.Format.PDF);
        assertThat(out.contentType()).isEqualTo("application/pdf");
        assertThat(out.filename()).isEqualTo("q3-status.pdf");
        String head = new String(out.body(), 0, 5, StandardCharsets.ISO_8859_1);
        assertThat(head).isEqualTo("%PDF-");
        assertThat(new String(out.body(), StandardCharsets.ISO_8859_1)).endsWith("%%EOF");
    }

    @Test
    void xlsx_isAZipWithContentType() {
        stubRows(sampleRows());
        ExportService.Export out = service.render("ws-A", "Delivery", ExportService.Format.XLSX);
        assertThat(out.contentType())
            .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assertThat(out.filename()).isEqualTo("delivery.xlsx");
        // ZIP local-file-header magic "PK\003\004".
        byte[] b = out.body();
        assertThat(b[0]).isEqualTo((byte) 'P');
        assertThat(b[1]).isEqualTo((byte) 'K');
        assertThat(b[2]).isEqualTo((byte) 3);
        assertThat(b[3]).isEqualTo((byte) 4);
    }

    @Test
    void png_hasPngSignatureAndContentType() {
        stubRows(sampleRows());
        ExportService.Export out = service.render("ws-A", "Board", ExportService.Format.PNG);
        assertThat(out.contentType()).isEqualTo("image/png");
        assertThat(out.filename()).isEqualTo("board.png");
        byte[] b = out.body();
        // PNG 8-byte signature.
        assertThat(b[0] & 0xFF).isEqualTo(0x89);
        assertThat(b[1]).isEqualTo((byte) 'P');
        assertThat(b[2]).isEqualTo((byte) 'N');
        assertThat(b[3]).isEqualTo((byte) 'G');
    }

    @Test
    void emptyTitle_fallsBackToExportSlug() {
        stubRows(sampleRows());
        ExportService.Export out = service.render("ws-A", "   ", ExportService.Format.PDF);
        assertThat(out.filename()).isEqualTo("export.pdf");
    }

    @Test
    void format_parse_rejectsUnknown() {
        assertThatThrownBy(() -> ExportService.Format.parse("docx"))
            .isInstanceOf(ApiException.class);
        assertThat(ExportService.Format.parse("excel")).isEqualTo(ExportService.Format.XLSX);
        assertThat(ExportService.Format.parse("PDF")).isEqualTo(ExportService.Format.PDF);
    }
}
