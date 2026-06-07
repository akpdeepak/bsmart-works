package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behaviour of AI memory (Cap O, iteration 20): upsert of a slot, the (workspace, user) scoping, and
 * the cross-tenant / cross-user guard on forget. Pure unit tests (RB-10 §7).
 */
@Tag("unit")
class AiMemoryServiceTest {

    private final AiMemoryRepository repo = mock(AiMemoryRepository.class);
    private final AiMemoryService service = new AiMemoryService(repo);

    private static final String WS = "WS-001";
    private static final String USER = "USR-001";

    @Test
    void remember_upsertsBlankAssistantAsSentinel() {
        when(repo.findByWorkspaceIdAndUserIdAndAssistantIdAndKindAndMemKey(
            eq(WS), eq(USER), eq(""), anyString(), anyString())).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        AiMemory mem = service.remember(WS, USER, null, "PREFERENCE", "tone", "concise");

        assertThat(mem.getAssistantId()).isEqualTo("");
        assertThat(mem.getWorkspaceId()).isEqualTo(WS);
        assertThat(mem.getUserId()).isEqualTo(USER);
        assertThat(mem.getMemValue()).isEqualTo("concise");
    }

    @Test
    void remember_rejectsBlankKey() {
        assertThatThrownBy(() -> service.remember(WS, USER, null, "CONTEXT", " ", "x"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void forget_deniesAnotherUsersMemory() {
        AiMemory other = new AiMemory();
        other.setId("MEM-x");
        other.setWorkspaceId(WS);
        other.setUserId("USR-OTHER");
        when(repo.findById("MEM-x")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.forget(WS, USER, "MEM-x")).isInstanceOf(ApiException.class);
        verify(repo, never()).delete(any());
    }

    @Test
    void forget_deletesOwnMemory() {
        AiMemory mine = new AiMemory();
        mine.setId("MEM-1");
        mine.setWorkspaceId(WS);
        mine.setUserId(USER);
        when(repo.findById("MEM-1")).thenReturn(Optional.of(mine));

        service.forget(WS, USER, "MEM-1");
        verify(repo).delete(mine);
    }

    @Test
    void contextDigest_putsPreferencesFirst() {
        AiMemory pref = slot("PREFERENCE", "tone", "concise");
        AiMemory ctx = slot("CONTEXT", "last_question", "how is the sprint going");
        when(repo.findByWorkspaceIdAndUserIdOrderByUpdatedAtDesc(WS, USER)).thenReturn(List.of(ctx, pref));

        String digest = service.contextDigest(WS, USER, 6);
        assertThat(digest.indexOf("tone")).isLessThan(digest.indexOf("last_question"));
    }

    private AiMemory slot(String kind, String key, String value) {
        AiMemory m = new AiMemory();
        m.setWorkspaceId(WS);
        m.setUserId(USER);
        m.setKind(kind);
        m.setMemKey(key);
        m.setMemValue(value);
        return m;
    }
}
