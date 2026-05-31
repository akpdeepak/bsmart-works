package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, String> {
    List<MeetingNote> findByProjectIdOrderByMeetingDateDesc(String projectId);
}
