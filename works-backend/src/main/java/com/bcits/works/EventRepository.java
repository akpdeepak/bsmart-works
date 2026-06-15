package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<AppEvent, Long> {
    List<AppEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId);

    /** The most recent event of a type for an aggregate — the SLA reminder ledger (notify
     *  again only when the last escalation is older than the reminder window). */
    Optional<AppEvent> findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(String aggregateId, String eventType);

    /** Idempotency guard for funnel events: has this event type already been emitted for this workspace? */
    boolean existsByWorkspaceIdAndEventType(String workspaceId, String eventType);
}
