package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/attachments")
@CrossOrigin(origins = "http://localhost:5173")
public class AttachmentController {

    private static final Path UPLOAD_DIR = Paths.get(System.getProperty("user.home"), ".bsmart-works", "uploads");
    private final JdbcTemplate jdbc;

    public AttachmentController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
                                      @RequestParam("file") MultipartFile file,
                                      @RequestHeader(value = "X-User-Id", required = false) String userId) throws IOException {
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path dest = UPLOAD_DIR.resolve(storedName);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        jdbc.update(
            "INSERT INTO attachments (work_item_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at) VALUES (?,?,?,?,?,?,?)",
            workItemId, userId, originalName, file.getSize(), file.getContentType(), storedName, OffsetDateTime.now());

        Long id = jdbc.queryForObject("SELECT id FROM attachments WHERE storage_path = ?", Long.class, storedName);
        return Map.of("id", id, "fileName", originalName, "fileSize", file.getSize(), "mimeType", file.getContentType() != null ? file.getContentType() : "");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String workItemId, @PathVariable Long id) {
        List<String> paths = jdbc.queryForList("SELECT storage_path FROM attachments WHERE id = ?", String.class, id);
        paths.forEach(p -> { try { Files.deleteIfExists(UPLOAD_DIR.resolve(p)); } catch (IOException ignored) {} });
        jdbc.update("DELETE FROM attachments WHERE id = ?", id);
        return ResponseEntity.noContent().build();
    }
}
