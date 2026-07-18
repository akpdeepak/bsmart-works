package com.bcits.works.knowledge;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * KR-081: Converts an article to a PDF byte array using Apache PDFBox 3.x (Apache 2.0).
 * Rendering is purely text-based (no HTML renderer); each block type maps to a font size
 * and style. Multi-page support is handled by flushing the content stream and opening a
 * new page when the Y position drops below the bottom margin.
 */
@Component
public class ArticlePdfExporter {

    private static final float MARGIN_LEFT = 50f;
    private static final float MARGIN_TOP = 750f;
    private static final float MARGIN_BOTTOM = 60f;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth() - MARGIN_LEFT * 2;
    private static final int MAX_LINE_CHARS = 90;

    private final ObjectMapper mapper;

    public ArticlePdfExporter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    public byte[] export(String title, String contentBlocksJson) throws IOException {
        List<Map<String, Object>> blocks = parseBlocks(contentBlocksJson);

        try (PDDocument doc = new PDDocument()) {
            // Pre-create fonts once — PDType1Font(FontName) is a shared, lightweight object
            PDFont regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont mono = new PDType1Font(Standard14Fonts.FontName.COURIER);

            // Collect render instructions: (font, size, lineSpacing, text, isDivider)
            List<LineSpec> lines = new ArrayList<>();
            lines.add(new LineSpec(bold, 20, 30, safe(title), false));
            lines.add(new LineSpec(regular, 10, 8, "", false)); // spacer

            for (Map<String, Object> block : blocks) {
                String type = str(block, "type");
                String content = safe(str(block, "content"));

                switch (type) {
                    case "heading1" -> {
                        lines.add(new LineSpec(bold, 16, 6, "", false));
                        addWrapped(lines, bold, 16, 22, content);
                    }
                    case "heading2" -> {
                        lines.add(new LineSpec(bold, 13, 4, "", false));
                        addWrapped(lines, bold, 13, 19, content);
                    }
                    case "heading3" -> addWrapped(lines, bold, 11, 17, content);
                    case "code" -> addWrapped(lines, mono, 9, 13, content);
                    case "divider" -> lines.add(new LineSpec(regular, 10, 12, null, true));
                    case "quote" -> {
                        if (!content.isBlank()) {
                            addWrapped(lines, regular, 10, 14, "  | " + content);
                        }
                    }
                    case "callout" -> {
                        if (!content.isBlank()) {
                            addWrapped(lines, regular, 10, 14, "Note: " + content);
                        }
                    }
                    case "checklist" -> {
                        boolean checked = Boolean.TRUE.equals(metadata(block).get("checked"));
                        String prefix = checked ? "[x] " : "[ ] ";
                        if (!content.isBlank()) {
                            addWrapped(lines, regular, 10, 14, prefix + content);
                        }
                    }
                    default -> {
                        if (!content.isBlank()) {
                            addWrapped(lines, regular, 10, 14, content);
                        }
                    }
                }
                lines.add(new LineSpec(regular, 10, 4, "", false)); // paragraph gap
            }

            // Render lines across pages
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);
            float y = MARGIN_TOP;

            for (LineSpec spec : lines) {
                if (y < MARGIN_BOTTOM) {
                    cs.close();
                    PDPage nextPage = new PDPage(PDRectangle.A4);
                    doc.addPage(nextPage);
                    cs = new PDPageContentStream(doc, nextPage);
                    y = MARGIN_TOP;
                }

                if (spec.divider) {
                    cs.moveTo(MARGIN_LEFT, y);
                    cs.lineTo(MARGIN_LEFT + PAGE_WIDTH, y);
                    cs.stroke();
                    y -= spec.lineSpacing;
                    continue;
                }

                if (spec.text == null || spec.text.isBlank()) {
                    y -= spec.lineSpacing;
                    continue;
                }

                cs.beginText();
                cs.setFont(spec.font, spec.fontSize);
                cs.newLineAtOffset(MARGIN_LEFT, y);
                cs.showText(spec.text);
                cs.endText();
                y -= spec.lineSpacing;
            }

            cs.close();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Wrap long text into multiple LineSpec entries so text never clips the page margin. */
    private static void addWrapped(List<LineSpec> lines, PDFont font, float fontSize,
                                    float lineSpacing, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        // Simple char-count wrap — good enough for export quality
        int maxChars = MAX_LINE_CHARS;
        String remaining = text;
        while (remaining.length() > maxChars) {
            int split = remaining.lastIndexOf(' ', maxChars);
            if (split <= 0) {
                split = maxChars;
            }
            lines.add(new LineSpec(font, fontSize, lineSpacing, remaining.substring(0, split).trim(), false));
            remaining = remaining.substring(split).trim();
        }
        if (!remaining.isBlank()) {
            lines.add(new LineSpec(font, fontSize, lineSpacing, remaining, false));
        }
    }

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

    /** Strip control characters that PDF cannot encode with standard Type 1 fonts. */
    private static String safe(String s) {
        if (s == null) {
            return "";
        }
        return s.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
    }

    // ── Inner record ────────────────────────────────────────────────────────

    private static final class LineSpec {
        final PDFont font;
        final float fontSize;
        final float lineSpacing;
        final String text;
        final boolean divider;

        LineSpec(PDFont font, float fontSize, float lineSpacing, String text, boolean divider) {
            this.font = font;
            this.fontSize = fontSize;
            this.lineSpacing = lineSpacing;
            this.text = text;
            this.divider = divider;
        }
    }
}
