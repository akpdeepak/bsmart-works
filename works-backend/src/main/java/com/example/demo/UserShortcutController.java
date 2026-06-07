package com.example.demo;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Per-user keyboard-shortcut customization (iteration 18, Cap S). Per-user only — the authenticated
 * user is the subject, so no workspace scope or RBAC beyond authentication (a user owns their own
 * bindings). Business rules live in {@link UserShortcutService} (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/shortcuts")
public class UserShortcutController {

    private final AuthenticatedUser authenticatedUser;
    private final UserShortcutService service;

    public UserShortcutController(AuthenticatedUser authenticatedUser, UserShortcutService service) {
        this.authenticatedUser = authenticatedUser;
        this.service = service;
    }

    @GetMapping
    public Map<String, String> mine() {
        return service.getForUser(authenticatedUser.id());
    }

    public record ShortcutRequest(String actionId, String keys) { }

    @PutMapping
    public Map<String, String> set(@RequestBody ShortcutRequest req) {
        return service.set(authenticatedUser.id(), req.actionId(), req.keys());
    }

    /** Reset one action (actionId param) or all of the caller's overrides when omitted. */
    @DeleteMapping
    public Map<String, String> reset(@RequestParam(required = false) String actionId) {
        return service.reset(authenticatedUser.id(), actionId);
    }
}
