package com.bcits.works.messaging;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, String> {
    List<MeetingNote> findByMeetingId(String meetingId);
    Optional<MeetingNote> findByMeetingIdAndSection(String meetingId, String section);
}
