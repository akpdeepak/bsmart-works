package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProjectTeamMemberRepository extends JpaRepository<ProjectTeamMember, String> {
    Optional<ProjectTeamMember> findByProjectIdAndUserId(String projectId, String userId);
    List<ProjectTeamMember> findByProjectIdOrderByCreatedAtAsc(String projectId);
}
