package com.bcits.works.automation;

import com.bcits.works.shared.EncryptionService;
import com.bcits.works.shared.EventService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Persists an OAuth credential and its audit event in one service-owned transaction. */
@Service
public class OAuthCredentialService {

    private final IntegrationCredentialRepository credentials;
    private final EncryptionService encryption;
    private final EventService events;

    public OAuthCredentialService(IntegrationCredentialRepository credentials,
                                  EncryptionService encryption,
                                  EventService events) {
        this.credentials = credentials;
        this.encryption = encryption;
        this.events = events;
    }

    @Transactional
    public void store(String workspaceId, String userId, String provider, String accessToken,
                      String refreshToken, String tokenType, String scopes) {
        IntegrationCredential credential = credentials.findByWorkspaceIdAndProvider(workspaceId, provider)
            .orElseGet(() -> {
                IntegrationCredential fresh = new IntegrationCredential();
                fresh.setId(UUID.randomUUID().toString());
                fresh.setWorkspaceId(workspaceId);
                fresh.setProvider(provider);
                fresh.setCreatedAt(OffsetDateTime.now());
                return fresh;
            });

        credential.setAccessTokenEnc(encryption.encrypt(accessToken));
        if (refreshToken != null) {
            credential.setRefreshTokenEnc(encryption.encrypt(refreshToken));
        }
        credential.setScopes(scopes);
        credential.setTokenType(tokenType != null ? tokenType : "Bearer");
        credential.setUpdatedAt(OffsetDateTime.now());
        credentials.save(credential);
        events.record(workspaceId, "OAUTH_CONNECTED", userId,
            "{\"provider\":\"" + provider + "\",\"workspaceId\":\"" + workspaceId + "\"}");
    }
}
