package com.bcits.works.messaging;

import com.bcits.works.RealtimeService;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Real-time co-presence (iteration 18, Cap S — "live cursors, simultaneous editing"). Tracks who is
 * currently viewing/editing what within a workspace and broadcasts the roster over
 * {@link RealtimeService} so every client can render the subtle presence avatars and live cursors
 * the spec describes.
 *
 * <p><b>Tenant isolation (RB-40 §1):</b> presence is bucketed by workspace; a roster query or
 * broadcast only ever covers a single workspace. Stale entries (no heartbeat within the TTL) are
 * pruned so a closed tab disappears on its own.
 */
@Service
public class PresenceService {

    /** A presence entry is considered live for this long after its last heartbeat. */
    static final Duration TTL = Duration.ofSeconds(30);

    public record Presence(String userId, String name, String location, Double cursorX, Double cursorY,
                           long lastSeenEpochMs) { }

    private final Map<String, Map<String, Presence>> byWorkspace = new ConcurrentHashMap<>();
    private final RealtimeService realtime;

    public PresenceService(RealtimeService realtime) {
        this.realtime = realtime;
    }

    /** Record a heartbeat / cursor update and broadcast the refreshed roster. */
    public List<Presence> heartbeat(String workspaceId, String userId, String name, String location,
                                    Double cursorX, Double cursorY) {
        Map<String, Presence> ws = byWorkspace.computeIfAbsent(workspaceId, k -> new ConcurrentHashMap<>());
        ws.put(userId, new Presence(userId, name, location, cursorX, cursorY, now()));
        List<Presence> roster = roster(workspaceId);
        realtime.publish(workspaceId, "presence", Map.of("workspaceId", workspaceId, "present", roster));
        return roster;
    }

    /** A user explicitly left (tab close / navigation away). Broadcasts the trimmed roster. */
    public void leave(String workspaceId, String userId) {
        Map<String, Presence> ws = byWorkspace.get(workspaceId);
        if (ws != null) {
            ws.remove(userId);
            realtime.publish(workspaceId, "presence",
                    Map.of("workspaceId", workspaceId, "present", roster(workspaceId)));
        }
    }

    /** The live roster for a workspace, with stale (timed-out) entries pruned. */
    public List<Presence> roster(String workspaceId) {
        Map<String, Presence> ws = byWorkspace.get(workspaceId);
        if (ws == null) {
            return List.of();
        }
        long cutoff = now() - TTL.toMillis();
        ws.entrySet().removeIf(e -> e.getValue().lastSeenEpochMs() < cutoff);
        return new ArrayList<>(ws.values());
    }

    long now() {
        return Instant.now().toEpochMilli();
    }
}
