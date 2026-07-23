package com.bcits.works.workspaces;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Workspace-scoped access to the skill catalogue (derived queries carry the workspace predicate). */
public interface SkillRepository extends JpaRepository<Skill, String> {
    List<Skill> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    boolean existsByWorkspaceIdAndName(String workspaceId, String name);
}
