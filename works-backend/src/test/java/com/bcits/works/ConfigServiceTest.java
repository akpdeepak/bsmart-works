package com.bcits.works;
import com.bcits.works.workspaces.ConfigDiffService;
import com.bcits.works.workspaces.ConfigService;
import com.bcits.works.workspaces.ConfigVersion;
import com.bcits.works.workspaces.ConfigVersionRepository;

import com.bcits.works.workspaces.WorkspaceConfig;
import com.bcits.works.workspaces.WorkspaceConfigRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for the configuration framework core (iteration 17, Cap R): default fallback,
 * auto-versioning on every change, and the owner-only lock gate (RB-40 §1, server-side enforcement).
 */
@Tag("unit")
class ConfigServiceTest {

    private static final int MEMBER = 2;
    private static final int ADMIN = 4;
    private static final int OWNER = 5;

    private final WorkspaceConfigRepository configRepo = mock(WorkspaceConfigRepository.class);
    private final ConfigVersionRepository versionRepo = mock(ConfigVersionRepository.class);
    private final EventService events = mock(EventService.class);
    private final ConfigService service =
            new ConfigService(configRepo, versionRepo, new ConfigDiffService(), events);

    @Test
    void returnsSystemDefaultsWhenNoRowExists() {
        when(configRepo.findById("WS-1")).thenReturn(Optional.empty());
        WorkspaceConfig live = service.getLive("WS-1");
        assertThat(live.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(live.getCurrentVersion()).isZero();
        assertThat(live.getDocument()).contains("Asia/Kolkata");
    }

    @Test
    void firstUpdateWritesVersionOneAndAudits() {
        when(configRepo.findById("WS-1")).thenReturn(Optional.empty());
        when(configRepo.save(any(WorkspaceConfig.class))).thenAnswer(i -> i.getArgument(0));

        WorkspaceConfig saved = service.update("WS-1", "{\"settings\":{\"locale\":\"en-GB\"}}",
                "user-1", ADMIN, ConfigService.Source.MANUAL, "change locale");

        assertThat(saved.getCurrentVersion()).isEqualTo(1);
        ArgumentCaptor<ConfigVersion> v = ArgumentCaptor.forClass(ConfigVersion.class);
        verify(versionRepo).save(v.capture());
        assertThat(v.getValue().getVersionNumber()).isEqualTo(1);
        assertThat(v.getValue().getSource()).isEqualTo("MANUAL");
        verify(events).recordInWorkspace(eq("WS-1"), eq("WS-1"), eq("CONFIG_UPDATED"), eq("user-1"), any());
    }

    @Test
    void rejectsNonObjectDocument() {
        assertThatThrownBy(() -> service.update("WS-1", "[1,2,3]", "u", ADMIN,
                ConfigService.Source.MANUAL, null))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("INVALID_CONFIG"));
        verify(versionRepo, never()).save(any());
    }

    @Test
    void adminCannotChangeALockedPath_butOwnerCan() {
        WorkspaceConfig current = new WorkspaceConfig();
        current.setWorkspaceId("WS-1");
        current.setCurrentVersion(3);
        current.setDocument("{\"settings\":{\"timezone\":\"Asia/Kolkata\"},\"locks\":[\"settings.timezone\"]}");
        when(configRepo.findById("WS-1")).thenReturn(Optional.of(current));
        when(configRepo.save(any(WorkspaceConfig.class))).thenAnswer(i -> i.getArgument(0));

        String changed = "{\"settings\":{\"timezone\":\"UTC\"},\"locks\":[\"settings.timezone\"]}";

        assertThatThrownBy(() -> service.update("WS-1", changed, "admin", ADMIN,
                ConfigService.Source.MANUAL, null))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(403));
        verify(versionRepo, never()).save(any());

        // An OWNER bypasses the lock gate.
        WorkspaceConfig saved = service.update("WS-1", changed, "owner", OWNER,
                ConfigService.Source.MANUAL, null);
        assertThat(saved.getCurrentVersion()).isEqualTo(4);
    }

    @Test
    void nonOwnerCannotChangeTheLockSetItself() {
        WorkspaceConfig current = new WorkspaceConfig();
        current.setWorkspaceId("WS-1");
        current.setCurrentVersion(1);
        current.setDocument("{\"settings\":{\"locale\":\"en-IN\"},\"locks\":[]}");
        when(configRepo.findById("WS-1")).thenReturn(Optional.of(current));

        String addsLock = "{\"settings\":{\"locale\":\"en-IN\"},\"locks\":[\"settings.locale\"]}";
        assertThatThrownBy(() -> service.update("WS-1", addsLock, "admin", ADMIN,
                ConfigService.Source.MANUAL, null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rollbackReplaysTargetVersionAsANewVersion() {
        ConfigVersion target = new ConfigVersion();
        target.setWorkspaceId("WS-1");
        target.setVersionNumber(2);
        target.setDocument("{\"settings\":{\"locale\":\"en-US\"}}");
        when(versionRepo.findByWorkspaceIdAndVersionNumber("WS-1", 2)).thenReturn(Optional.of(target));

        WorkspaceConfig current = new WorkspaceConfig();
        current.setWorkspaceId("WS-1");
        current.setCurrentVersion(5);
        current.setDocument("{\"settings\":{\"locale\":\"hi-IN\"}}");
        when(configRepo.findById("WS-1")).thenReturn(Optional.of(current));
        when(configRepo.save(any(WorkspaceConfig.class))).thenAnswer(i -> i.getArgument(0));

        WorkspaceConfig rolled = service.rollback("WS-1", 2, "owner", OWNER);
        assertThat(rolled.getCurrentVersion()).isEqualTo(6);
        assertThat(rolled.getDocument()).contains("en-US");

        ArgumentCaptor<ConfigVersion> v = ArgumentCaptor.forClass(ConfigVersion.class);
        verify(versionRepo).save(v.capture());
        assertThat(v.getValue().getSource()).isEqualTo("ROLLBACK");
    }

    @Test
    void diffAgainstVersionZeroComparesToLive() {
        WorkspaceConfig current = new WorkspaceConfig();
        current.setWorkspaceId("WS-1");
        current.setDocument("{\"settings\":{\"locale\":\"en-IN\"}}");
        when(configRepo.findById("WS-1")).thenReturn(Optional.of(current));
        ConfigVersion v1 = new ConfigVersion();
        v1.setDocument("{\"settings\":{\"locale\":\"en-US\"}}");
        when(versionRepo.findByWorkspaceIdAndVersionNumber("WS-1", 1)).thenReturn(Optional.of(v1));

        var changes = service.diffVersions("WS-1", 1, 0);
        assertThat(changes).singleElement()
                .satisfies(c -> assertThat(c.path()).isEqualTo("settings.locale"));
    }
}
