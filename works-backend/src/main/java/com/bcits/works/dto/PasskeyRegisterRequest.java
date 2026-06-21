package com.bcits.works.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Finish a passkey registration ceremony (iteration 19 Cap T, RB-40 §4). Carries the real FIDO2
 * attestation from {@code navigator.credentials.create()} — {@code attestationObject} +
 * {@code clientDataJSON} (base64url); the server derives the credential id and COSE key from the
 * verified attestation. {@code label}/{@code transports}/{@code workspaceId} are display/context only.
 */
public record PasskeyRegisterRequest(
        @NotBlank(message = "attestationObject is required") String attestationObject,
        @NotBlank(message = "clientDataJSON is required") String clientDataJSON,
        String label,
        String transports,
        String workspaceId
) {}
