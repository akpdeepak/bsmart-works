package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public void record(String aggregateId, String eventType, String actorId, String payload) {
        AppEvent event = new AppEvent();
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setActorId(actorId);
        event.setPayload(payload);
        event.setOccurredAt(OffsetDateTime.now());
        eventRepository.save(event);
    }

    public void recordDiff(String aggregateId, String eventType, String actorId,
                           String fieldName, String oldValue, String newValue) {
        AppEvent event = new AppEvent();
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setActorId(actorId);
        event.setFieldName(fieldName);
        event.setOldValue(oldValue);
        event.setNewValue(newValue);
        event.setPayload("{\"field\":\"" + fieldName + "\",\"from\":\"" + (oldValue != null ? oldValue : "") + "\",\"to\":\"" + (newValue != null ? newValue : "") + "\"}");
        event.setOccurredAt(OffsetDateTime.now());
        eventRepository.save(event);
    }
}
