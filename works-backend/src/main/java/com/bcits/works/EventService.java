package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final RealtimeService realtime;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public EventService(EventRepository eventRepository, RealtimeService realtime) {
        this.eventRepository = eventRepository;
        this.realtime = realtime;
    }

    public void record(String aggregateId, String eventType, String actorId, String payload) {
        eventRepository.save(baseEvent(aggregateId, eventType, actorId, payload));
    }

    // Safe overload: serializes the payload to valid JSON so values containing
    // quotes or backslashes (e.g. a work-item title) cannot corrupt the event.
    public void record(String aggregateId, String eventType, String actorId, Map<String, ?> payload) {
        eventRepository.save(baseEvent(aggregateId, eventType, actorId, toJson(payload)));
    }

    // Workspace-scoped recording (RB-40 §1 — every event carries its tenant). Use this from any
    // producer that knows the workspace; aggregateId may differ from workspaceId (e.g. a project
    // event has aggregateId = projectId, workspaceId = the owning workspace). Producers adopt this
    // as each domain is refactored; the rest leave workspace_id null (backfilled in V38).
    public void recordInWorkspace(String workspaceId, String aggregateId, String eventType,
                                  String actorId, Map<String, ?> payload) {
        AppEvent event = baseEvent(aggregateId, eventType, actorId, toJson(payload));
        event.setWorkspaceId(workspaceId);
        eventRepository.save(event);
        // Real-time fan-out (iteration 18, Cap S): notify every open client in this workspace so
        // their views refresh within a second. Best-effort — a streaming hiccup must never break the
        // business write that this event records (RB-40 §1 keeps the broadcast workspace-scoped).
        if (realtime != null) {
            try {
                realtime.publish(workspaceId, "event", Map.of(
                        "aggregateId", aggregateId == null ? "" : aggregateId,
                        "eventType", eventType == null ? "" : eventType,
                        "actorId", actorId == null ? "" : actorId));
            } catch (Exception ignored) {
                // swallow — audit + business write already succeeded
            }
        }
    }

    public void recordDiff(String aggregateId, String eventType, String actorId,
                           String fieldName, String oldValue, String newValue) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("field", fieldName);
        payload.put("from", oldValue != null ? oldValue : "");
        payload.put("to", newValue != null ? newValue : "");
        AppEvent event = baseEvent(aggregateId, eventType, actorId, toJson(payload));
        event.setFieldName(fieldName);
        event.setOldValue(oldValue);
        event.setNewValue(newValue);
        eventRepository.save(event);
    }

    private AppEvent baseEvent(String aggregateId, String eventType, String actorId, String payload) {
        AppEvent event = new AppEvent();
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setActorId(actorId);
        event.setPayload(payload);
        event.setOccurredAt(OffsetDateTime.now());
        return event;
    }

    private String toJson(Map<String, ?> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            // Audit serialization must never break the business operation it records.
            return "{}";
        }
    }
}
