package com.bcits.works;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * Real-time streaming + co-presence (iteration 18, Cap S). The SSE stream pushes workspace events to
 * every open client within a second; presence endpoints drive the live-cursor / who's-here roster.
 *
 * <p>RBAC (RB-10 §2) is applied here through {@link RbacService}: a subscriber must hold
 * {@code view_items} on the workspace, and every call is workspace-scoped (RB-40 §1) so a client can
 * only ever stream or post presence for a workspace it belongs to. The SSE endpoint accepts its JWT
 * via the {@code access_token} query param because the browser {@code EventSource} API cannot set an
 * Authorization header (the JWT filter honours that param — see {@link SecurityConfig}).
 */
@RestController
@RequestMapping("/api/v1/realtime")
public class RealtimeController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final RealtimeService realtime;
    private final PresenceService presence;

    public RealtimeController(AuthenticatedUser authenticatedUser, RbacService rbac,
                             RealtimeService realtime, PresenceService presence) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.realtime = realtime;
        this.presence = presence;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return realtime.subscribe(workspaceId);
    }

    public record PresenceRequest(String workspaceId, String name, String location,
                                  Double cursorX, Double cursorY) { }

    @PostMapping("/presence")
    public List<PresenceService.Presence> heartbeat(@RequestBody PresenceRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, req.workspaceId(), "view_items");
        return presence.heartbeat(req.workspaceId(), userId, req.name(), req.location(),
                req.cursorX(), req.cursorY());
    }

    @PostMapping("/presence/leave")
    public void leave(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        presence.leave(workspaceId, userId);
    }

    @GetMapping("/presence")
    public List<PresenceService.Presence> roster(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return presence.roster(workspaceId);
    }
}
