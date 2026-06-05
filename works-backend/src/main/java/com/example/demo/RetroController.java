package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Cap V · Retro toolkit HTTP surface (I15-S05). Thin; delegates to {@link RetroService}.
 */
@RestController
@RequestMapping("/api/v1/retros")
public class RetroController {

    private final RetroService service;
    private final AuthenticatedUser authenticatedUser;

    public RetroController(RetroService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<RetroSession> list(@RequestParam String projectId) {
        return service.listByProject(authenticatedUser.id(), projectId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return service.getWithNotes(authenticatedUser.id(), id);
    }

    @PostMapping
    public RetroSession create(@Valid @RequestBody RetroSession session) {
        return service.create(authenticatedUser.id(), session);
    }

    @PutMapping("/{id}")
    public RetroSession update(@PathVariable String id, @Valid @RequestBody RetroSession updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/complete")
    public RetroSession complete(@PathVariable String id) {
        return service.complete(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/notes")
    public RetroNote addNote(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.addNote(authenticatedUser.id(), id, body.get("columnKey"), body.get("content"));
    }

    @PostMapping("/notes/{noteId}/vote")
    public RetroNote voteNote(@PathVariable String noteId) {
        return service.voteNote(authenticatedUser.id(), noteId);
    }

    @DeleteMapping("/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(@PathVariable String noteId) {
        service.deleteNote(authenticatedUser.id(), noteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notes/{noteId}/convert")
    public ActionItem convert(@PathVariable String noteId, @RequestBody(required = false) Map<String, String> body) {
        String ownerId = body == null ? null : body.get("ownerId");
        String due = body == null ? null : body.get("dueDate");
        return service.convertNoteToAction(authenticatedUser.id(), noteId, ownerId,
                due == null || due.isBlank() ? null : LocalDate.parse(due));
    }
}
