package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/field-layouts")
public class FieldLayoutController {

    private final FieldLayoutRepository layoutRepo;
    private final AuthenticatedUser authenticatedUser;

    public FieldLayoutController(FieldLayoutRepository layoutRepo,
                                  AuthenticatedUser authenticatedUser) {
        this.layoutRepo = layoutRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<FieldLayout> list(@RequestParam(required = false) String workspaceId,
                                  @RequestParam(required = false) String projectId) {
        if (projectId != null) return layoutRepo.findByWorkspaceId(projectId);
        if (workspaceId != null) return layoutRepo.findByWorkspaceId(workspaceId);
        return layoutRepo.findAll();
    }

    @GetMapping("/{itemType}")
    public FieldLayout getByType(@PathVariable String itemType,
                                  @RequestParam(required = false) String projectId,
                                  @RequestParam(required = false) String workspaceId) {
        Optional<FieldLayout> found = projectId != null
            ? layoutRepo.findByProjectIdAndItemType(projectId, itemType)
            : layoutRepo.findByWorkspaceIdAndItemType(workspaceId != null ? workspaceId : "WS-001", itemType);
        return found.orElseGet(() -> {
            FieldLayout fl = new FieldLayout();
            fl.setItemType(itemType);
            fl.setLayoutJson("[]");
            return fl;
        });
    }

    @PutMapping("/{itemType}")
    public FieldLayout saveLayout(@PathVariable String itemType,
                                   @RequestParam(required = false) String projectId,
                                   @RequestParam(required = false) String workspaceId,
                                   @RequestBody Map<String, Object> body) {
        String wsId = workspaceId != null ? workspaceId : "WS-001";
        FieldLayout fl = (projectId != null
            ? layoutRepo.findByProjectIdAndItemType(projectId, itemType)
            : layoutRepo.findByWorkspaceIdAndItemType(wsId, itemType))
            .orElseGet(() -> {
                FieldLayout newFl = new FieldLayout();
                newFl.setId("FL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                newFl.setWorkspaceId(wsId);
                newFl.setProjectId(projectId);
                newFl.setItemType(itemType);
                newFl.setCreatedAt(OffsetDateTime.now());
                return newFl;
            });
        if (body.get("layoutJson") != null) fl.setLayoutJson(body.get("layoutJson").toString());
        fl.setUpdatedAt(OffsetDateTime.now());
        return layoutRepo.save(fl);
    }
}
