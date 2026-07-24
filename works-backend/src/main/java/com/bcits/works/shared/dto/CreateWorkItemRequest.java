package com.bcits.works.shared.dto;
import com.bcits.works.projects.api.Project;

import jakarta.validation.constraints.NotBlank;

public record CreateWorkItemRequest(
        @NotBlank(message = "Title is required")
        String title,

        @NotBlank(message = "Project ID is required")
        String projectId,

        String description,
        String type,
        String status,
        String assigneeId,
        String priority,
        String dueDate,
        String parentId,
        String sprintId,
        Integer storyPoints
) {}
