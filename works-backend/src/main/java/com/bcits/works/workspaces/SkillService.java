package com.bcits.works.workspaces;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * People Graph / Skills (EPIC-22): a workspace-scoped skill catalogue and the "who knows what" graph.
 * Every read asserts workspace membership (404 for non-members — a foreign workspace's skills are
 * never revealed), and writes gate through {@link RbacGate}. Tenant isolation (RB-40 §1): all queries
 * are workspace-scoped and a caller can never see or mutate another workspace's graph.
 */
@Service
public class SkillService {

    private static final Set<String> PROFICIENCIES = Set.of("BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT");

    private final SkillRepository skills;
    private final PersonSkillRepository personSkills;
    private final RbacGate rbac;

    public SkillService(SkillRepository skills, PersonSkillRepository personSkills, RbacGate rbac) {
        this.skills = skills;
        this.personSkills = personSkills;
        this.rbac = rbac;
    }

    private void requireMember(String callerId, String workspaceId) {
        if (workspaceId == null || rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
    }

    // ── Skill catalogue ────────────────────────────────────────────────────────

    public List<Skill> listSkills(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        return skills.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @Transactional
    public Skill createSkill(String callerId, String workspaceId, String name, String category) {
        rbac.require(callerId, workspaceId, "create_items");
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("SKILL_NAME_REQUIRED", "A skill name is required.");
        }
        String trimmed = name.trim();
        if (skills.existsByWorkspaceIdAndName(workspaceId, trimmed)) {
            throw ApiException.conflict("A skill with that name already exists in this workspace.");
        }
        Skill s = new Skill();
        s.setId("SKL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setWorkspaceId(workspaceId);
        s.setName(trimmed);
        s.setCategory(category == null || category.isBlank() ? null : category.trim());
        s.setCreatedAt(OffsetDateTime.now());
        return skills.save(s);
    }

    // ── People graph edges ───────────────────────────────────────────────────────

    /** Skills held by a person in this workspace. */
    public List<PersonSkill> personSkills(String callerId, String workspaceId, String userId) {
        requireMember(callerId, workspaceId);
        return personSkills.findByWorkspaceIdAndUserId(workspaceId, userId);
    }

    /** The people-graph query: users who hold {@code skillId} in this workspace. */
    public List<PersonSkill> peopleWithSkill(String callerId, String workspaceId, String skillId) {
        requireMember(callerId, workspaceId);
        return personSkills.findByWorkspaceIdAndSkillId(workspaceId, skillId);
    }

    @Transactional
    public PersonSkill addPersonSkill(String callerId, String workspaceId, String userId,
                                      String skillId, String proficiency) {
        rbac.require(callerId, workspaceId, "create_items");
        String prof = proficiency == null || proficiency.isBlank()
                ? "INTERMEDIATE" : proficiency.trim().toUpperCase();
        if (!PROFICIENCIES.contains(prof)) {
            throw ApiException.badRequest("INVALID_PROFICIENCY",
                    "Proficiency must be one of " + PROFICIENCIES + ".");
        }
        // The skill must exist in THIS workspace (prevents linking to a foreign or missing skill).
        Skill skill = skills.findById(skillId)
                .orElseThrow(() -> ApiException.notFound("Skill", skillId));
        if (!workspaceId.equals(skill.getWorkspaceId())) {
            throw ApiException.notFound("Skill", skillId);
        }
        if (personSkills.existsByWorkspaceIdAndUserIdAndSkillId(workspaceId, userId, skillId)) {
            throw ApiException.conflict("That person already has this skill.");
        }
        PersonSkill ps = new PersonSkill();
        ps.setId("PSK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        ps.setWorkspaceId(workspaceId);
        ps.setUserId(userId);
        ps.setSkillId(skillId);
        ps.setProficiency(prof);
        ps.setCreatedAt(OffsetDateTime.now());
        return personSkills.save(ps);
    }
}
