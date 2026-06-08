package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRepository extends JpaRepository<AppEvent, Long> {
    List<AppEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId);
}
