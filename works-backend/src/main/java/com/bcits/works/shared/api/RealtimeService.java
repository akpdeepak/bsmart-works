package com.bcits.works.shared.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Real-time fan-out over Server-Sent Events (iteration 18, Cap S — "real-time updates propagate to
 * all open clients within 1 second"). Holds one list of open {@link SseEmitter}s per workspace and
 * pushes named events to every client in that workspace.
 *
 * <p><b>Tenant isolation (RB-40 §1):</b> emitters are bucketed by {@code workspaceId} and a publish
 * only ever reaches the bucket it targets, so a real-time event can never leak across tenants. The
 * controller authorises the subscriber ({@code view_items}) before an emitter is ever registered
 * here.
 */
@Service
public class RealtimeService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeService.class);
    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<String, CopyOnWriteArrayList<SseEmitter>> byWorkspace = new ConcurrentHashMap<>();

    /** Register a new subscriber for a workspace and wire up its own cleanup. */
    public SseEmitter subscribe(String workspaceId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        CopyOnWriteArrayList<SseEmitter> list =
                byWorkspace.computeIfAbsent(workspaceId, k -> new CopyOnWriteArrayList<>());
        list.add(emitter);
        emitter.onCompletion(() -> remove(workspaceId, emitter));
        emitter.onTimeout(() -> remove(workspaceId, emitter));
        emitter.onError(e -> remove(workspaceId, emitter));
        try {
            // An initial comment-style event so the client's onopen fires immediately.
            emitter.send(SseEmitter.event().name("connected").data(Map.of("workspaceId", workspaceId)));
        } catch (IOException e) {
            remove(workspaceId, emitter);
        }
        return emitter;
    }

    /** Push a named event to every open client in a workspace. Dead emitters are dropped. */
    public void publish(String workspaceId, String eventName, Object payload) {
        if (workspaceId == null) {
            return;
        }
        List<SseEmitter> list = byWorkspace.get(workspaceId);
        if (list == null || list.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (Exception e) {
                // A broken pipe just means that client went away; drop it and carry on.
                remove(workspaceId, emitter);
            }
        }
    }

    /** Open subscriber count for a workspace — used by the status page and tests. */
    public int subscriberCount(String workspaceId) {
        List<SseEmitter> list = byWorkspace.get(workspaceId);
        return list == null ? 0 : list.size();
    }

    private void remove(String workspaceId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = byWorkspace.get(workspaceId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                byWorkspace.remove(workspaceId, list);
            }
        }
        log.debug("Real-time subscriber removed from workspace {}", workspaceId);
    }
}
