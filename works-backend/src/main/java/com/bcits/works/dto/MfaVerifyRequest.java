package com.bcits.works.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** MFA verification during the login challenge (pre-authentication, so userId travels in the body). */
public record MfaVerifyRequest(
        @NotBlank(message = "userId is required")
        String userId,

        @NotBlank(message = "TOTP code is required")
        @Pattern(regexp = "\\d{6}", message = "TOTP code must be 6 digits")
        String totp
) {}
