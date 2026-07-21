package com.bcits.works.shared.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Begin passwordless passkey authentication — identify the account by email (pre-auth). */
public record PasskeyAuthBeginRequest(
        @NotBlank(message = "email is required") @Email(message = "must be a valid email") String email
) {}
