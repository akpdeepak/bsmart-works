package com.bcits.works.automation;

import com.bcits.works.shared.EncryptionService;
import com.bcits.works.shared.EventService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class OAuthCredentialServiceTest {

    private final IntegrationCredentialRepository repository = mock(IntegrationCredentialRepository.class);
    private final EncryptionService encryption = mock(EncryptionService.class);
    private final EventService events = mock(EventService.class);
    private final OAuthCredentialService service = new OAuthCredentialService(repository, encryption, events);

    @Test
    void storeCreatesEncryptedCredentialAndAuditEvent() {
        when(repository.findByWorkspaceIdAndProvider("ws-1", "GITHUB")).thenReturn(Optional.empty());
        when(encryption.encrypt("access")).thenReturn("enc-access");
        when(encryption.encrypt("refresh")).thenReturn("enc-refresh");

        service.store("ws-1", "user-1", "GITHUB", "access", "refresh", "OAuth", "repo");

        ArgumentCaptor<IntegrationCredential> saved = ArgumentCaptor.forClass(IntegrationCredential.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNotBlank();
        assertThat(saved.getValue().getWorkspaceId()).isEqualTo("ws-1");
        assertThat(saved.getValue().getProvider()).isEqualTo("GITHUB");
        assertThat(saved.getValue().getAccessTokenEnc()).isEqualTo("enc-access");
        assertThat(saved.getValue().getRefreshTokenEnc()).isEqualTo("enc-refresh");
        assertThat(saved.getValue().getTokenType()).isEqualTo("OAuth");
        assertThat(saved.getValue().getScopes()).isEqualTo("repo");
        assertThat(saved.getValue().getCreatedAt()).isNotNull();
        assertThat(saved.getValue().getUpdatedAt()).isNotNull();
        verify(events).record("ws-1", "OAUTH_CONNECTED", "user-1",
            "{\"provider\":\"GITHUB\",\"workspaceId\":\"ws-1\"}");
    }

    @Test
    void storeUpdatesExistingCredentialWithoutDiscardingRefreshToken() {
        IntegrationCredential existing = new IntegrationCredential();
        existing.setRefreshTokenEnc("existing-refresh");
        when(repository.findByWorkspaceIdAndProvider("ws-1", "SLACK")).thenReturn(Optional.of(existing));
        when(encryption.encrypt("new-access")).thenReturn("enc-new-access");

        service.store("ws-1", "user-1", "SLACK", "new-access", null, null, "channels:read");

        verify(encryption, never()).encrypt(null);
        verify(repository).save(existing);
        assertThat(existing.getAccessTokenEnc()).isEqualTo("enc-new-access");
        assertThat(existing.getRefreshTokenEnc()).isEqualTo("existing-refresh");
        assertThat(existing.getTokenType()).isEqualTo("Bearer");
        assertThat(existing.getScopes()).isEqualTo("channels:read");
    }
}
