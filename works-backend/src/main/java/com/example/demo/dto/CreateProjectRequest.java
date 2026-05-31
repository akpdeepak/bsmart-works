package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank(message = "Project name is required")
        String name,

        @NotBlank(message = "Project key is required")
        @Size(min = 2, max = 10, message = "Project key must be 2–10 characters")
        @Pattern(regexp = "[A-Z0-9]+", message = "Project key must be uppercase letters and digits only")
        String key,

        String description,
        String leadId,
        String workspaceId
) {}
