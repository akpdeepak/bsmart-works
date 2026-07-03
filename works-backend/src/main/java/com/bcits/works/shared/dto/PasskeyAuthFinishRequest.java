package com.bcits.works.shared.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Finish passwordless passkey authentication (pre-auth, so the userId travels in the body). Carries
 * the real FIDO2 assertion from {@code navigator.credentials.get()} — {@code authenticatorData} +
 * {@code clientDataJSON} + {@code signature} (all base64url), plus the optional discoverable-credential
 * {@code userHandle}. {@code userId} and {@code credentialId} identify the account and credential.
 */
public record PasskeyAuthFinishRequest(
        @NotBlank(message = "userId is required") String userId,
        @NotBlank(message = "credentialId is required") String credentialId,
        @NotBlank(message = "signature is required") String signature,
        @NotBlank(message = "authenticatorData is required") String authenticatorData,
        @NotBlank(message = "clientDataJSON is required") String clientDataJSON,
        String userHandle
) {}
