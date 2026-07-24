package com.bcits.works.workspaces;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Workspace-scoped people-graph edges (derived queries carry the workspace predicate; RB-40 §1). */
public interface PersonSkillRepository extends JpaRepository<PersonSkill, String> {
    List<PersonSkill> findByWorkspaceIdAndUserId(String workspaceId, String userId);
    List<PersonSkill> findByWorkspaceIdAndSkillId(String workspaceId, String skillId);
    boolean existsByWorkspaceIdAndUserIdAndSkillId(String workspaceId, String userId, String skillId);
}
