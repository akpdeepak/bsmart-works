package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.projects.BoardWipLimit;
import com.bcits.works.projects.BoardWipLimitRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class BoardWipLimitServiceTest {

    private final BoardWipLimitRepository repo = mock(BoardWipLimitRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BoardWipLimitService service = new BoardWipLimitService(repo, jdbc);

    @Test
    void returnsEmptyLimitsWhenNoneSet() {
        when(repo.findById("WS-1")).thenReturn(Optional.empty());
        BoardWipLimit l = service.get("WS-1");
        assertEquals("WS-1", l.getWorkspaceId());
        assertNull(l.getTodoLimit());
        assertNull(l.getInProgressLimit());
        assertNull(l.getDoneLimit());
    }

    @Test
    void rejectsANegativeLimit() {
        ApiException ex = assertThrows(ApiException.class, () -> service.set("WS-1", 3, -1, null));
        assertEquals("INVALID_WIP_LIMIT", ex.getCode());
    }

    @Test
    void savesValidLimitsAndAllowsNullForUnbounded() {
        when(repo.findById("WS-1")).thenReturn(Optional.empty());
        when(repo.save(any(BoardWipLimit.class))).thenAnswer(i -> i.getArgument(0));
        BoardWipLimit l = service.set("WS-1", 5, 3, null);
        assertEquals(5, l.getTodoLimit());
        assertEquals(3, l.getInProgressLimit());
        assertNull(l.getDoneLimit());
        verify(repo).save(any(BoardWipLimit.class));
    }
}
