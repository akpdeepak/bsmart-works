package com.bcits.works.shared;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Single, centralized source of all AWS KMS / BYOK configuration for the PII vault
 * (RB-40 §3/§4, EPIC-P1-pii-vault Slice 5). Bound from {@code pii.vault.kms.*}. The full prod /
 * non-prod configuration recipe is documented in {@code docs/compliance/PII-VAULT-KMS-CONFIG.md}.
 *
 * <p>The provider itself ({@link AwsKmsProvider}) only activates when AWS credentials are present
 * ({@code cloud.aws.credentials.access-key}); otherwise {@link LocalKmsProvider} is the default. These
 * properties supply the region, the platform default key, and — for non-prod (LocalStack) — the
 * endpoint override + static test credentials, so the same code path is validated without real AWS.
 */
@Component
@ConfigurationProperties(prefix = "pii.vault.kms")
public class KmsProperties {

    /** Default AWS region for the KMS client when a key reference is not a region-qualified ARN.
     *  Data residency: India → {@code ap-south-1}. Per-workspace keys pin their own region via the ARN. */
    private String region = "ap-south-1";

    /** Platform-managed KMS key id/ARN used to wrap a subject DEK when the workspace has no BYOK key
     *  ({@code workspace_security_settings.byok_key_ref}). Blank → BYOK is mandatory per workspace. */
    private String defaultKeyId = "";

    /** Non-prod only: a KMS endpoint override (e.g. a LocalStack URL). Blank in prod → the real AWS
     *  KMS endpoint for the region is used. When set, {@link #accessKey}/{@link #secretKey} static
     *  credentials are used instead of the default AWS credential chain. */
    private String endpointOverride = "";

    /** Static access key for the endpoint-override (non-prod / LocalStack) path. Ignored in prod. */
    private String accessKey = "test";

    /** Static secret key for the endpoint-override (non-prod / LocalStack) path. Ignored in prod. */
    private String secretKey = "test";

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getDefaultKeyId() { return defaultKeyId; }
    public void setDefaultKeyId(String defaultKeyId) { this.defaultKeyId = defaultKeyId; }
    public String getEndpointOverride() { return endpointOverride; }
    public void setEndpointOverride(String endpointOverride) { this.endpointOverride = endpointOverride; }
    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }

    /** True when a non-prod endpoint override (e.g. LocalStack) is configured. */
    public boolean hasEndpointOverride() {
        return endpointOverride != null && !endpointOverride.isBlank();
    }
}
