package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/lessons-learned")
public class LessonLearnedController {

    private final LessonLearnedRepository lessonLearnedRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public LessonLearnedController(LessonLearnedRepository lessonLearnedRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.lessonLearnedRepository = lessonLearnedRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<LessonLearned> getLessonsLearned(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? lessonLearnedRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : lessonLearnedRepository.findAll();
    }

    @GetMapping("/{id}")
    public LessonLearned getLessonLearned(@PathVariable String id) {
        return lessonLearnedRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public LessonLearned createLessonLearned(@RequestBody LessonLearned lesson) {
        String userId = authenticatedUser.id();
        lesson.setId("LES-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        lesson.setCreatedBy(userId);
        lesson.setCreatedAt(OffsetDateTime.now());
        lesson.setUpdatedAt(OffsetDateTime.now());
        LessonLearned saved = lessonLearnedRepository.save(lesson);
        eventService.record(saved.getId(), "LESSON_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public LessonLearned updateLessonLearned(@PathVariable String id, @RequestBody LessonLearned updated) {
        String userId = authenticatedUser.id();
        return lessonLearnedRepository.findById(id).map(l -> {
            l.setTitle(updated.getTitle());
            l.setWhatWorked(updated.getWhatWorked());
            l.setWhatDidntWork(updated.getWhatDidntWork());
            l.setRecommendations(updated.getRecommendations());
            l.setCategory(updated.getCategory());
            l.setTags(updated.getTags());
            l.setUpdatedAt(OffsetDateTime.now());
            LessonLearned saved = lessonLearnedRepository.save(l);
            eventService.record(id, "LESSON_UPDATED", userId, "{}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLessonLearned(@PathVariable String id) {
        lessonLearnedRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
