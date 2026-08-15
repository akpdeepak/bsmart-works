package com.bcits.works.projects;

import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;
import com.bcits.works.shared.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectSequenceService {

    private final JdbcTemplate jdbc;
    private final ProjectRepository projectRepository;

    public ProjectSequenceService(JdbcTemplate jdbc, ProjectRepository projectRepository) {
        this.jdbc = jdbc;
        this.projectRepository = projectRepository;
    }

    /**
     * Generates the next display key for a project (e.g. PROJ-1).
     * Uses a separate REQUIRES_NEW transaction to ensure the sequence increments immediately
     * and is not rolled back if the outer transaction fails, preventing gaps/conflicts.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generateNextKey(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project", projectId));
        
        String prefix = project.getKeyPrefix() != null && !project.getKeyPrefix().isBlank() 
                        ? project.getKeyPrefix() 
                        : "ITEM";

        // Insert or Update the sequence
        Long nextVal = jdbc.queryForObject(
            "INSERT INTO project_sequences (project_id, workspace_id, next_val) " +
            "VALUES (?, ?, 2) " +
            "ON CONFLICT (project_id) DO UPDATE SET next_val = project_sequences.next_val + 1 " +
            "RETURNING next_val - 1",
            Long.class,
            projectId, project.getWorkspaceId()
        );

        return prefix + "-" + nextVal;
    }
}
