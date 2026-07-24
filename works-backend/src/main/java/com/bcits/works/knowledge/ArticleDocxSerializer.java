package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xwpf.usermodel.Borders;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

/**
 * KR-082: Converts an article's block content to a DOCX byte array using Apache POI 5.x
 * (Apache 2.0). Each block type maps to a styled paragraph; heading levels use font-size
 * + bold rather than named styles to avoid "style not found" failures in blank documents.
 */
@Component
public class ArticleDocxSerializer {

    private final ObjectMapper mapper;

    public ArticleDocxSerializer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    public byte[] serialize(String title, String contentBlocksJson) throws Exception {
        List<Map<String, Object>> blocks = parseBlocks(contentBlocksJson);

        try (XWPFDocument doc = new XWPFDocument()) {
            // Title
            addStyledParagraph(doc, title != null ? title : "Article", "HELVETICA", 24, true, false, 0);
            addSpacer(doc);

            for (Map<String, Object> block : blocks) {
                String type = str(block, "type");
                String content = str(block, "content");

                switch (type) {
                    case "heading1" -> addStyledParagraph(doc, content, null, 18, true, false, 0);
                    case "heading2" -> addStyledParagraph(doc, content, null, 15, true, false, 0);
                    case "heading3" -> addStyledParagraph(doc, content, null, 13, true, false, 0);
                    case "paragraph" -> {
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, content, null, 11, false, false, 0);
                        }
                    }
                    case "quote" -> {
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, content, null, 11, false, true, 720);
                        }
                    }
                    case "callout" -> {
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, "Note: " + content, null, 11, false, false, 0);
                        }
                    }
                    case "code" -> {
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, content, "Courier New", 10, false, false, 0);
                        }
                    }
                    case "divider" -> addDivider(doc);
                    case "checklist" -> {
                        boolean checked = Boolean.TRUE.equals(metadata(block).get("checked"));
                        String prefix = checked ? "☑ " : "☐ ";
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, prefix + content, null, 11, false, false, 0);
                        }
                    }
                    default -> {
                        if (!content.isBlank()) {
                            addStyledParagraph(doc, content, null, 11, false, false, 0);
                        }
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    // ── Paragraph builders ───────────────────────────────────────────────────

    /**
     * Add a paragraph with explicit font attributes instead of named styles.
     * Named styles ("Heading1" etc.) are absent from blank XWPFDocument instances
     * and would silently produce unstyled output — using run attributes is safer.
     *
     * @param fontFamily  null → default (Calibri-like); non-null → exact family
     * @param fontSize    points (half-points are set internally by POI)
     * @param bold        whether the run is bold
     * @param italic      whether the run is italic
     * @param indentLeft  left indent in twentieths-of-a-point (720 = 0.5 inch)
     */
    private static void addStyledParagraph(XWPFDocument doc, String text,
                                            String fontFamily, int fontSize,
                                            boolean bold, boolean italic, int indentLeft) {
        XWPFParagraph p = doc.createParagraph();
        if (indentLeft > 0) {
            p.setIndentationLeft(indentLeft);
        }
        XWPFRun run = p.createRun();
        run.setText(text != null ? text : "");
        run.setBold(bold);
        run.setItalic(italic);
        run.setFontSize(fontSize);
        if (fontFamily != null) {
            run.setFontFamily(fontFamily);
        }
    }

    /** Single-line blank paragraph for visual breathing room after the title. */
    private static void addSpacer(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        XWPFRun run = p.createRun();
        run.setText("");
        run.setFontSize(6);
    }

    /**
     * Horizontal rule via POI's paragraph border API (no raw XML required).
     * A bottom border on a blank paragraph renders as a horizontal line.
     */
    private static void addDivider(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setBorderBottom(Borders.SINGLE);
        XWPFRun run = p.createRun();
        run.setText("");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> metadata(Map<String, Object> block) {
        Object m = block.get("metadata");
        if (m instanceof Map<?, ?> mp) {
            return (Map<String, Object>) mp;
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseBlocks(String json) {
        try {
            return mapper.readValue(
                json == null || json.isBlank() ? "[]" : json,
                new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private static String str(Map<String, Object> m, String k) {
        Object v = m == null ? null : m.get(k);
        return v == null ? "" : v.toString();
    }
}
