package com.bcits.works;
import com.bcits.works.knowledge.ArticleDocxSerializer;
import com.bcits.works.knowledge.ArticlePdfExporter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * KR-081 / KR-082: Unit tests for article PDF and DOCX export.
 * No Spring context or database required — pure unit tests.
 */
@Tag("unit")
class ArticleExportTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ArticlePdfExporter pdfExporter = new ArticlePdfExporter(mapper);
    private final ArticleDocxSerializer docxSerializer = new ArticleDocxSerializer(mapper);

    // ── PDF tests ──────────────────────────────────────────────────────────

    @Test
    void exportPdf_sampleBlocks_returnsPdfBytes() throws Exception {
        String blocks = buildSampleBlocksJson();
        byte[] pdf = pdfExporter.export("Test Article", blocks);

        assertNotNull(pdf, "PDF bytes must not be null");
        assertTrue(pdf.length > 100, "PDF must contain real content (> 100 bytes)");
        // PDF files start with the %PDF- header
        assertTrue(pdf[0] == '%' && pdf[1] == 'P' && pdf[2] == 'D' && pdf[3] == 'F',
            "PDF must start with %%PDF- magic bytes");
    }

    @Test
    void exportPdf_nullTitle_doesNotThrow() throws Exception {
        byte[] pdf = pdfExporter.export(null, "[]");
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    @Test
    void exportPdf_emptyBlocks_returnsPdfWithTitleOnly() throws Exception {
        byte[] pdf = pdfExporter.export("Empty Article", null);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    @Test
    void exportPdf_dividerBlock_renderedWithoutException() throws Exception {
        String blocks = mapper.writeValueAsString(List.of(
            Map.of("type", "divider", "content", "")
        ));
        byte[] pdf = pdfExporter.export("Divider Test", blocks);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    @Test
    void exportPdf_checklistBlock_renderedWithoutException() throws Exception {
        String blocks = mapper.writeValueAsString(List.of(
            Map.of("type", "checklist", "content", "Task one", "metadata", Map.of("checked", true)),
            Map.of("type", "checklist", "content", "Task two", "metadata", Map.of("checked", false))
        ));
        byte[] pdf = pdfExporter.export("Checklist Test", blocks);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    @Test
    void exportPdf_longContent_wrapsWithoutException() throws Exception {
        String longText = "This is a very long paragraph that exceeds the maximum character count "
            + "per line to verify that the text wrapping logic in ArticlePdfExporter "
            + "handles long content correctly without throwing an exception or clipping.";
        String blocks = mapper.writeValueAsString(List.of(
            Map.of("type", "paragraph", "content", longText)
        ));
        byte[] pdf = pdfExporter.export("Wrap Test", blocks);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    // ── DOCX tests ─────────────────────────────────────────────────────────

    @Test
    void serializeDocx_sampleBlocks_returnsDocxBytes() throws Exception {
        String blocks = buildSampleBlocksJson();
        byte[] docx = docxSerializer.serialize("Test Article", blocks);

        assertNotNull(docx, "DOCX bytes must not be null");
        assertTrue(docx.length > 100, "DOCX must contain real content (> 100 bytes)");
        // DOCX is a ZIP — starts with PK\x03\x04
        assertTrue(docx[0] == 'P' && docx[1] == 'K',
            "DOCX must start with PK (ZIP) magic bytes");
    }

    @Test
    void serializeDocx_nullTitle_doesNotThrow() throws Exception {
        byte[] docx = docxSerializer.serialize(null, "[]");
        assertNotNull(docx);
        assertTrue(docx.length > 0);
    }

    @Test
    void serializeDocx_emptyBlocks_returnsDocxWithTitleOnly() throws Exception {
        byte[] docx = docxSerializer.serialize("Empty Article", null);
        assertNotNull(docx);
        assertTrue(docx.length > 0);
    }

    @Test
    void serializeDocx_dividerBlock_renderedWithoutException() throws Exception {
        String blocks = mapper.writeValueAsString(List.of(
            Map.of("type", "divider", "content", "")
        ));
        byte[] docx = docxSerializer.serialize("Divider Test", blocks);
        assertNotNull(docx);
        assertTrue(docx.length > 0);
    }

    @Test
    void serializeDocx_checklistBlock_renderedWithoutException() throws Exception {
        String blocks = mapper.writeValueAsString(List.of(
            Map.of("type", "checklist", "content", "Item one", "metadata", Map.of("checked", true)),
            Map.of("type", "checklist", "content", "Item two", "metadata", Map.of("checked", false))
        ));
        byte[] docx = docxSerializer.serialize("Checklist Test", blocks);
        assertNotNull(docx);
        assertTrue(docx.length > 0);
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    private String buildSampleBlocksJson() throws Exception {
        List<Map<String, Object>> blocks = List.of(
            Map.of("type", "heading1", "content", "Introduction"),
            Map.of("type", "paragraph", "content", "This is a paragraph."),
            Map.of("type", "heading2", "content", "Section Two"),
            Map.of("type", "quote", "content", "A blockquote here."),
            Map.of("type", "callout", "content", "Important note."),
            Map.of("type", "code", "content", "System.out.println(\"hello\");"),
            Map.of("type", "heading3", "content", "Sub-section"),
            Map.of("type", "divider", "content", ""),
            Map.of("type", "paragraph", "content", "Final paragraph.")
        );
        return mapper.writeValueAsString(blocks);
    }
}
