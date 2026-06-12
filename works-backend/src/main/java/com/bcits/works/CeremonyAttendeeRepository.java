package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CeremonyAttendeeRepository extends JpaRepository<CeremonyAttendee, String> {
    List<CeremonyAttendee> findBySessionIdOrderByJoinedAtAsc(String sessionId);
    Optional<CeremonyAttendee> findBySessionIdAndUserId(String sessionId, String userId);
}
