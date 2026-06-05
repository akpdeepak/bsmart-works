package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Focus mode + time blocking (Cap U, iteration 14). Focus blocks are private to the caller: every
 * endpoint operates only on {@code authenticatedUser.id()}'s own blocks (RB-40 §1). RBAC/ownership
 * is enforced in {@link FocusModeService}.
 */
@RestController
@RequestMapping("/api/v1/focus-blocks")
public class FocusBlockController {

    private final FocusModeService focusMode;
    private final AuthenticatedUser authenticatedUser;

    public FocusBlockController(FocusModeService focusMode, AuthenticatedUser authenticatedUser) {
        this.focusMode = focusMode;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<FocusBlock> list(@RequestParam String workspaceId) {
        return focusMode.list(workspaceId, authenticatedUser.id());
    }

    @GetMapping("/status")
    public FocusModeService.FocusStatus status() {
        return focusMode.status(authenticatedUser.id());
    }

    @PostMapping
    public FocusBlock schedule(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        OffsetDateTime startsAt = parseTime(body.get("startsAt"), "startsAt");
        OffsetDateTime endsAt = parseTime(body.get("endsAt"), "endsAt");
        String title = body.get("title") == null ? null : body.get("title").toString();
        Object p0 = body.get("allowP0");
        boolean allowP0 = !(p0 instanceof Boolean b) || b;   // default true — only P0 breaks through
        String source = body.get("source") == null ? "MANUAL" : body.get("source").toString();
        return focusMode.schedule(workspaceId, authenticatedUser.id(), title, startsAt, endsAt, allowP0, source);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<FocusBlock> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(focusMode.cancel(id, authenticatedUser.id()));
    }

    private static OffsetDateTime parseTime(Object v, String field) {
        if (v == null) throw ApiException.badRequest("MISSING_FIELD", field + " is required.", field);
        try {
            return OffsetDateTime.parse(v.toString());
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_TIME", field + " must be an ISO-8601 timestamp.", field);
        }
    }
}
