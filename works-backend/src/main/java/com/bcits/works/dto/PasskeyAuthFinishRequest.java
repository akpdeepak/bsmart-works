package com.bcits.works.dto;

import jakarta.validation.constraints.NotBlank;

/** Finish passwordless passkey authentication: the asserted credential + signature over the
 *  server challenge (pre-auth, so the userId travels in the body). */
public record PasskeyAuthFinishRequest(
        @NotBlank(message = "userId is required") String userId,
        @NotBlank(message = "credentialId is required") String credentialId,
        @NotBlank(message = "signature is required") String signature
) {}
