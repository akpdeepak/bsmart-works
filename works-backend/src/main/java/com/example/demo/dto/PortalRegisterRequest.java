package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Customer portal self-registration (iteration 9, Cap N). A customer joins a specific organization
 * (and therefore a specific tenant workspace) identified by {@code subdomain}; the server resolves
 * the org from it so the customer can never pick a workspace directly.
 */
public record PortalRegisterRequest(
        @NotBlank(message = "Portal is required")
        String subdomain,

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        String email,

        @NotBlank(message = "Full name is required")
        String fullName,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password
) {}
