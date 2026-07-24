package com.bcits.works.workspaces.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamRepository extends JpaRepository<Team, String> {
    List<Team> findByWorkspaceIdOrderByNameAsc(String workspaceId);
}
