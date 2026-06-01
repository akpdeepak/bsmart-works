package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge-spaces")
public class KnowledgeSpaceController {

    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleRepository articleRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public KnowledgeSpaceController(KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     ArticleRepository articleRepository,
                                     EventService eventService, AuthenticatedUser authenticatedUser) {
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.articleRepository = articleRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<KnowledgeSpace> getSpaces() {
        return knowledgeSpaceRepository.findAllByOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public KnowledgeSpace getSpace(@PathVariable String id) {
        return knowledgeSpaceRepository.findById(id).orElseThrow();
    }

    @GetMapping("/{id}/articles")
    public List<Article> getSpaceArticles(@PathVariable String id,
                                           @RequestParam(required = false) String status) {
        return status != null
            ? articleRepository.findBySpaceIdAndStatusOrderByUpdatedAtDesc(id, status)
            : articleRepository.findBySpaceIdOrderByUpdatedAtDesc(id);
    }

    @PostMapping
    public KnowledgeSpace createSpace(@Valid @RequestBody KnowledgeSpace space) {
        String userId = authenticatedUser.id();
        space.setId("KS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        space.setVisibility(space.getVisibility() != null ? space.getVisibility() : "TEAM");
        space.setIcon(space.getIcon() != null ? space.getIcon() : "book");
        space.setCreatedBy(userId);
        space.setCreatedAt(OffsetDateTime.now());
        space.setUpdatedAt(OffsetDateTime.now());
        KnowledgeSpace saved = knowledgeSpaceRepository.save(space);
        eventService.record(saved.getId(), "KNOWLEDGE_SPACE_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public KnowledgeSpace updateSpace(@PathVariable String id, @Valid @RequestBody KnowledgeSpace updated) {
        String userId = authenticatedUser.id();
        return knowledgeSpaceRepository.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setDescription(updated.getDescription());
            s.setIcon(updated.getIcon());
            s.setVisibility(updated.getVisibility());
            s.setUpdatedAt(OffsetDateTime.now());
            return knowledgeSpaceRepository.save(s);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpace(@PathVariable String id) {
        knowledgeSpaceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
