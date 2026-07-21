package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.ai.AiWorkspaceSettings;
import com.bcits.works.ai.AiWorkspaceSettingsRepository;
import com.bcits.works.ai.AiWorkspaceSettingsService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class AiWorkspaceSettingsTest {

    private final AiWorkspaceSettingsRepository repo = mock(AiWorkspaceSettingsRepository.class);
    private final AiWorkspaceSettingsService service = new AiWorkspaceSettingsService(repo);

    @Test
    void returnsSystemDefaultsWhenNoneSet() {
        when(repo.findById("WS-1")).thenReturn(Optional.empty());
        AiWorkspaceSettings s = service.get("WS-1");
        assertEquals("SONNET", s.getDefaultModelTier());
        assertTrue(s.isBlockPii());
        assertTrue(s.isBlockFinancial());
        assertEquals("WS-1", s.getWorkspaceId());
    }

    @Test
    void rejectsAnUnknownTier() {
        ApiException ex = assertThrows(ApiException.class, () -> service.set("WS-1", "GPT4", true, true));
        assertEquals("INVALID_TIER", ex.getCode());
    }

    @Test
    void savesValidSettingsUppercasingTheTier() {
        when(repo.findById("WS-1")).thenReturn(Optional.empty());
        when(repo.save(any(AiWorkspaceSettings.class))).thenAnswer(i -> i.getArgument(0));
        AiWorkspaceSettings s = service.set("WS-1", "haiku", false, true);
        assertEquals("HAIKU", s.getDefaultModelTier());
        assertFalse(s.isBlockPii());
        assertTrue(s.isBlockFinancial());
        verify(repo).save(any(AiWorkspaceSettings.class));
    }
}
