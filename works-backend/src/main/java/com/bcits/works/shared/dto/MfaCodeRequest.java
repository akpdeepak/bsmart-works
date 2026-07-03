package com.bcits.works.shared.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** A 6-digit TOTP code for MFA confirm / disable. */
public record MfaCodeRequest(
        @NotBlank(message = "TOTP code is required")
        @Pattern(regexp = "\\d{6}", message = "TOTP code must be 6 digits")
        String totp
) {}
