package com.bcits.works;
import com.bcits.works.security.CustomerAttributionPiiService;
import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the free-text customer-attribution vault glue (RB-40 §3, EPIC-P1-pii-vault Slice 3) —
 * the denormalised chat customer_name / feedback customer copies.
 */
@Tag("unit")
class CustomerAttributionPiiServiceTest {

    private final PiiVaultService vault = mock(PiiVaultService.class);
    private final PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
    private final CustomerAttributionPiiService svc = new CustomerAttributionPiiService(vault, policy);

    @Test
    void ensureVaulted_mintsTokenAndVaults_whenEnabled() {
        when(policy.isEnabled()).thenReturn(true);
        when(vault.mintSubjectToken()).thenReturn("subj-new");

        String token = svc.ensureVaulted("WS-1", null, "Acme Corp");

        assertThat(token).isEqualTo("subj-new");
        verify(vault).put("WS-1", "subj-new", PiiVaultService.TYPE_NAME, "Acme Corp");
    }

    @Test
    void ensureVaulted_reusesExistingToken_onUpdate() {
        when(policy.isEnabled()).thenReturn(true);

        String token = svc.ensureVaulted("WS-1", "subj-existing", "New Name");

        assertThat(token).isEqualTo("subj-existing");
        verify(vault).put("WS-1", "subj-existing", PiiVaultService.TYPE_NAME, "New Name");
        verify(vault, never()).mintSubjectToken();
    }

    @Test
    void ensureVaulted_returnsExistingTokenUnchanged_whenDisabledOrBlank() {
        when(policy.isEnabled()).thenReturn(false);
        assertThat(svc.ensureVaulted("WS-1", "subj-x", "value")).isEqualTo("subj-x");

        when(policy.isEnabled()).thenReturn(true);
        assertThat(svc.ensureVaulted("WS-1", "subj-x", null)).isEqualTo("subj-x");
        assertThat(svc.ensureVaulted("WS-1", "subj-x", "   ")).isEqualTo("subj-x");
        verify(vault, never()).put(eq("WS-1"), eq("subj-x"), eq(PiiVaultService.TYPE_NAME), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void resolve_returnsVaultValue_whenReadSwitchOn() {
        when(policy.isReadFromVault()).thenReturn(true);
        when(vault.resolve("WS-1", "subj-x", PiiVaultService.TYPE_NAME)).thenReturn(Optional.of("Resolved Co"));
        assertThat(svc.resolve("WS-1", "subj-x", "legacy")).isEqualTo("Resolved Co");
    }

    @Test
    void resolve_returnsLegacy_whenReadSwitchOffOrNoToken() {
        when(policy.isReadFromVault()).thenReturn(false);
        assertThat(svc.resolve("WS-1", "subj-x", "legacy")).isEqualTo("legacy");

        when(policy.isReadFromVault()).thenReturn(true);
        assertThat(svc.resolve("WS-1", null, "legacy")).isEqualTo("legacy");
    }

    @Test
    void forget_cryptoShredsTheToken() {
        svc.forget("WS-1", "subj-x");
        verify(vault).forget("WS-1", "subj-x");
    }
}
