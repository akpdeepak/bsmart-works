package com.bcits.works;
import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;
import com.bcits.works.security.StakeholderPiiService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for the Stakeholder ↔ PII-vault glue (RB-40 §3, EPIC-P1-pii-vault Slice 3). */
@Tag("unit")
class StakeholderPiiServiceTest {

    private final PiiVaultService vault = mock(PiiVaultService.class);
    private final PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
    private final StakeholderPiiService svc = new StakeholderPiiService(vault, policy);

    private static Stakeholder stk() {
        Stakeholder s = new Stakeholder();
        s.setId("STK-1");
        s.setWorkspaceId("WS-1");
        s.setSubjectToken("subj-stk1");
        s.setName("Reg Ulator");
        s.setEmail("reg@authority.gov");
        s.setOrganization("State Regulator");
        s.setNotes("Prefers quarterly updates");
        return s;
    }

    @Test
    void sync_dualWritesAllPiiFields_whenEnabled() {
        when(policy.isEnabled()).thenReturn(true);
        svc.sync(stk());
        verify(vault).put("WS-1", "subj-stk1", PiiVaultService.TYPE_NAME, "Reg Ulator");
        verify(vault).put("WS-1", "subj-stk1", PiiVaultService.TYPE_EMAIL, "reg@authority.gov");
        verify(vault).put("WS-1", "subj-stk1", PiiVaultService.TYPE_ORG, "State Regulator");
        verify(vault).put("WS-1", "subj-stk1", PiiVaultService.TYPE_NOTES, "Prefers quarterly updates");
    }

    @Test
    void sync_isNoOp_whenDisabled() {
        when(policy.isEnabled()).thenReturn(false);
        svc.sync(stk());
        verify(vault, never()).put(eq("WS-1"), eq("subj-stk1"), eq(PiiVaultService.TYPE_NAME), eq("Reg Ulator"));
    }

    @Test
    void applyDisplay_resolvesFromVault_whenReadSwitchOn() {
        when(policy.isReadFromVault()).thenReturn(true);
        when(vault.resolve("WS-1", "subj-stk1", PiiVaultService.TYPE_NAME)).thenReturn(Optional.of("Vault Name"));
        when(vault.resolve("WS-1", "subj-stk1", PiiVaultService.TYPE_EMAIL)).thenReturn(Optional.of("vault@x.gov"));
        when(vault.resolve("WS-1", "subj-stk1", PiiVaultService.TYPE_ORG)).thenReturn(Optional.of("Vault Org"));
        when(vault.resolve("WS-1", "subj-stk1", PiiVaultService.TYPE_NOTES)).thenReturn(Optional.of("Vault Notes"));

        Stakeholder s = svc.applyDisplay(stk());
        assertThat(s.getName()).isEqualTo("Vault Name");
        assertThat(s.getEmail()).isEqualTo("vault@x.gov");
        assertThat(s.getOrganization()).isEqualTo("Vault Org");
        assertThat(s.getNotes()).isEqualTo("Vault Notes");
    }

    @Test
    void applyDisplay_keepsLegacyColumns_whenReadSwitchOff() {
        when(policy.isReadFromVault()).thenReturn(false);
        Stakeholder s = svc.applyDisplay(stk());
        assertThat(s.getName()).isEqualTo("Reg Ulator");
        assertThat(s.getEmail()).isEqualTo("reg@authority.gov");
    }

    @Test
    void forget_cryptoShredsTheSubject() {
        svc.forget(stk());
        verify(vault).forget("WS-1", "subj-stk1");
    }
}
