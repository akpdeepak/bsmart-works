package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items/{itemId}/links")
public class WorkItemLinkController {

    private final WorkItemLinkRepository linkRepository;
    private final WorkItemRepository workItemRepository;

    public WorkItemLinkController(WorkItemLinkRepository linkRepository,
                                  WorkItemRepository workItemRepository) {
        this.linkRepository = linkRepository;
        this.workItemRepository = workItemRepository;
    }

    @GetMapping
    public List<WorkItemLink> getLinks(@PathVariable String itemId) {
        List<WorkItemLink> links = linkRepository.findBySourceId(itemId);
        links.forEach(l -> workItemRepository.findById(l.getTargetId())
                .ifPresent(t -> l.setTargetTitle(t.getTitle())));
        return links;
    }

    @PostMapping
    public WorkItemLink createLink(@PathVariable String itemId, @RequestBody Map<String, String> payload) {
        WorkItemLink link = new WorkItemLink();
        link.setSourceId(itemId);
        link.setTargetId(payload.get("targetId"));
        link.setLinkType(payload.get("linkType"));
        link.setCreatedAt(OffsetDateTime.now());
        WorkItemLink saved = linkRepository.save(link);
        workItemRepository.findById(saved.getTargetId()).ifPresent(t -> saved.setTargetTitle(t.getTitle()));
        return saved;
    }

    @DeleteMapping("/{linkId}")
    public void deleteLink(@PathVariable String itemId, @PathVariable Long linkId) {
        linkRepository.deleteById(linkId);
    }
}

