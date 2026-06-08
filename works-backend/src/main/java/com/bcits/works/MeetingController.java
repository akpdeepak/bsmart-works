package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/meetings")
public class MeetingController {

    private final MeetingRepository meetingRepo;
    private final MeetingNoteRepository noteRepo;
    private final ActionItemRepository actionItemRepo;
    private final AuthenticatedUser authenticatedUser;

    public MeetingController(MeetingRepository meetingRepo,
                              MeetingNoteRepository noteRepo,
                              ActionItemRepository actionItemRepo,
                              AuthenticatedUser authenticatedUser) {
        this.meetingRepo = meetingRepo;
        this.noteRepo = noteRepo;
        this.actionItemRepo = actionItemRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Meeting> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only meetings from their workspaces.
        if (projectId != null) return meetingRepo.findByProjectIdScopedToUser(projectId, userId);
        return meetingRepo.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Meeting meeting = meetingRepo.findById(id).orElseThrow();
        List<MeetingNote> notes = noteRepo.findByMeetingId(id);
        List<ActionItem> actions = actionItemRepo.findBySourceMeetingIdAndDeletedAtIsNull(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("meeting", meeting);
        result.put("notes", notes);
        result.put("actionItems", actions);
        return result;
    }

    @PostMapping
    public Meeting create(@Valid @RequestBody Meeting meeting) {
        String userId = authenticatedUser.id();
        meeting.setId("MTG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        meeting.setCreatedBy(userId);
        meeting.setCreatedAt(OffsetDateTime.now());
        meeting.setUpdatedAt(OffsetDateTime.now());
        if (meeting.getAttendees() == null) meeting.setAttendees("[]");
        Meeting saved = meetingRepo.save(meeting);
        // Auto-create the four structured note sections
        for (String section : new String[]{"AGENDA", "NOTES", "DECISIONS", "ACTIONS"}) {
            MeetingNote note = new MeetingNote();
            note.setId("MN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            note.setMeetingId(saved.getId());
            note.setSection(section);
            note.setContent("");
            note.setCreatedBy(userId);
            note.setCreatedAt(OffsetDateTime.now());
            note.setUpdatedAt(OffsetDateTime.now());
            noteRepo.save(note);
        }
        return saved;
    }

    @PutMapping("/{id}")
    public Meeting update(@PathVariable String id, @Valid @RequestBody Meeting updated) {
        return meetingRepo.findById(id).map(m -> {
            m.setTitle(updated.getTitle());
            m.setMeetingType(updated.getMeetingType());
            m.setScheduledAt(updated.getScheduledAt());
            m.setDurationMins(updated.getDurationMins());
            m.setLocation(updated.getLocation());
            m.setAgenda(updated.getAgenda());
            if (updated.getAttendees() != null) m.setAttendees(updated.getAttendees());
            m.setStatus(updated.getStatus());
            m.setOrganizerId(updated.getOrganizerId());
            m.setUpdatedAt(OffsetDateTime.now());
            return meetingRepo.save(m);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        meetingRepo.findById(id).ifPresent(m -> { m.setDeletedAt(OffsetDateTime.now()); meetingRepo.save(m); });
        return ResponseEntity.noContent().build();
    }

    // Notes CRUD
    @GetMapping("/{id}/notes")
    public List<MeetingNote> getNotes(@PathVariable String id) {
        return noteRepo.findByMeetingId(id);
    }

    @PutMapping("/{id}/notes/{section}")
    public MeetingNote upsertNote(@PathVariable String id, @PathVariable String section,
                                   @Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        MeetingNote note = noteRepo.findByMeetingIdAndSection(id, section.toUpperCase())
                .orElseGet(() -> {
                    MeetingNote newNote = new MeetingNote();
                    newNote.setId("MN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    newNote.setMeetingId(id);
                    newNote.setSection(section.toUpperCase());
                    newNote.setCreatedBy(userId);
                    newNote.setCreatedAt(OffsetDateTime.now());
                    return newNote;
                });
        note.setContent(body.getOrDefault("content", ""));
        note.setUpdatedAt(OffsetDateTime.now());
        return noteRepo.save(note);
    }
}
