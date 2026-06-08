package com.bcits.works.dto;

import jakarta.validation.constraints.NotBlank;

/** Finish a passkey registration ceremony: the new credential + a signature over the server
 *  challenge proving possession of the private key (iteration 19 Cap T). */
public record PasskeyRegisterRequest(
        @NotBlank(message = "credentialId is required") String credentialId,
        @NotBlank(message = "publicKeyPem is required") String publicKeyPem,
        String algorithm,
        String label,
        String transports,
        @NotBlank(message = "signature is required") String signature,
        String workspaceId
) {}
