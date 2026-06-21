package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for the idempotent PII-vault backfill (RB-40 §3, EPIC §11.d). */
@Tag("unit")
class PiiVaultBackfillServiceTest {

    @Test
    void backfill_assignsTokensAndSyncsNamesForUntokenizedUsers() {
        UserRepository users = mock(UserRepository.class);
        UserPiiService userPii = mock(UserPiiService.class);
        PiiVaultService vault = mock(PiiVaultService.class);
        when(vault.mintSubjectToken()).thenReturn("subj-x", "subj-y");

        User u1 = new User();
        u1.setId("USR-1");
        u1.setFullName("Alice");
        User u2 = new User();
        u2.setId("USR-2");
        u2.setFullName("Bob");
        when(users.findBySubjectTokenIsNull()).thenReturn(List.of(u1, u2));

        int n = new PiiVaultBackfillService(users, userPii, vault).backfillUserNames();

        assertThat(n).isEqualTo(2);
        assertThat(u1.getSubjectToken()).isEqualTo("subj-x");
        assertThat(u2.getSubjectToken()).isEqualTo("subj-y");
        verify(users).save(u1);
        verify(users).save(u2);
        verify(userPii).syncIdentity(u1);
        verify(userPii).syncIdentity(u2);
    }

    @Test
    void backfill_isNoOpWhenNoneArePending() {
        UserRepository users = mock(UserRepository.class);
        when(users.findBySubjectTokenIsNull()).thenReturn(List.of());

        int n = new PiiVaultBackfillService(users, mock(UserPiiService.class), mock(PiiVaultService.class))
            .backfillUserNames();

        assertThat(n).isZero();
    }
}
