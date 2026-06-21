package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * AWS KMS-backed {@link KmsProvider} for production BYOK (B31, RB-40 §4).
 * Active when {@code AWS_ACCESS_KEY_ID} is set; the {@link LocalKmsProvider} is the fallback.
 *
 * <p>Actual KMS API calls (GenerateDataKey, ReEncrypt) require the AWS SDK for Java v2
 * ({@code software.amazon.awssdk:kms}). This stub is intentionally not wired to the real SDK
 * yet — the SDK dependency and KMS ARN policy must be reviewed with Deepak and legal/DPO
 * before key material is handled in production (RB-40 §3, TD-022).
 *
 * <p>The stub logs clearly so any attempt to use it in production is auditable.
 */
@Component
@ConditionalOnProperty(name = "cloud.aws.credentials.access-key")
public class AwsKmsProvider implements KmsProvider {

    private static final Logger log = LoggerFactory.getLogger(AwsKmsProvider.class);

    @Override
    public String name() {
        return "aws-kms";
    }

    @Override
    public String generateDataKey(String workspaceId) {
        log.warn("[AWS-KMS] generateDataKey stub called for workspace={}. Wire AWS SDK when KMS policy is approved.", workspaceId);
        // TODO: software.amazon.awssdk.services.kms.KmsClient.generateDataKey(...)
        // using the KMS key ARN stored in workspace_security_settings.byok_key_ref
        throw new UnsupportedOperationException(
            "AWS KMS integration requires the AWS SDK and KMS key ARN. "
                + "See TD-022 and RB-40 §3 — obtain legal/DPO sign-off before enabling.");
    }

    @Override
    public String reEncrypt(String workspaceId, String oldKeyRef, String newKeyRef, String ciphertext) {
        log.warn("[AWS-KMS] reEncrypt stub called for workspace={}", workspaceId);
        throw new UnsupportedOperationException(
            "AWS KMS re-encryption requires the AWS SDK. See TD-022.");
    }

    @Override
    public WrappedKey wrapDataKey(String workspaceId, byte[] dek) {
        log.warn("[AWS-KMS] wrapDataKey stub called for workspace={}", workspaceId);
        // TODO: KmsClient.encrypt(...) under the workspace KMS key ARN (byok_key_ref) to wrap the DEK.
        throw new UnsupportedOperationException(
            "AWS KMS DEK wrapping requires the AWS SDK and KMS key ARN. "
                + "See TD-022 and RB-40 §3 — obtain legal/DPO sign-off before enabling.");
    }

    @Override
    public byte[] unwrapDataKey(String workspaceId, String kekRef, String wrappedDek) {
        log.warn("[AWS-KMS] unwrapDataKey stub called for workspace={}", workspaceId);
        // TODO: KmsClient.decrypt(...) to unwrap the DEK under the workspace KMS key ARN.
        throw new UnsupportedOperationException(
            "AWS KMS DEK unwrapping requires the AWS SDK. See TD-022.");
    }

    @Override
    public String rotateKek(String workspaceId) {
        log.warn("[AWS-KMS] rotateKek stub called for workspace={}", workspaceId);
        throw new UnsupportedOperationException(
            "AWS KMS key rotation requires the AWS SDK. See TD-022.");
    }
}
