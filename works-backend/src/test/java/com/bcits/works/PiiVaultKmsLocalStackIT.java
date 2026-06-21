package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;

import java.security.SecureRandom;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Non-prod validation of the real {@link AwsKmsProvider} code path against LocalStack KMS — the exact
 * AWS SDK calls (encrypt / decrypt / generateDataKey / enableKeyRotation) run against a local AWS KMS,
 * no real AWS account needed (RB-40 §3/§4, EPIC-P1-pii-vault Slice 5; Deepak does the real AWS prod
 * config at launch). Proves the per-subject DEK wrap→unwrap round-trips through real KMS and that a
 * wrapped DEK is opaque ciphertext at rest.
 */
@Tag("integration")
@Testcontainers
class PiiVaultKmsLocalStackIT {

    @Container
    static final LocalStackContainer LOCALSTACK = new LocalStackContainer(
            DockerImageName.parse("localstack/localstack:3.4"))
            .withServices(LocalStackContainer.Service.KMS);

    private static KmsClient kmsClient() {
        return KmsClient.builder()
                .region(Region.of(LOCALSTACK.getRegion()))
                .endpointOverride(LOCALSTACK.getEndpointOverride(LocalStackContainer.Service.KMS))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(LOCALSTACK.getAccessKey(), LOCALSTACK.getSecretKey())))
                .build();
    }

    private static AwsKmsProvider providerFor(KmsClient client, String defaultKeyId) {
        KmsProperties props = new KmsProperties();
        props.setRegion(LOCALSTACK.getRegion());
        props.setDefaultKeyId(defaultKeyId);
        WorkspaceSecuritySettingsRepository settings = mock(WorkspaceSecuritySettingsRepository.class);
        when(settings.findById("WS-KMS")).thenReturn(Optional.empty()); // → platform default key
        return new AwsKmsProvider(props, settings, region -> client);
    }

    @Test
    void perSubjectDek_wrapsAndUnwrapsThroughRealKms() {
        try (KmsClient client = kmsClient()) {
            String keyId = client.createKey().keyMetadata().arn();
            AwsKmsProvider provider = providerFor(client, keyId);

            byte[] dek = new byte[32];
            new SecureRandom().nextBytes(dek);

            KmsProvider.WrappedKey wrapped = provider.wrapDataKey("WS-KMS", dek);
            // Wrapped blob is real KMS ciphertext — not the plaintext DEK.
            assertThat(wrapped.kekRef()).isEqualTo(keyId);
            assertThat(wrapped.wrapped()).isNotBlank();
            assertThat(java.util.Base64.getDecoder().decode(wrapped.wrapped())).isNotEqualTo(dek);

            byte[] unwrapped = provider.unwrapDataKey("WS-KMS", wrapped.kekRef(), wrapped.wrapped());
            assertThat(unwrapped).isEqualTo(dek);
        }
    }

    @Test
    void rotateKek_enablesRotationAndKeepsExistingWrappedDeksDecryptable() {
        try (KmsClient client = kmsClient()) {
            String keyId = client.createKey().keyMetadata().arn();
            AwsKmsProvider provider = providerFor(client, keyId);

            byte[] dek = new byte[32];
            new SecureRandom().nextBytes(dek);
            KmsProvider.WrappedKey wrapped = provider.wrapDataKey("WS-KMS", dek);

            String ref = provider.rotateKek("WS-KMS");
            assertThat(ref).isEqualTo(keyId); // ARN unchanged; AWS rotates the material transparently

            // The DEK wrapped before rotation is still unwrappable (old material retained).
            assertThat(provider.unwrapDataKey("WS-KMS", wrapped.kekRef(), wrapped.wrapped())).isEqualTo(dek);
        }
    }

    @Test
    void generateDataKey_returnsAes256Material() {
        try (KmsClient client = kmsClient()) {
            String keyId = client.createKey().keyMetadata().arn();
            String material = providerFor(client, keyId).generateDataKey("WS-KMS");
            assertThat(java.util.Base64.getDecoder().decode(material)).hasSize(32); // AES-256
        }
    }
}
