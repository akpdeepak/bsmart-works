package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for UserPiiService — the email blind-index lookup switch + identity dual-write. */
@Tag("unit")
class UserPiiServiceTest {

    @Test
    void resolveByEmail_usesLegacyColumn_whenFlagOff() {
        PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
        when(policy.isLoginViaBlindIndex()).thenReturn(false);
        UserRepository users = mock(UserRepository.class);
        BlindIndexService blind = mock(BlindIndexService.class);
        User u = new User();
        u.setId("USR-1");
        when(users.findByEmail("a@b.com")).thenReturn(Optional.of(u));

        UserPiiService svc = new UserPiiService(mock(PiiVaultService.class), policy, users, blind);

        assertThat(svc.resolveByEmail("a@b.com")).contains(u);
        verify(users).findByEmail("a@b.com");
        verify(users, never()).findByEmailHmac(anyString());
    }

    @Test
    void resolveByEmail_usesBlindIndex_whenFlagOn() {
        PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
        when(policy.isLoginViaBlindIndex()).thenReturn(true);
        UserRepository users = mock(UserRepository.class);
        BlindIndexService blind = mock(BlindIndexService.class);
        when(blind.hmac("a@b.com")).thenReturn("HMAC");
        User u = new User();
        u.setId("USR-1");
        when(users.findByEmailHmac("HMAC")).thenReturn(Optional.of(u));

        UserPiiService svc = new UserPiiService(mock(PiiVaultService.class), policy, users, blind);

        assertThat(svc.resolveByEmail("a@b.com")).contains(u);
        verify(users).findByEmailHmac("HMAC");
        verify(users, never()).findByEmail(anyString());
    }

    @Test
    void syncIdentity_vaultsNameAndEmail_whenEnabled() {
        PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
        when(policy.isEnabled()).thenReturn(true);
        PiiVaultService vault = mock(PiiVaultService.class);
        User u = new User();
        u.setSubjectToken("subj-1");
        u.setFullName("Alice");
        u.setEmail("a@b.com");

        new UserPiiService(vault, policy, mock(UserRepository.class), mock(BlindIndexService.class))
            .syncIdentity(u);

        verify(vault).putIdentity("subj-1", PiiVaultService.TYPE_NAME, "Alice");
        verify(vault).putIdentity("subj-1", PiiVaultService.TYPE_EMAIL, "a@b.com");
    }

    @Test
    void syncIdentity_isNoOp_whenDisabled() {
        PiiVaultPolicy policy = mock(PiiVaultPolicy.class);
        when(policy.isEnabled()).thenReturn(false);
        PiiVaultService vault = mock(PiiVaultService.class);
        User u = new User();
        u.setSubjectToken("subj-1");

        new UserPiiService(vault, policy, mock(UserRepository.class), mock(BlindIndexService.class))
            .syncIdentity(u);

        verify(vault, never()).putIdentity(anyString(), anyString(), anyString());
    }
}
