package com.bcits.works.shared.dto;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.Sprint;

import jakarta.validation.constraints.NotBlank;

public record CreateSprintRequest(
        @NotBlank(message = "Sprint name is required")
        String name,

        @NotBlank(message = "Project ID is required")
        String projectId,

        String goal,
        String startDate,
        String endDate,
        Integer capacity
) {}
