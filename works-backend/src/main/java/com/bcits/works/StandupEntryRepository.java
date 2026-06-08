package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StandupEntryRepository extends JpaRepository<StandupEntry, String> {
    List<StandupEntry> findBySessionIdOrderByDisplayOrderAsc(String sessionId);
}
