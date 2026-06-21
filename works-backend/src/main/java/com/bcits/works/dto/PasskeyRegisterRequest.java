package com.bcits.works.dto;

/**
 * Finish a passkey registration ceremony (iteration 19 Cap T, RB-40 §4). Carries either:
 * <ul>
 *   <li><b>Real FIDO2</b> (when {@code app.webauthn.fido2-enabled}): {@code attestationObject} +
 *       {@code clientDataJSON} (base64url) from {@code navigator.credentials.create()}; the server
 *       derives the credential id and COSE key from the verified attestation.</li>
 *   <li><b>Legacy signed-nonce</b> (default): {@code credentialId} + {@code publicKeyPem} +
 *       {@code signature} over the server challenge.</li>
 * </ul>
 * Fields are validated in {@link com.bcits.works.WebAuthnService} per the active path (which set of
 * fields is required depends on the flag), so none are {@code @NotBlank} here.
 */
public record PasskeyRegisterRequest(
        String credentialId,
        String publicKeyPem,
        String algorithm,
        String label,
        String transports,
        String signature,
        String workspaceId,
        String attestationObject,
        String clientDataJSON
) {}
