package com.bcits.works;

import com.bcits.works.shared.ApiException;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.imageio.ImageIO;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Server-side static export of dashboards and reports for stakeholders without Works access
 * (Cap J, spec {@code 06 §J}). One service, three dependency-free renderers — PDF, Excel (.xlsx)
 * and PNG — all driven from a single workspace-scoped data table.
 *
 * <p><b>Tenant isolation (RB-40 §1).</b> Every export pulls its rows through one mandatory
 * predicate — {@code project_id IN (SELECT id FROM projects WHERE workspace_id = ?)} — with the
 * workspace bound as the first parameter, exactly the shape {@link WidgetDataService} uses. The
 * caller's {@code view_items} membership is proven in {@link ExportController} (RBAC stays in the
 * service boundary, RB-10 §2) before any row is read, and the {@code workspaceId} is derived from
 * the persisted report/dashboard — never trusted from a request param.
 *
 * <p><b>No new dependency (RB-10 §9).</b> Apache POI / a PDF library would each be a heavyweight
 * add through the approval checklist; the SheetJS {@code xlsx} npm advisory already pushed the
 * frontend off it. So all three formats are emitted with the JDK alone: a minimal valid PDF text
 * document, a minimal OOXML {@code .xlsx} (a ZIP of XML via {@link java.util.zip}), and a PNG of
 * the data table via {@link javax.imageio.ImageIO}. A PNG of a rendered <i>chart</i> needs a
 * browser canvas and stays client-side (see {@code works-frontend/src/lib/export.js}); the
 * server-side PNG is an honest table image, not a chart.
 */
@Service
public class ExportService {

    /** Hard cap on exported rows — keeps a stakeholder export bounded (RB-40 §5, no unbounded work). */
    static final int MAX_ROWS = 5000;

    /** Tabular columns rendered into every export, in order. Header label paired with SQL column. */
    private static final String[][] COLUMNS = {
        {"ID", "id"}, {"Title", "title"}, {"Type", "type"}, {"Status", "status"},
        {"Priority", "priority"}, {"Assignee", "assignee_id"}, {"Due date", "due_date"},
    };

    // work_items rows visible to a workspace: their project lives in that workspace. The workspaceId
    // bind is always the FIRST (and only) parameter — mirrors WidgetDataService.WORKSPACE_SCOPE.
    private static final String SCOPED_SQL =
        "SELECT id, title, type, status, priority, assignee_id, due_date FROM work_items "
        + "WHERE deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?) "
        + "ORDER BY COALESCE(due_date, '9999-12-31') ASC, id ASC LIMIT " + MAX_ROWS;

    private final JdbcTemplate jdbc;

    @Autowired
    public ExportService(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.jdbc.setQueryTimeout(10); // bounded; an export is not on the interactive hot path
    }

    /** Test seam: inject a ready JdbcTemplate so the renderers can be exercised without a DataSource. */
    ExportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** A rendered export: the bytes, the HTTP content type, and the download filename. */
    public record Export(byte[] body, String contentType, String filename) { }

    /** The three supported output formats. */
    public enum Format {
        PDF("application/pdf", "pdf"),
        XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
        PNG("image/png", "png");

        final String contentType;
        final String extension;

        Format(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        /** Parse the {@code ?format=} query param; 400 on anything unrecognised. */
        static Format parse(String raw) {
            String f = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
            return switch (f) {
                case "pdf" -> PDF;
                case "xlsx", "excel", "xls" -> XLSX;
                case "png" -> PNG;
                default -> throw ApiException.badRequest("INVALID_FORMAT",
                    "Unsupported export format: " + raw + ". Expected pdf, xlsx, or png.", "format");
            };
        }
    }

    /**
     * Render a {@code title} + the workspace-scoped work-item table into the requested format.
     * Authorization is the caller's responsibility (the controller proves membership first).
     */
    public Export render(String workspaceId, String title, Format format) {
        List<Map<String, Object>> rows = jdbc.queryForList(SCOPED_SQL, workspaceId);
        String safeTitle = title == null || title.isBlank() ? "Export" : title;
        String base = slug(safeTitle);
        byte[] body = switch (format) {
            case PDF -> pdf(safeTitle, rows);
            case XLSX -> xlsx(safeTitle, rows);
            case PNG -> png(safeTitle, rows);
        };
        return new Export(body, format.contentType, base + "." + format.extension);
    }

    // ── PDF ──────────────────────────────────────────────────────────────────────
    // A minimal, valid single-stream PDF: one font, a text content stream laying out the title and
    // the table as monospaced lines. Hand-built (no library) — sufficient for a static text export.

    private byte[] pdf(String title, List<Map<String, Object>> rows) {
        StringBuilder text = new StringBuilder();
        // Begin text, Helvetica 14 for the title at the top of an A4-ish page (612x792 pt).
        text.append("BT\n/F1 14 Tf\n50 760 Td\n").append(pdfStr(title)).append(" Tj\n");
        text.append("/F1 9 Tf\n0 -10 Td\n")
            .append(pdfStr(rows.size() + " work item(s) — generated by bSmart Works")).append(" Tj\n");
        text.append("/F2 8 Tf\n0 -18 Td\n");
        // Header row, then each data row, each on its own line (12pt leading) in a monospaced font.
        text.append(pdfStr(rowLine(headerCells()))).append(" Tj\n");
        int rendered = 0;
        for (Map<String, Object> r : rows) {
            if (rendered >= 60) { // one page of text — keep the export bounded
                text.append("0 -12 Td\n")
                    .append(pdfStr("… " + (rows.size() - rendered) + " more (full data in Excel export)"))
                    .append(" Tj\n");
                break;
            }
            text.append("0 -12 Td\n").append(pdfStr(rowLine(dataCells(r)))).append(" Tj\n");
            rendered++;
        }
        text.append("ET");
        byte[] stream = text.toString().getBytes(StandardCharsets.ISO_8859_1);

        // Assemble the six-object PDF with a byte-accurate xref table.
        List<String> objs = new ArrayList<>();
        objs.add("<< /Type /Catalog /Pages 2 0 R >>");
        objs.add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        objs.add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            + "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>");
        objs.add("<< /Length " + stream.length + " >>\nstream\n@@STREAM@@\nendstream");
        objs.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        objs.add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeAscii(out, "%PDF-1.4\n");
        int[] offsets = new int[objs.size() + 1];
        for (int i = 0; i < objs.size(); i++) {
            offsets[i + 1] = out.size();
            String header = (i + 1) + " 0 obj\n";
            if (objs.get(i).contains("@@STREAM@@")) {
                String[] parts = objs.get(i).split("@@STREAM@@", -1);
                writeAscii(out, header + parts[0]);
                out.writeBytes(stream);
                writeAscii(out, parts[1] + "\nendobj\n");
            } else {
                writeAscii(out, header + objs.get(i) + "\nendobj\n");
            }
        }
        int xref = out.size();
        StringBuilder x = new StringBuilder("xref\n0 ").append(objs.size() + 1).append('\n');
        x.append("0000000000 65535 f \n");
        for (int i = 1; i <= objs.size(); i++) {
            x.append(String.format("%010d 00000 n \n", offsets[i]));
        }
        x.append("trailer\n<< /Size ").append(objs.size() + 1).append(" /Root 1 0 R >>\n")
            .append("startxref\n").append(xref).append("\n%%EOF");
        writeAscii(out, x.toString());
        return out.toByteArray();
    }

    /** Escape a string for a PDF literal and wrap it in parentheses. */
    private static String pdfStr(String s) {
        String esc = s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
        return "(" + esc + ")";
    }

    // ── Excel (.xlsx, OOXML) ───────────────────────────────────────────────────────
    // A minimal valid workbook: [Content_Types].xml, the root + workbook relationships, the
    // workbook part, and one inline-string worksheet. Built as a ZIP with the JDK — no Apache POI.

    private byte[] xlsx(String title, List<Map<String, Object>> rows) {
        StringBuilder sheet = new StringBuilder(
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
            + "<sheetData>");
        appendXlsxRow(sheet, 1, headerCells());
        int rowNum = 2;
        for (Map<String, Object> r : rows) {
            appendXlsxRow(sheet, rowNum++, dataCells(r));
        }
        sheet.append("</sheetData></worksheet>");

        String contentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
            + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
            + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
            + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-"
            + "officedocument.spreadsheetml.sheet.main+xml\"/>"
            + "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-"
            + "officedocument.spreadsheetml.worksheet+xml\"/></Types>";
        String rootRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
            + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/"
            + "relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>";
        String workbook = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
            + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
            + "<sheets><sheet name=\"" + xmlSheetName(title) + "\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>";
        String workbookRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
            + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
            + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/"
            + "relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>";

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {
            zipEntry(zip, "[Content_Types].xml", contentTypes);
            zipEntry(zip, "_rels/.rels", rootRels);
            zipEntry(zip, "xl/workbook.xml", workbook);
            zipEntry(zip, "xl/_rels/workbook.xml.rels", workbookRels);
            zipEntry(zip, "xl/worksheets/sheet1.xml", sheet.toString());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return baos.toByteArray();
    }

    private static void appendXlsxRow(StringBuilder sb, int rowNum, String[] cells) {
        sb.append("<row r=\"").append(rowNum).append("\">");
        for (int c = 0; c < cells.length; c++) {
            String ref = colLetter(c) + rowNum;
            // Inline strings (t="inlineStr") avoid needing a shared-strings part.
            sb.append("<c r=\"").append(ref).append("\" t=\"inlineStr\"><is><t xml:space=\"preserve\">")
              .append(xml(cells[c])).append("</t></is></c>");
        }
        sb.append("</row>");
    }

    private static String colLetter(int index) {
        StringBuilder s = new StringBuilder();
        int n = index;
        do {
            s.insert(0, (char) ('A' + (n % 26)));
            n = n / 26 - 1;
        } while (n >= 0);
        return s.toString();
    }

    private static void zipEntry(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    // ── PNG (data-table image) ─────────────────────────────────────────────────────
    // A headless BufferedImage table render. Honest table image, not a chart (charts stay client-side).

    private byte[] png(String title, List<Map<String, Object>> rows) {
        final int pad = 12;
        final int rowH = 20;
        final int colW = 150;
        int cols = COLUMNS.length;
        int shown = Math.min(rows.size(), 200); // bound the canvas height
        int width = pad * 2 + colW * cols;
        int height = pad * 2 + rowH * (shown + 3);

        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.setColor(new Color(0x0B2F5C)); // brand-navy, for the title only
            g.setFont(new Font("SansSerif", Font.BOLD, 14));
            g.drawString(title, pad, pad + 12);
            g.setColor(new Color(0x3C, 0x48, 0x58));
            g.setFont(new Font("SansSerif", Font.PLAIN, 10));
            g.drawString(rows.size() + " work item(s)", pad, pad + 28);

            int y0 = pad + rowH * 2;
            g.setFont(new Font("Monospaced", Font.BOLD, 11));
            String[] header = headerCells();
            for (int c = 0; c < cols; c++) {
                g.drawString(clip(header[c]), pad + c * colW, y0);
            }
            g.setFont(new Font("Monospaced", Font.PLAIN, 11));
            for (int i = 0; i < shown; i++) {
                String[] cells = dataCells(rows.get(i));
                int y = y0 + (i + 1) * rowH;
                for (int c = 0; c < cols; c++) {
                    g.drawString(clip(cells[c]), pad + c * colW, y);
                }
            }
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            ImageIO.write(img, "png", baos);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return baos.toByteArray();
    }

    private static String clip(String s) {
        return s.length() > 22 ? s.substring(0, 21) + "…" : s;
    }

    // ── Shared cell helpers ──────────────────────────────────────────────────────

    private static String[] headerCells() {
        String[] h = new String[COLUMNS.length];
        for (int i = 0; i < COLUMNS.length; i++) {
            h[i] = COLUMNS[i][0];
        }
        return h;
    }

    private static String[] dataCells(Map<String, Object> row) {
        String[] cells = new String[COLUMNS.length];
        for (int i = 0; i < COLUMNS.length; i++) {
            Object v = row.get(COLUMNS[i][1]);
            cells[i] = v == null ? "" : v.toString();
        }
        return cells;
    }

    private static String rowLine(String[] cells) {
        StringBuilder sb = new StringBuilder();
        for (String c : cells) {
            String t = c.length() > 18 ? c.substring(0, 17) + "…" : c;
            sb.append(String.format("%-20s", t));
        }
        return sb.toString().stripTrailing();
    }

    private static String xml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String xmlSheetName(String title) {
        // Excel sheet names are <= 31 chars and forbid : \ / ? * [ ]
        String s = title.replaceAll("[:\\\\/?*\\[\\]]", " ").trim();
        if (s.isEmpty()) {
            s = "Sheet1";
        }
        return xml(s.length() > 31 ? s.substring(0, 31) : s);
    }

    private static String slug(String s) {
        String slug = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                       .replaceAll("(^-+|-+$)", "");
        return slug.isEmpty() ? "export" : slug;
    }

    private static void writeAscii(ByteArrayOutputStream out, String s) {
        out.writeBytes(s.getBytes(StandardCharsets.ISO_8859_1));
    }
}
