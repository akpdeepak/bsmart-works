package com.bcits.works;

import com.bcits.works.shared.EncryptionService;
import com.bcits.works.shared.LocalKmsProvider;
import com.bcits.works.shared.SubjectDataKey;
import com.bcits.works.shared.SubjectDataKeyRepository;
import com.bcits.works.shared.PiiVaultEntry;
import com.bcits.works.shared.PiiVaultRepository;
import com.bcits.works.shared.PiiVaultService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the PII-vault crypto-shred loop (RB-40 §3) with real AES-256-GCM + a master-key-
 * derived KEK (LocalKmsProvider; no real KMS). Backs the JPA repositories with in-memory maps so the
 * full put → resolve → forget behaviour is exercised deterministically:
 * <ul>
 *   <li>put then resolve round-trips the plaintext; the stored value is ciphertext, never plaintext;</li>
 *   <li>forget destroys the per-subject key + purges the rows → resolve yields "[erased]" and writes
 *       are refused (the three binding rules, §8);</li>
 *   <li>resolution is workspace-isolated (RB-40 §1).</li>
 * </ul>
 */
@Tag("unit")
class PiiVaultServiceTest {

    private final Map<String, SubjectDataKey> keyStore = new HashMap<>();
    private final List<PiiVaultEntry> vaultStore = new ArrayList<>();
    private PiiVaultService service;

    private static String mapKey(String ws, String subj) {
        return ws + "|" + subj;
    }

    @BeforeEach
    void setup() {
        keyStore.clear();
        vaultStore.clear();

        SubjectDataKeyRepository keys = mock(SubjectDataKeyRepository.class);
        when(keys.findByWorkspaceIdAndSubjectId(anyString(), anyString())).thenAnswer(inv ->
            Optional.ofNullable(keyStore.get(mapKey(inv.getArgument(0), inv.getArgument(1)))));
        when(keys.save(any(SubjectDataKey.class))).thenAnswer(inv -> {
            SubjectDataKey k = inv.getArgument(0);
            keyStore.put(mapKey(k.getWorkspaceId(), k.getSubjectId()), k);
            return k;
        });

        PiiVaultRepository vault = mock(PiiVaultRepository.class);
        when(vault.findByWorkspaceIdAndSubjectId(anyString(), anyString())).thenAnswer(inv -> {
            String ws = inv.getArgument(0);
            String subj = inv.getArgument(1);
            List<PiiVaultEntry> out = new ArrayList<>();
            for (PiiVaultEntry e : vaultStore) {
                if (e.getWorkspaceId().equals(ws) && e.getSubjectId().equals(subj)) {
                    out.add(e);
                }
            }
            return out;
        });
        when(vault.save(any(PiiVaultEntry.class))).thenAnswer(inv -> {
            PiiVaultEntry e = inv.getArgument(0);
            vaultStore.removeIf(x -> x.getId().equals(e.getId()));
            vaultStore.add(e);
            return e;
        });
        doAnswer(inv -> {
            Iterable<PiiVaultEntry> toDelete = inv.getArgument(0);
            for (PiiVaultEntry e : toDelete) {
                vaultStore.removeIf(x -> x.getId().equals(e.getId()));
            }
            return null;
        }).when(vault).deleteAll(any());

        service = new PiiVaultService(vault, keys, new LocalKmsProvider(), new EncryptionService(""));
    }

    @Test
    void put_thenResolve_roundTripsThePlaintext() {
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Johnson");

        assertThat(service.resolve("WS-A", "subj-1", PiiVaultService.TYPE_NAME)).contains("Alice Johnson");
        // Stored at rest as ciphertext, never plaintext.
        assertThat(vaultStore).hasSize(1);
        assertThat(vaultStore.get(0).getEncryptedValue()).doesNotContain("Alice");
    }

    @Test
    void put_isUpsert_onePerType() {
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Johnson");
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Smith");

        assertThat(vaultStore).hasSize(1);
        assertThat(service.resolve("WS-A", "subj-1", PiiVaultService.TYPE_NAME)).contains("Alice Smith");
    }

    @Test
    void forget_cryptoShreds_resolveReturnsErased_andWritesAreRefused() {
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Johnson");
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_EMAIL, "alice@example.com");

        service.forget("WS-A", "subj-1");

        // Per-subject key destroyed; vault rows purged.
        assertThat(keyStore.get(mapKey("WS-A", "subj-1")).isShredded()).isTrue();
        assertThat(keyStore.get(mapKey("WS-A", "subj-1")).getWrappedDek()).isNull();
        assertThat(vaultStore).isEmpty();
        // Resolve now yields the erased marker (rule 3 — projections re-derive to "[erased]").
        assertThat(service.resolve("WS-A", "subj-1", PiiVaultService.TYPE_NAME))
            .contains(PiiVaultService.ERASED);
        // Writing PII for a crypto-shredded subject is refused.
        assertThatThrownBy(() -> service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice again"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void forget_isIdempotent() {
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Johnson");
        service.forget("WS-A", "subj-1");
        // second forget is a no-op, not an error
        service.forget("WS-A", "subj-1");
        assertThat(service.resolve("WS-A", "subj-1", PiiVaultService.TYPE_NAME))
            .contains(PiiVaultService.ERASED);
    }

    @Test
    void resolve_isWorkspaceIsolated() {
        service.put("WS-A", "subj-1", PiiVaultService.TYPE_NAME, "Alice Johnson");
        // A different workspace cannot resolve another workspace's subject token (RB-40 §1).
        assertThat(service.resolve("WS-B", "subj-1", PiiVaultService.TYPE_NAME)).isEmpty();
    }

    @Test
    void resolve_unknownSubject_isEmpty() {
        assertThat(service.resolve("WS-A", "subj-unknown", PiiVaultService.TYPE_NAME)).isEmpty();
    }
}
