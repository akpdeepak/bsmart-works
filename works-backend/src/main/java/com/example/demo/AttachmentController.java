package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.*;
import java.net.Socket;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/attachments")
public class AttachmentController {

    private static final Logger log = LoggerFactory.getLogger(AttachmentController.class);
    private static final Path UPLOAD_DIR = Paths.get(System.getProperty("user.home"), ".bsmart-works", "uploads");

    /** Maximum upload size in bytes. Configurable via app property; defaults to 20 MB. */
    @Value("${app.attachments.max-size-bytes:20971520}")
    private long maxSizeBytes;

    /** Whether to enforce virus scanning. Defaults to false (dev mode). */
    @Value("${app.attachments.virus-scan-enabled:false}")
    private boolean virusScanEnabled;

    /** ClamAV host for virus scanning. */
    @Value("${app.attachments.clamav-host:localhost}")
    private String clamavHost;

    @Value("${app.attachments.clamav-port:3310}")
    private int clamavPort;

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;

    public AttachmentController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        try { Files.createDirectories(UPLOAD_DIR); } catch (IOException e) { /* ignore */ }
    }

    @GetMapping
    public List<Map<String, Object>> getAttachments(@PathVariable String workItemId) {
        return jdbc.queryForList(
            "SELECT a.id, a.file_name, a.file_size, a.mime_type, a.created_at, u.full_name as uploaded_by_name " +
            "FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by " +
            "WHERE a.work_item_id = ? ORDER BY a.created_at DESC", workItemId);
    }

    @PostMapping
    public Map<String, Object> upload(@PathVariable String workItemId,
                                      @RequestParam("file") MultipartFile file) throws IOException {
        String userId = authenticatedUser.id();

        // 1. Configurable size limit
        if (file.getSize() > maxSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "File exceeds maximum allowed size of " + (maxSizeBytes / 1024 / 1024) + " MB");
        }

        // 2. Block dangerous MIME types regardless of extension
        String mimeType = file.getContentType() != null ? file.getContentType().toLowerCase() : "application/octet-stream";
        if (mimeType.contains("application/x-msdownload") ||
            mimeType.contains("application/x-executable") ||
            mimeType.contains("application/x-sh")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File type not permitted: " + mimeType);
        }

        // 3. Virus scan via ClamAV (optional — skipped in dev if virusScanEnabled=false)
        if (virusScanEnabled) {
            byte[] bytes = file.getBytes();
            String scanResult = scanWithClamAV(bytes);
            if (!"OK".equals(scanResult)) {
                log.warn("[VIRUS SCAN] Blocked upload for work item {}: {}", workItemId, scanResult);
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "File rejected by virus scanner: " + scanResult);
            }
        } else {
            log.info("[VIRUS SCAN] Skipped (dev mode). Set app.attachments.virus-scan-enabled=true to enable ClamAV.");
        }

        // 4. Store file
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String storedName   = UUID.randomUUID() + "_" + originalName;
        Path dest = UPLOAD_DIR.resolve(storedName);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        jdbc.update(
            "INSERT INTO attachments (work_item_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at) VALUES (?,?,?,?,?,?,?)",
            workItemId, userId, originalName, file.getSize(), file.getContentType(), storedName, OffsetDateTime.now());

        Long id = jdbc.queryForObject("SELECT id FROM attachments WHERE storage_path = ?", Long.class, storedName);
        return Map.of("id", id, "fileName", originalName, "fileSize", file.getSize(),
                      "mimeType", file.getContentType() != null ? file.getContentType() : "");
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<org.springframework.core.io.Resource> serveFile(
            @PathVariable String workItemId, @PathVariable Long id) throws IOException {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT file_name, mime_type, storage_path FROM attachments WHERE id = ? AND work_item_id = ?", id, workItemId);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> row = rows.get(0);
        Path filePath = UPLOAD_DIR.resolve((String) row.get("storage_path"));
        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(filePath);
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String mime = (String) row.get("mime_type");
        if (mime == null) mime = "application/octet-stream";
        return ResponseEntity.ok()
            .header("Content-Type", mime)
            .header("Content-Disposition", "inline; filename=\"" + row.get("file_name") + "\"")
            .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String workItemId, @PathVariable Long id) {
        List<String> paths = jdbc.queryForList("SELECT storage_path FROM attachments WHERE id = ?", String.class, id);
        paths.forEach(p -> { try { Files.deleteIfExists(UPLOAD_DIR.resolve(p)); } catch (IOException ignored) {} });
        jdbc.update("DELETE FROM attachments WHERE id = ?", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * ClamAV INSTREAM scan via TCP socket (RFC 3310).
     * Returns "OK" if clean, or the virus name / error string if infected/failed.
     */
    private String scanWithClamAV(byte[] data) {
        try (Socket socket = new Socket(clamavHost, clamavPort);
             OutputStream out = socket.getOutputStream();
             InputStream in  = socket.getInputStream()) {

            socket.setSoTimeout(15_000);

            // INSTREAM protocol: send "nINSTREAM\n", then chunks of <length><data>, then zero-length chunk
            out.write("nINSTREAM\n".getBytes());
            int chunkSize = 8192;
            for (int offset = 0; offset < data.length; offset += chunkSize) {
                int len = Math.min(chunkSize, data.length - offset);
                out.write(new byte[]{ (byte)(len >> 24), (byte)(len >> 16), (byte)(len >> 8), (byte)len });
                out.write(data, offset, len);
            }
            out.write(new byte[]{ 0, 0, 0, 0 }); // terminate
            out.flush();

            byte[] buf = new byte[4096];
            int read = in.read(buf);
            String response = read > 0 ? new String(buf, 0, read).trim() : "";
            // Response format: "stream: OK" or "stream: Eicar-Test-Signature FOUND"
            if (response.endsWith("OK")) return "OK";
            return response.replaceFirst("^stream: ", "").trim();

        } catch (Exception e) {
            log.warn("[CLAMAV] Scan failed (is ClamAV running on {}:{}?): {}", clamavHost, clamavPort, e.getMessage());
            // Fail open in case ClamAV is misconfigured — log and allow (adjust to fail-closed if needed)
            return "OK";
        }
    }
}
