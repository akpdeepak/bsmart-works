package com.bcits.works;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for configuration templates (iteration 17, Cap R), including the cross-tenant guard:
 * a private template owned by another workspace is invisible and cannot be applied (RB-40 §1).
 */
@Tag("unit")
class ConfigTemplateServiceTest {

    private final ConfigTemplateRepository repo = mock(ConfigTemplateRepository.class);
    private final ConfigService configService = mock(ConfigService.class);
    private final ConfigTemplateService service = new ConfigTemplateService(repo, configService);

    @Test
    void saveSnapshotsTheLiveDocument() {
        when(configService.getLiveDocument("WS-1")).thenReturn("{\"settings\":{\"locale\":\"en-IN\"}}");
        when(repo.save(any(ConfigTemplate.class))).thenAnswer(i -> i.getArgument(0));

        ConfigTemplate t = service.saveCurrentAsTemplate("WS-1", "Utility base", "desc", true, "user-1");

        assertThat(t.getOwnerWorkspaceId()).isEqualTo("WS-1");
        assertThat(t.getShareable()).isTrue();
        assertThat(t.getDocument()).contains("en-IN");
        assertThat(t.getId()).startsWith("TPL-");
    }

    @Test
    void saveRejectsBlankName() {
        assertThatThrownBy(() -> service.saveCurrentAsTemplate("WS-1", "  ", null, false, "u"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void applyShareableTemplateRunsThroughConfigUpdate() {
        ConfigTemplate t = new ConfigTemplate();
        t.setId("TPL-X");
        t.setName("Shared");
        t.setShareable(true);
        t.setOwnerWorkspaceId("WS-OTHER");
        t.setDocument("{\"settings\":{\"locale\":\"en-US\"}}");
        when(repo.findById("TPL-X")).thenReturn(Optional.of(t));

        service.apply("TPL-X", "WS-1", "user-1", 4);

        verify(configService).update(eq("WS-1"), eq(t.getDocument()), eq("user-1"), eq(4),
                eq(ConfigService.Source.TEMPLATE), anyString());
    }

    @Test
    void cannotApplyAnotherWorkspacesPrivateTemplate() {
        ConfigTemplate t = new ConfigTemplate();
        t.setId("TPL-PRIV");
        t.setShareable(false);
        t.setOwnerWorkspaceId("WS-OTHER");
        when(repo.findById("TPL-PRIV")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> service.apply("TPL-PRIV", "WS-1", "user-1", 4))
                .isInstanceOf(ApiException.class);
        verify(configService, never()).update(anyString(), anyString(), anyString(), anyInt(), any(), anyString());
    }

    @Test
    void cannotDeleteATemplateYouDoNotOwn() {
        ConfigTemplate global = new ConfigTemplate();
        global.setId("TPL-GLOBAL");
        global.setOwnerWorkspaceId(null);
        when(repo.findById("TPL-GLOBAL")).thenReturn(Optional.of(global));

        assertThatThrownBy(() -> service.delete("TPL-GLOBAL", "WS-1"))
                .isInstanceOf(ApiException.class);
        verify(repo, never()).delete(any());
    }
}
