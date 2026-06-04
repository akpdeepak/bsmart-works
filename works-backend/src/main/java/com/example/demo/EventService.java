package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
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
