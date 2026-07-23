package com.bcits.works.workspaces;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * People Graph / Skills API (EPIC-22). All authorization and tenant scoping is in {@link SkillService}
 * (RB-10 §2); the controller only parses HTTP and delegates.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class SkillController {

    private final SkillService skillService;
    private final AuthenticatedUser authenticatedUser;

    public SkillController(SkillService skillService, AuthenticatedUser authenticatedUser) {
        this.skillService = skillService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/skills")
    public List<Skill> listSkills(@PathVariable String workspaceId) {
        return skillService.listSkills(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/skills")
    public Skill createSkill(@PathVariable String workspaceId, @RequestBody Map<String, String> body) {
        return skillService.createSkill(authenticatedUser.id(), workspaceId,
                body.get("name"), body.get("category"));
    }

    /** People-graph query: who holds this skill in the workspace. */
    @GetMapping("/skills/{skillId}/people")
    public List<PersonSkill> peopleWithSkill(@PathVariable String workspaceId, @PathVariable String skillId) {
        return skillService.peopleWithSkill(authenticatedUser.id(), workspaceId, skillId);
    }

    @GetMapping("/people/{userId}/skills")
    public List<PersonSkill> personSkills(@PathVariable String workspaceId, @PathVariable String userId) {
        return skillService.personSkills(authenticatedUser.id(), workspaceId, userId);
    }

    @PostMapping("/people/{userId}/skills")
    public PersonSkill addPersonSkill(@PathVariable String workspaceId, @PathVariable String userId,
                                      @RequestBody Map<String, String> body) {
        return skillService.addPersonSkill(authenticatedUser.id(), workspaceId, userId,
                body.get("skillId"), body.get("proficiency"));
    }
}
