package com.bcits.works;

import com.bcits.works.shared.BlindIndexService;
import com.bcits.works.security.CustomerUserPiiService;
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
 * Unit tests for the CustomerUser ↔ PII-vault glue (RB-40 §3, EPIC-P1-pii-vault Slice 3). The
 * customer-portal analogue of {@link UserPiiServiceTest}: dual-write, blind-index login routing, the
 * read switch, and crypto-shred — all flag-gated.
 */
@Tag("unit")
class CustomerUserPiiServiceTest {

    private final PiiVaultService vault = mock(PiiVaultService.class);
    private final PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
    private final CustomerUserRepository repo = mock(CustomerUserRepository.class);
    private final BlindIndexService blindIndex = mock(BlindIndexService.class);
    private final CustomerUserPiiService svc = new CustomerUserPiiService(vault, policy, repo, blindIndex);

    private static CustomerUser cu() {
        CustomerUser cu = new CustomerUser();
        cu.setId("CU-1");
        cu.setWorkspaceId("WS-1");
        cu.setSubjectToken("subj-cu1");
        cu.setEmail("portal@acme.com");
        cu.setDisplayName("Portal Pat");
        return cu;
    }

    @Test
    void syncIdentity_dualWritesEmailAndName_whenEnabled() {
        when(policy.isEnabled()).thenReturn(true);
        svc.syncIdentity(cu());
        verify(vault).put("WS-1", "subj-cu1", PiiVaultService.TYPE_EMAIL, "portal@acme.com");
        verify(vault).put("WS-1", "subj-cu1", PiiVaultService.TYPE_NAME, "Portal Pat");
    }

    @Test
    void syncIdentity_isNoOp_whenDisabled() {
        when(policy.isEnabled()).thenReturn(false);
        svc.syncIdentity(cu());
        verify(vault, never()).put(eq("WS-1"), eq("subj-cu1"), eq(PiiVaultService.TYPE_EMAIL), eq("portal@acme.com"));
    }

    @Test
    void resolveByEmail_usesBlindIndex_whenLoginSwitchOn() {
        when(policy.isLoginViaBlindIndex()).thenReturn(true);
        when(blindIndex.hmac("portal@acme.com")).thenReturn("HMAC");
        CustomerUser cu = cu();
        when(repo.findByEmailHmac("HMAC")).thenReturn(Optional.of(cu));

        assertThat(svc.resolveByEmail("portal@acme.com")).containsSame(cu);
        verify(repo, never()).findByEmailIgnoreCase("portal@acme.com");
    }

    @Test
    void resolveByEmail_usesLegacyColumn_whenLoginSwitchOff() {
        when(policy.isLoginViaBlindIndex()).thenReturn(false);
        CustomerUser cu = cu();
        when(repo.findByEmailIgnoreCase("portal@acme.com")).thenReturn(Optional.of(cu));

        assertThat(svc.resolveByEmail("portal@acme.com")).containsSame(cu);
        verify(repo, never()).findByEmailHmac(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void existsByEmail_routesThroughBlindIndex_whenLoginSwitchOn() {
        when(policy.isLoginViaBlindIndex()).thenReturn(true);
        when(blindIndex.hmac("dup@acme.com")).thenReturn("HMAC2");
        when(repo.existsByEmailHmac("HMAC2")).thenReturn(true);
        assertThat(svc.existsByEmail("dup@acme.com")).isTrue();
    }

    @Test
    void displayName_resolvesFromVault_whenReadSwitchOn() {
        when(policy.isReadFromVault()).thenReturn(true);
        when(vault.resolve("WS-1", "subj-cu1", PiiVaultService.TYPE_NAME)).thenReturn(Optional.of("Vaulted Name"));
        assertThat(svc.displayName(cu())).isEqualTo("Vaulted Name");
    }

    @Test
    void displayName_returnsLegacyColumn_whenReadSwitchOff() {
        when(policy.isReadFromVault()).thenReturn(false);
        assertThat(svc.displayName(cu())).isEqualTo("Portal Pat");
    }

    @Test
    void displayName_fallsBackToLegacy_whenVaultEmpty() {
        when(policy.isReadFromVault()).thenReturn(true);
        when(vault.resolve("WS-1", "subj-cu1", PiiVaultService.TYPE_NAME)).thenReturn(Optional.empty());
        assertThat(svc.displayName(cu())).isEqualTo("Portal Pat");
    }

    @Test
    void applyDisplay_resolvesErasedAfterShred() {
        when(policy.isReadFromVault()).thenReturn(true);
        when(vault.resolve("WS-1", "subj-cu1", PiiVaultService.TYPE_NAME)).thenReturn(Optional.of(PiiVaultService.ERASED));
        when(vault.resolve("WS-1", "subj-cu1", PiiVaultService.TYPE_EMAIL)).thenReturn(Optional.of(PiiVaultService.ERASED));
        CustomerUser cu = svc.applyDisplay(cu());
        assertThat(cu.getDisplayName()).isEqualTo(PiiVaultService.ERASED);
        assertThat(cu.getEmail()).isEqualTo(PiiVaultService.ERASED);
    }

    @Test
    void forgetIdentity_cryptoShredsTheSubject() {
        svc.forgetIdentity(cu());
        verify(vault).forget("WS-1", "subj-cu1");
    }
}
