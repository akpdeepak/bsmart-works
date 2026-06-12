package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class TeamRoleServiceTest {

    @Test
    void defaultRoleForTier_mapsTiersToTodayRoleKeys() {
        assertThat(TeamRoleService.defaultRoleForTier(5)).isEqualTo("admin");
        assertThat(TeamRoleService.defaultRoleForTier(4)).isEqualTo("admin");
        assertThat(TeamRoleService.defaultRoleForTier(3)).isEqualTo("scrum-master");
        assertThat(TeamRoleService.defaultRoleForTier(2)).isEqualTo("developer");
        assertThat(TeamRoleService.defaultRoleForTier(1)).isEqualTo("executive");
    }

    @Test
    void defaultRoleForTier_alwaysReturnsAKnownRoleKey() {
        for (int tier = 1; tier <= 5; tier++) {
            assertThat(TodayLayoutService.ROLE_KEYS).contains(TeamRoleService.defaultRoleForTier(tier));
        }
    }

    @Test
    void validateRoleKey_acceptsTheSharedVocabularyOnly() {
        for (String role : TodayLayoutService.ROLE_KEYS) {
            assertThatCode(() -> TeamRoleService.validateRoleKey(role)).doesNotThrowAnyException();
        }
        assertThatThrownBy(() -> TeamRoleService.validateRoleKey("tester"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> TeamRoleService.validateRoleKey(null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void roleFor_prefersExplicitProjectMappingOverTierDefault() {
        ProjectTeamMemberRepository repo = mock(ProjectTeamMemberRepository.class);
        RbacService rbac = mock(RbacService.class);
        TeamRoleService service = new TeamRoleService(repo, null, null, rbac, null);

        ProjectTeamMember mapped = new ProjectTeamMember();
        mapped.setRoleKey("product-owner");
        when(repo.findByProjectIdAndUserId("PROJ-1", "USR-7")).thenReturn(Optional.of(mapped));
        when(rbac.getUserTier("USR-7", "WS-1")).thenReturn(3);

        assertThat(service.roleFor("USR-7", "PROJ-1", "WS-1")).isEqualTo("product-owner");
    }

    @Test
    void roleFor_fallsBackToTierDefaultWhenUnmapped() {
        ProjectTeamMemberRepository repo = mock(ProjectTeamMemberRepository.class);
        RbacService rbac = mock(RbacService.class);
        TeamRoleService service = new TeamRoleService(repo, null, null, rbac, null);

        when(repo.findByProjectIdAndUserId("PROJ-1", "USR-7")).thenReturn(Optional.empty());
        when(rbac.getUserTier("USR-7", "WS-1")).thenReturn(2);

        assertThat(service.roleFor("USR-7", "PROJ-1", "WS-1")).isEqualTo("developer");
    }

    @Test
    void cockpitContext_crossTenantReturnsNotFound() {
        ProjectTeamMemberRepository repo = mock(ProjectTeamMemberRepository.class);
        RbacService rbac = mock(RbacService.class);
        TeamRoleService service = new TeamRoleService(repo, null, null, rbac, null);

        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");
        when(rbac.getUserTier("user-A", "ws-B")).thenReturn(0);

        assertThatThrownBy(() -> service.cockpitContext("user-A", "PROJ-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
