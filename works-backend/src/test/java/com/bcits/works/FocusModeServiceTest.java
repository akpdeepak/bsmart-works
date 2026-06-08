package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Focus mode (Cap U, iteration 14): the pure suppression rule, the P0 break-through, and the
 * ownership guard (a user can only cancel their own private block — RB-40 §1). Pure mocks, no DB.
 */
@Tag("unit")
class FocusModeServiceTest {

    private final FocusBlockRepository repo = mock(FocusBlockRepository.class);
    private final EventService events = mock(EventService.class);
    private final FocusModeService service = new FocusModeService(repo, events);

    private static FocusBlock block(String userId, boolean allowP0, OffsetDateTime start, OffsetDateTime end) {
        FocusBlock b = new FocusBlock();
        b.setId(1L);
        b.setUserId(userId);
        b.setWorkspaceId("WS-001");
        b.setTitle("Deep work");
        b.setStatus("SCHEDULED");
        b.setAllowP0(allowP0);
        b.setStartsAt(start);
        b.setEndsAt(end);
        return b;
    }

    @Test
    void suppresses_nonP0_duringActiveBlock() {
        OffsetDateTime now = OffsetDateTime.now();
        FocusBlock b = block("u", true, now.minusMinutes(10), now.plusMinutes(50));
        assertThat(FocusModeService.suppresses(b, false, now)).isTrue();
    }

    @Test
    void p0_breaksThrough_whenBlockAllowsIt() {
        OffsetDateTime now = OffsetDateTime.now();
        FocusBlock b = block("u", true, now.minusMinutes(10), now.plusMinutes(50));
        assertThat(FocusModeService.suppresses(b, true, now)).isFalse();
    }

    @Test
    void p0_isSuppressed_whenBlockForbidsBreakThrough() {
        OffsetDateTime now = OffsetDateTime.now();
        FocusBlock b = block("u", false, now.minusMinutes(10), now.plusMinutes(50));
        assertThat(FocusModeService.suppresses(b, true, now)).isTrue();
    }

    @Test
    void cancelledOrOutOfWindow_neverSuppresses() {
        OffsetDateTime now = OffsetDateTime.now();
        FocusBlock cancelled = block("u", true, now.minusMinutes(10), now.plusMinutes(50));
        cancelled.setStatus("CANCELLED");
        assertThat(FocusModeService.suppresses(cancelled, false, now)).isFalse();

        FocusBlock past = block("u", true, now.minusHours(3), now.minusHours(1));
        assertThat(FocusModeService.suppresses(past, false, now)).isFalse();
        assertThat(FocusModeService.suppresses(null, false, now)).isFalse();
    }

    @Test
    void isSuppressed_consultsActiveBlock() {
        OffsetDateTime now = OffsetDateTime.now();
        when(repo.findByUserIdAndStatusAndStartsAtBeforeAndEndsAtAfter(eq("u"), eq("SCHEDULED"), any(), any()))
            .thenReturn(List.of(block("u", true, now.minusMinutes(10), now.plusMinutes(50))));
        assertThat(service.isSuppressed("u", false)).isTrue();
        assertThat(service.isSuppressed("u", true)).isFalse();   // P0 still gets through
    }

    @Test
    void cancel_anotherUsersBlock_is404_andNotMutated() {
        when(repo.findById(1L)).thenReturn(Optional.of(block("user-B", true,
            OffsetDateTime.now(), OffsetDateTime.now().plusHours(1))));
        assertThatThrownBy(() -> service.cancel(1L, "user-A"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).save(any());
    }

    @Test
    void schedule_rejectsInvalidRange() {
        OffsetDateTime now = OffsetDateTime.now();
        assertThatThrownBy(() -> service.schedule("WS-001", "u", "x", now, now.minusHours(1), true, "MANUAL"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void cancel_ownBlock_succeeds() {
        FocusBlock mine = block("user-A", true, OffsetDateTime.now(), OffsetDateTime.now().plusHours(1));
        when(repo.findById(1L)).thenReturn(Optional.of(mine));
        when(repo.save(any(FocusBlock.class))).thenAnswer(i -> i.getArgument(0));
        FocusBlock out = service.cancel(1L, "user-A");
        assertThat(out.getStatus()).isEqualTo("CANCELLED");
        verify(repo).save(mine);
    }
}
