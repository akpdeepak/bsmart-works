package com.bcits.works;

import com.bcits.works.shared.ApiException;

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

/** Unit tests for sandbox mode (iteration 17, Cap R). */
@Tag("unit")
class ConfigSandboxServiceTest {

    private final ConfigSandboxRepository repo = mock(ConfigSandboxRepository.class);
    private final ConfigService configService = mock(ConfigService.class);
    private final ConfigSandboxService service = new ConfigSandboxService(repo, configService);

    private WorkspaceConfig live(String doc, int version) {
        WorkspaceConfig c = new WorkspaceConfig();
        c.setWorkspaceId("WS-1");
        c.setDocument(doc);
        c.setCurrentVersion(version);
        return c;
    }

    @Test
    void createForksTheLiveDocumentAndBaseVersion() {
        when(configService.getLive("WS-1")).thenReturn(live("{\"settings\":{\"locale\":\"en-IN\"}}", 7));
        when(repo.save(any(ConfigSandbox.class))).thenAnswer(i -> i.getArgument(0));

        ConfigSandbox s = service.create("WS-1", "Try new calendar", "user-1");

        assertThat(s.getDocument()).contains("en-IN");
        assertThat(s.getBaseVersion()).isEqualTo(7);
        assertThat(s.getStatus()).isEqualTo("DRAFT");
        assertThat(s.getId()).startsWith("SBX-");
    }

    @Test
    void promoteRunsThroughConfigUpdateAndMarksPromoted() {
        ConfigSandbox s = new ConfigSandbox();
        s.setId("SBX-1");
        s.setWorkspaceId("WS-1");
        s.setName("draft");
        s.setStatus("DRAFT");
        s.setDocument("{\"settings\":{\"locale\":\"en-US\"}}");
        when(repo.findByIdAndWorkspaceId("SBX-1", "WS-1")).thenReturn(Optional.of(s));
        when(repo.save(any(ConfigSandbox.class))).thenAnswer(i -> i.getArgument(0));

        service.promote("SBX-1", "WS-1", "user-1", 4);

        verify(configService).update(eq("WS-1"), eq(s.getDocument()), eq("user-1"), eq(4),
                eq(ConfigService.Source.SANDBOX_PROMOTE), anyString());
        assertThat(s.getStatus()).isEqualTo("PROMOTED");
    }

    @Test
    void cannotEditAPromotedSandbox() {
        ConfigSandbox s = new ConfigSandbox();
        s.setId("SBX-1");
        s.setWorkspaceId("WS-1");
        s.setStatus("PROMOTED");
        when(repo.findByIdAndWorkspaceId("SBX-1", "WS-1")).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.update("SBX-1", "WS-1", "{}"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("SANDBOX_NOT_DRAFT"));
    }

    @Test
    void missingSandboxInWorkspaceIsNotFound() {
        when(repo.findByIdAndWorkspaceId("SBX-X", "WS-1")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get("SBX-X", "WS-1")).isInstanceOf(ApiException.class);
        verify(configService, never()).update(anyString(), anyString(), anyString(), anyInt(), any(), anyString());
    }
}
