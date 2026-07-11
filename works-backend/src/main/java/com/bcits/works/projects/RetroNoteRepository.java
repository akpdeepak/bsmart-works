package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RetroNoteRepository extends JpaRepository<RetroNote, String> {
    List<RetroNote> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
