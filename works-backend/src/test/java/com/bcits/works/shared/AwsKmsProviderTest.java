package com.bcits.works.shared;

import com.bcits.works.WorkspaceSecuritySettings;
import com.bcits.works.WorkspaceSecuritySettingsRepository;


import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.DecryptRequest;
import software.amazon.awssdk.services.kms.model.DecryptResponse;
import software.amazon.awssdk.services.kms.model.EnableKeyRotationRequest;
import software.amazon.awssdk.services.kms.model.EnableKeyRotationResponse;
import software.amazon.awssdk.services.kms.model.EncryptRequest;
import software.amazon.awssdk.services.kms.model.EncryptResponse;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the AWS KMS provider's request/response mapping (RB-40 §3/§4, EPIC-P1-pii-vault
 * Slice 5), using a mock {@link KmsClient} via the injectable factory seam — so the real code path
 * (key resolution, region pinning, encrypt/decrypt round-trip, rotation) is validated deterministically
 * without AWS or a container. The real-endpoint round-trip is covered by {@code PiiVaultKmsLocalStackIT}.
 */
@Tag("unit")
class AwsKmsProviderTest {

    private final KmsClient kms = mock(KmsClient.class);
    private final WorkspaceSecuritySettingsRepository settings = mock(WorkspaceSecuritySettingsRepository.class);
    private Region capturedRegion;

    private AwsKmsProvider provider(KmsProperties props) {
        return new AwsKmsProvider(props, settings, region -> {
            capturedRegion = region;
            return kms;
        });
    }

    private static KmsProperties propsWithDefault(String defaultKey) {
        KmsProperties p = new KmsProperties();
        p.setDefaultKeyId(defaultKey);
        return p;
    }

    private static WorkspaceSecuritySettings settingsWithKey(String keyArn) {
        WorkspaceSecuritySettings s = new WorkspaceSecuritySettings();
        s.setByokKeyRef(keyArn);
        return s;
    }

    /** Loopback: KMS encrypt echoes plaintext as the blob; decrypt echoes it back — so wrap→unwrap round-trips. */
    private void wireLoopback() {
        when(kms.encrypt(any(EncryptRequest.class))).thenAnswer(i -> {
            EncryptRequest r = i.getArgument(0);
            return EncryptResponse.builder().keyId(r.keyId()).ciphertextBlob(r.plaintext()).build();
        });
        when(kms.decrypt(any(DecryptRequest.class))).thenAnswer(i -> {
            DecryptRequest r = i.getArgument(0);
            return DecryptResponse.builder().plaintext(r.ciphertextBlob()).build();
        });
    }

    @Test
    void wrapThenUnwrap_roundTripsUnderTheWorkspaceByokKey_regionPinnedFromArn() {
        String arn = "arn:aws:kms:eu-west-1:111122223333:key/abc-123";
        when(settings.findById("WS-1")).thenReturn(Optional.of(settingsWithKey(arn)));
        wireLoopback();

        byte[] dek = "0123456789abcdef0123456789abcdef".getBytes();
        KmsProvider.WrappedKey wrapped = provider(propsWithDefault("platform-key")).wrapDataKey("WS-1", dek);

        assertThat(wrapped.kekRef()).isEqualTo(arn);
        assertThat(capturedRegion).isEqualTo(Region.of("eu-west-1")); // pinned from the ARN

        byte[] unwrapped = provider(propsWithDefault("platform-key")).unwrapDataKey("WS-1", wrapped.kekRef(), wrapped.wrapped());
        assertThat(unwrapped).isEqualTo(dek);

        ArgumentCaptor<EncryptRequest> cap = ArgumentCaptor.forClass(EncryptRequest.class);
        verify(kms).encrypt(cap.capture());
        assertThat(cap.getValue().keyId()).isEqualTo(arn);
    }

    @Test
    void wrap_fallsBackToPlatformDefaultKey_whenWorkspaceHasNoByok() {
        when(settings.findById("PLATFORM")).thenReturn(Optional.empty());
        wireLoopback();

        provider(propsWithDefault("platform-key")).wrapDataKey("PLATFORM", "deadbeefdeadbeefdeadbeefdeadbeef".getBytes());

        ArgumentCaptor<EncryptRequest> cap = ArgumentCaptor.forClass(EncryptRequest.class);
        verify(kms).encrypt(cap.capture());
        assertThat(cap.getValue().keyId()).isEqualTo("platform-key");
        assertThat(capturedRegion).isEqualTo(Region.of("ap-south-1")); // default region (non-ARN key)
    }

    @Test
    void wrap_throws_whenNoByokAndNoDefaultKeyConfigured() {
        when(settings.findById("WS-X")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> provider(propsWithDefault("")).wrapDataKey("WS-X", new byte[32]))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No KMS key for workspace");
    }

    @Test
    void rotateKek_enablesKeyRotation_andReturnsTheSameKeyRef() {
        String arn = "arn:aws:kms:ap-south-1:111122223333:key/rot-1";
        when(settings.findById("WS-2")).thenReturn(Optional.of(settingsWithKey(arn)));
        when(kms.enableKeyRotation(any(EnableKeyRotationRequest.class)))
                .thenReturn(EnableKeyRotationResponse.builder().build());

        String ref = provider(propsWithDefault("platform-key")).rotateKek("WS-2");

        assertThat(ref).isEqualTo(arn);
        ArgumentCaptor<EnableKeyRotationRequest> cap = ArgumentCaptor.forClass(EnableKeyRotationRequest.class);
        verify(kms).enableKeyRotation(cap.capture());
        assertThat(cap.getValue().keyId()).isEqualTo(arn);
    }
}
