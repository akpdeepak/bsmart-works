# PII Vault — KMS / BYOK configuration (prod & non-prod)

> **Single source for every KMS knob** behind the PII vault (RB-40 §3/§4, EPIC-P1-pii-vault Slice 5).
> The per-subject crypto-shred vault wraps each subject's data key (DEK) under a Key-Encryption-Key
> (KEK). Which provider custodies the KEK is chosen at startup:
>
> | Provider | When active | KEK custody |
> |---|---|---|
> | `LocalKmsProvider` (default) | no AWS credentials configured | KEK derived from the `ENCRYPTION_KEY` master secret (dev/test/non-BYOK) |
> | `AwsKmsProvider` | `cloud.aws.credentials.access-key` is set | AWS KMS (BYOK per workspace, or a platform default key) |
>
> Crypto-shred is the same in both: destroying a subject's `subject_data_keys` row makes its DEK — and
> any lingering ciphertext, including backups — permanently unrecoverable (RB-40 §3 rule 2).

---

## 1. Activation

`AwsKmsProvider` is `@ConditionalOnProperty("cloud.aws.credentials.access-key")`. Set AWS credentials
(via that property, env, instance role, or profile) **and** that marker property to switch the vault's
KEK custody to AWS KMS. With it unset, `LocalKmsProvider` is the default — no AWS dependency is exercised.

## 2. Configuration keys — `pii.vault.kms.*` (bound by `KmsProperties`)

| Key | Env var | Default | Meaning |
|---|---|---|---|
| `pii.vault.kms.region` | `PII_VAULT_KMS_REGION` | `ap-south-1` | Default AWS region for KMS calls when a key reference is **not** a region-qualified ARN. Data residency: India. |
| `pii.vault.kms.default-key-id` | `PII_VAULT_KMS_DEFAULT_KEY_ID` | *(blank)* | Platform KMS key id/ARN used to wrap a subject DEK when the workspace has no BYOK key, **and** for the global `PLATFORM`-scope user identity. **Required in prod** (else identity vaulting throws). |
| `pii.vault.kms.endpoint-override` | `PII_VAULT_KMS_ENDPOINT_OVERRIDE` | *(blank)* | **Non-prod only.** A KMS endpoint URL (e.g. LocalStack). When set, static credentials below are used instead of the AWS credential chain. **Leave blank in prod.** |
| `pii.vault.kms.access-key` | `PII_VAULT_KMS_ACCESS_KEY` | `test` | Static access key for the endpoint-override path. Ignored in prod. |
| `pii.vault.kms.secret-key` | `PII_VAULT_KMS_SECRET_KEY` | `test` | Static secret key for the endpoint-override path. Ignored in prod. |
| `workspace_security_settings.byok_key_ref` (per-workspace DB column) | — | *(null)* | A workspace's **BYOK** KMS key ARN. Takes precedence over the platform default. Its ARN region **pins** all KMS calls for that workspace's keys to the key's region. |
| `ENCRYPTION_KEY` / `encryption.master-key` | `ENCRYPTION_KEY` | *(ephemeral)* | The `LocalKmsProvider` master secret (and the value-encryption key). Prod **must** set this even with AWS KMS, as it backs value AES-GCM and the local fallback. |

**Region pinning.** When a key reference is a full ARN (`arn:aws:kms:<region>:<acct>:key/<id>`) the KMS
client is built for that region, so each workspace's keys stay in their declared residency region. A
bare key id falls back to `pii.vault.kms.region`.

## 3. Non-prod validation (LocalStack — no real AWS)

The exact `AwsKmsProvider` code path is validated against **LocalStack KMS** in
`PiiVaultKmsLocalStackIT` (`@Tag("integration")`, Testcontainers `localstack/localstack:3.4`): it
creates a KMS key, wraps a DEK, asserts the wrapped blob is opaque ciphertext at rest, unwraps it
back, enables rotation, and generates an AES-256 data key — all through the real AWS SDK v2.

To point a **running** non-prod app at a shared LocalStack instead:

```properties
cloud.aws.credentials.access-key=test            # activates AwsKmsProvider
cloud.aws.credentials.secret-key=test
pii.vault.kms.endpoint-override=http://localhost:4566
pii.vault.kms.region=us-east-1
pii.vault.kms.default-key-id=<arn from `awslocal kms create-key`>
```

## 4. Production setup (operator checklist — done by Deepak at launch)

1. Create a **customer-managed KMS key** per residency region (and per BYOK workspace where required);
   enable **automatic key rotation** (`AwsKmsProvider.rotateKek` enables it; rotation is transparent —
   the ARN, and the stored `kekRef`, are unchanged and old wrapped DEKs stay decryptable).
2. Set `workspace_security_settings.byok_key_ref` to the workspace's key ARN; set
   `pii.vault.kms.default-key-id` to the platform key ARN (covers the `PLATFORM`-scope user identity +
   workspaces without BYOK).
3. Grant the app's IAM principal `kms:Encrypt`, `kms:Decrypt`, `kms:GenerateDataKey`,
   `kms:ReEncrypt*`, `kms:EnableKeyRotation` on those keys only. Use the default AWS credential chain
   (instance role) — leave `pii.vault.kms.endpoint-override` blank.
4. **Key retention ≤ backup retention** (RB-40 §3 rule 2): the KMS scheduled-deletion window for a
   destroyed key must outlive the longest DB/backup retention, and a deleted key must not be
   resurrectable from a key-store backup, so erasure holds across restores. Validate with legal/DPO.
5. Roll out the read switches as in `EPIC-P1-pii-vault-completion.md` (backfill → `read-from-vault`
   → `login-via-blind-index`).

## 5. Status

- ✅ `AwsKmsProvider` implemented against AWS SDK v2 KMS (wrap/unwrap/generateDataKey/reEncrypt/rotate),
  region-pinned, BYOK-per-workspace + platform-default, validated non-prod against LocalStack.
  Supersedes the throwing stub (TD-022).
- ⏳ Real AWS account provisioning (keys, IAM, retention windows) — operator step at prod launch.
