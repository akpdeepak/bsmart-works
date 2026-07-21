package com.bcits.works.auth;



import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Public-API token behaviour (iteration 13, Cap Q): tokens are hashed (never stored plaintext),
 * verifiable by prefix+hash, and revocable (RB-10 §7 / RB-40 §1).
 */
@Tag("unit")
class ApiTokenServiceTest {

    private static final String WS = "ws-1";

    private final ApiTokenRepository repo = mock(ApiTokenRepository.class);
    private final ApiTokenService svc = new ApiTokenService(repo);

    @Test
    void hashAndPrefix_areStable() {
        assertThat(ApiTokenService.sha256Hex("abc")).isEqualTo(ApiTokenService.sha256Hex("abc")).hasSize(64);
        assertThat(ApiTokenService.sha256Hex("abc")).isNotEqualTo(ApiTokenService.sha256Hex("abd"));
        assertThat(ApiTokenService.prefixOf("wtk_1234567890abcdef")).isEqualTo("wtk_12345678");
    }

    @Test
    void issue_storesHashNotPlaintextAndReturnsPlaintextOnce() {
        when(repo.save(any(ApiToken.class))).thenAnswer(i -> i.getArgument(0));
        ApiTokenService.IssuedToken issued = svc.issue(WS, "user-1", "CI token", List.of("read"));

        assertThat(issued.plaintext()).startsWith("wtk_");
        assertThat(issued.token().getTokenHash())
            .isEqualTo(ApiTokenService.sha256Hex(issued.plaintext()))
            .isNotEqualTo(issued.plaintext());
        assertThat(issued.token().getTokenPrefix()).isEqualTo(ApiTokenService.prefixOf(issued.plaintext()));
    }

    @Test
    void verify_matchesHashAndRejectsUnknown() {
        when(repo.save(any(ApiToken.class))).thenAnswer(i -> i.getArgument(0));
        ApiTokenService.IssuedToken issued = svc.issue(WS, "user-1", "CI token", List.of("read"));
        when(repo.findByTokenPrefixAndRevokedFalse(issued.token().getTokenPrefix()))
            .thenReturn(List.of(issued.token()));

        assertThat(svc.verify(issued.plaintext())).isPresent();
        assertThat(svc.verify("wtk_doesnotexist")).isEmpty();
        assertThat(svc.verify("not-a-token")).isEmpty();
    }

    @Test
    void revoke_rejectsCrossWorkspace() {
        ApiToken t = new ApiToken();
        t.setId("TOK-1");
        t.setWorkspaceId("other-ws");
        when(repo.findById("TOK-1")).thenReturn(Optional.of(t));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.revoke(WS, "TOK-1"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void rotate_revokesOldAndIssuesNewWithSameNameAndScopes() {
        when(repo.save(any(ApiToken.class))).thenAnswer(i -> i.getArgument(0));
        ApiTokenService.IssuedToken original = svc.issue(WS, "user-1", "Deploy key", List.of("deploy"));
        ApiToken originalToken = original.token();
        originalToken.setId("TOK-OLD");
        when(repo.findById("TOK-OLD")).thenReturn(Optional.of(originalToken));

        ApiTokenService.IssuedToken rotated = svc.rotate(WS, "TOK-OLD", "user-1");

        assertThat(originalToken.getRevoked()).isTrue();
        assertThat(rotated.plaintext()).startsWith("wtk_").isNotEqualTo(original.plaintext());
        assertThat(rotated.token().getName()).isEqualTo("Deploy key");
        assertThat(rotated.token().getScopes()).contains("deploy");
    }

    @Test
    void rotate_rejectsCrossWorkspace() {
        ApiToken t = new ApiToken();
        t.setId("TOK-2");
        t.setWorkspaceId("other-ws");
        when(repo.findById("TOK-2")).thenReturn(Optional.of(t));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.rotate(WS, "TOK-2", "user-1"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void hasScope_detectsScopePresenceAndEmptyListMeansFullAccess() {
        ApiToken fullAccess = new ApiToken();
        fullAccess.setScopes("[]");
        assertThat(ApiTokenService.hasScope(fullAccess, "read")).isTrue();

        ApiToken scoped = new ApiToken();
        scoped.setScopes("[\"read\",\"deploy\"]");
        assertThat(ApiTokenService.hasScope(scoped, "read")).isTrue();
        assertThat(ApiTokenService.hasScope(scoped, "write")).isFalse();

        assertThat(ApiTokenService.hasScope(null, "read")).isFalse();
    }
}
