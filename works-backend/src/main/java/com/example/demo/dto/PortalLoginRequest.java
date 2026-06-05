package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Customer portal sign-in (iteration 9, Cap N). The {@code subdomain} binds the login to one
 * organization/workspace so the email lookup stays workspace-scoped (RB-40 §1).
 */
public record PortalLoginRequest(
        @NotBlank(message = "Portal is required")
        String subdomain,

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        String email,

        @NotBlank(message = "Password is required")
        String password
) {}
