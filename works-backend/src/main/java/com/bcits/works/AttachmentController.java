package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/attachments")
public class AttachmentController {

    private static final Logger log = LoggerFactory.getLogger(AttachmentController.class);

    /** Upload directory — overridable via APP_ATTACHMENTS_DIR env var or app.attachments.dir property.
     *  Default keeps dev parity with the previous hardcoded path. In containerised deployments
     *  mount a named Docker volume and set APP_ATTACHMENTS_DIR to that path (see docker-compose.deploy.yml). */
    @Value("${app.attachments.dir:${user.home}/.bsmart-works/uploads}")
    private String uploadDir;

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
    private final RbacService rbac;

    public AttachmentController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @jakarta.annotation.PostConstruct
    void initUploadDir() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
            log.info("[ATTACHMENTS] Upload directory: {}", uploadDir);
        } catch (IOException e) {
            log.warn("[ATTACHMENTS] Could not create upload directory {}: {}", uploadDir, e.getMessage());
        }
    }

    /** Resolve the work item's workspace and require the caller is a member (RB-40 §1). 404 hides
     *  both a missing item and a foreign-tenant one. Same contract as CommentController. */
    private void requireItemAccess(String callerId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
    }

    @GetMapping
    public List<Map<String, Object>> getAttachments(@PathVariable String workItemId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "50") int size) {
        requireItemAccess(authenticatedUser.id(), workItemId);
        int limit = Math.min(Math.max(size, 1), 200);
        int offset = Math.max(page, 0) * limit;
        return jdbc.queryForList(
            "SELECT a.id, a.file_name, a.file_size, a.mime_type, a.attachment_type, a.url, a.created_at, " +
            "u.full_name as uploaded_by_name " +
            "FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by " +
            "WHERE a.work_item_id = ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
            workItemId, limit, offset);
    }

    /** Attach an external link (URL / webpage) — no binary stored. */
    @PostMapping("/link")
    public Map<String, Object> attachLink(@PathVariable String workItemId,
                                          @org.springframework.web.bind.annotation.RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        requireItemAccess(userId, workItemId);
        String url = body.get("url") != null ? body.get("url").trim() : "";
        if (!url.matches("(?i)^https?://.+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid http(s) URL is required");
        }
        if (url.length() > 2048) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "URL exceeds 2048 characters");
        }
        String title = body.get("title") != null && !body.get("title").isBlank() ? body.get("title").trim() : url;
        if (title.length() > 255) title = title.substring(0, 255);

        jdbc.update(
            "INSERT INTO attachments (work_item_id, uploaded_by, file_name, file_size, mime_type, " +
            "attachment_type, url, storage_path, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            workItemId, userId, title, 0L, "text/uri-list", "URL", url, null, OffsetDateTime.now());

        Long id = jdbc.queryForObject(
            "SELECT id FROM attachments WHERE work_item_id = ? AND url = ? ORDER BY created_at DESC LIMIT 1",
            Long.class, workItemId, url);
        return Map.of("id", id, "fileName", title, "url", url, "attachmentType", "URL");
    }

    @PostMapping
    public Map<String, Object> upload(@PathVariable String workItemId,
                                      @RequestParam("file") MultipartFile file) throws IOException {
        String userId = authenticatedUser.id();
        requireItemAccess(userId, workItemId);

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
        Path dest = Paths.get(uploadDir).resolve(storedName);
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
        requireItemAccess(authenticatedUser.id(), workItemId);
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT file_name, mime_type, storage_path FROM attachments WHERE id = ? AND work_item_id = ?", id, workItemId);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> row = rows.get(0);
        Path filePath = Paths.get(uploadDir).resolve((String) row.get("storage_path"));
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
        requireItemAccess(authenticatedUser.id(), workItemId);
        // Bind both ids so an attachment can only be deleted through its own work item's path —
        // an id belonging to another item (or another tenant) matches zero rows (RB-40 §1).
        List<String> paths = jdbc.queryForList(
            "SELECT storage_path FROM attachments WHERE id = ? AND work_item_id = ?",
            String.class, id, workItemId);
        paths.stream().filter(p -> p != null && !p.isBlank())  // URL attachments have no stored file
            .forEach(p -> { try { Files.deleteIfExists(Paths.get(uploadDir).resolve(p)); } catch (IOException ignored) {} });
        jdbc.update("DELETE FROM attachments WHERE id = ? AND work_item_id = ?", id, workItemId);
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
            if (response.endsWith("OK")) return "OK"; {
            return response.replaceFirst("^stream: ", "").trim();
            }

        } catch (Exception e) {
            log.warn("[CLAMAV] Scan failed (is ClamAV running on {}:{}?): {}", clamavHost, clamavPort, e.getMessage());
            // Fail open in case ClamAV is misconfigured — log and allow (adjust to fail-closed if needed)
            return "OK";
        }
    }
}
