package com.bcits.works.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Finish passwordless passkey authentication (pre-auth, so the userId travels in the body). Carries
 * either:
 * <ul>
 *   <li><b>Real FIDO2</b> (when {@code app.webauthn.fido2-enabled}): {@code authenticatorData} +
 *       {@code clientDataJSON} + {@code signature} (+ optional {@code userHandle}), all base64url,
 *       from {@code navigator.credentials.get()}.</li>
 *   <li><b>Legacy signed-nonce</b> (default): {@code signature} over the server challenge.</li>
 * </ul>
 * {@code userId} and {@code credentialId} are always required; the path-specific fields are validated
 * in {@link com.bcits.works.WebAuthnService}.
 */
public record PasskeyAuthFinishRequest(
        @NotBlank(message = "userId is required") String userId,
        @NotBlank(message = "credentialId is required") String credentialId,
        String signature,
        String authenticatorData,
        String clientDataJSON,
        String userHandle
) {}
