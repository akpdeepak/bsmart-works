package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRepository extends JpaRepository<AppEvent, Long> {
    List<AppEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId);

    /** Dedupe ledger: has this aggregate already emitted this event type? */
    boolean existsByAggregateIdAndEventType(String aggregateId, String eventType);
}
