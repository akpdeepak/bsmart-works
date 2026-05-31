package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/meeting-notes")
public class MeetingNoteController {

    private final MeetingNoteRepository meetingNoteRepository;
    private final ActionItemRepository actionItemRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public MeetingNoteController(MeetingNoteRepository meetingNoteRepository,
                                  ActionItemRepository actionItemRepository,
                                  EventService eventService, AuthenticatedUser authenticatedUser) {
        this.meetingNoteRepository = meetingNoteRepository;
        this.actionItemRepository = actionItemRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<MeetingNote> getMeetingNotes(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? meetingNoteRepository.findByProjectIdOrderByMeetingDateDesc(projectId)
            : meetingNoteRepository.findAll();
    }

    @GetMapping("/{id}")
    public MeetingNote getMeetingNote(@PathVariable String id) {
        return meetingNoteRepository.findById(id).orElseThrow();
    }

    @GetMapping("/{id}/action-items")
    public List<ActionItem> getMeetingActionItems(@PathVariable String id) {
        return actionItemRepository.findByMeetingNoteIdOrderByCreatedAtAsc(id);
    }

    @PostMapping
    public MeetingNote createMeetingNote(@RequestBody MeetingNote note) {
        String userId = authenticatedUser.id();
        note.setId("MTG-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        note.setMeetingType(note.getMeetingType() != null ? note.getMeetingType() : "GENERAL");
        note.setCreatedBy(userId);
        note.setCreatedAt(OffsetDateTime.now());
        note.setUpdatedAt(OffsetDateTime.now());
        MeetingNote saved = meetingNoteRepository.save(note);
        eventService.record(saved.getId(), "MEETING_NOTE_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public MeetingNote updateMeetingNote(@PathVariable String id, @RequestBody MeetingNote updated) {
        String userId = authenticatedUser.id();
        return meetingNoteRepository.findById(id).map(n -> {
            n.setTitle(updated.getTitle());
            n.setMeetingDate(updated.getMeetingDate());
            n.setMeetingType(updated.getMeetingType());
            n.setAgenda(updated.getAgenda());
            n.setNotes(updated.getNotes());
            n.setDecisionsMade(updated.getDecisionsMade());
            n.setAttendees(updated.getAttendees());
            n.setUpdatedAt(OffsetDateTime.now());
            MeetingNote saved = meetingNoteRepository.save(n);
            eventService.record(id, "MEETING_NOTE_UPDATED", userId, "{}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMeetingNote(@PathVariable String id) {
        meetingNoteRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
