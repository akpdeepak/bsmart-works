package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.projects.RetroSession;
import com.bcits.works.projects.RetroSessionRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class CockpitCoachServiceTest {

    private static CockpitCoachService.Signals signals(int stale, int unassigned, int sla,
                                                       String topCat, int topCount,
                                                       Integer attendance, int open, int total) {
        return new CockpitCoachService.Signals(stale, unassigned, sla, topCat, topCount,
                attendance, open, total);
    }

    @Test
    void tipsFor_targetsTheCallersRole() {
        CockpitCoachService.Signals s = signals(2, 1, 1, "Environment", 3, 50, 3, 4);

        List<CockpitCoachService.Tip> dev = CockpitCoachService.tipsFor("developer", s);
        assertThat(dev).extracting(CockpitCoachService.Tip::audience)
                .allMatch(a -> a.equals("all") || a.equals("developer"));
        assertThat(dev).anyMatch(t -> t.text().contains("no status change"));

        List<CockpitCoachService.Tip> sm = CockpitCoachService.tipsFor("scrum-master", s);
        assertThat(sm).anyMatch(t -> t.text().contains("attendance"));
        assertThat(sm).anyMatch(t -> t.text().contains("retro actions"));

        // SLA breaches reach every role.
        assertThat(dev).anyMatch(t -> t.tone().equals("danger"));
        assertThat(sm).anyMatch(t -> t.tone().equals("danger"));

        // Actionable: the SLA tip jumps to impediments; the developer stale tip to My Day.
        assertThat(dev).anyMatch(t -> t.action() != null && "impediments".equals(t.action().tab()));
        assertThat(dev).anyMatch(t -> t.action() != null && "myday".equals(t.action().tab()));
        assertThat(sm).anyMatch(t -> t.action() != null && "risk".equals(t.action().tab()));
    }

    @Test
    void tipsFor_positiveTipHasNoAction() {
        List<CockpitCoachService.Tip> tips =
                CockpitCoachService.tipsFor("scrum-master", signals(0, 0, 0, null, 0, null, 0, 0));
        assertThat(tips).singleElement().satisfies(t -> assertThat(t.action()).isNull());
    }

    @Test
    void tipsFor_quietProjectGetsThePositiveTip() {
        List<CockpitCoachService.Tip> tips =
                CockpitCoachService.tipsFor("developer", signals(0, 0, 0, null, 0, null, 0, 0));
        assertThat(tips).hasSize(1);
        assertThat(tips.get(0).text()).contains("No flags");
    }

    @Test
    void tipsFor_adminAndExecutiveSeeTheFullPicture() {
        CockpitCoachService.Signals s = signals(2, 1, 0, null, 0, 60, 0, 0);
        assertThat(CockpitCoachService.tipsFor("admin", s).size())
                .isGreaterThanOrEqualTo(CockpitCoachService.tipsFor("developer", s).size());
    }

    @Test
    void themeFor_bucketsByKeywordAndDefaultsToOther() {
        assertThat(CockpitCoachService.themeFor("Too many approvals before deploy sign-off"))
                .isEqualTo("Process & planning");
        assertThat(CockpitCoachService.themeFor("Standup updates are too vague")).isEqualTo("Communication");
        assertThat(CockpitCoachService.themeFor("Regression bugs slipped into the release")).isEqualTo("Quality");
        assertThat(CockpitCoachService.themeFor("CI pipeline keeps flaking")).isEqualTo("Tooling & environment");
        assertThat(CockpitCoachService.themeFor("Great pairing this sprint")).isEqualTo("People & teamwork");
        assertThat(CockpitCoachService.themeFor("Pizza was cold")).isEqualTo("Other");
        assertThat(CockpitCoachService.themeFor(null)).isEqualTo("Other");
    }

    @Test
    void clusterRetro_crossTenantReturnsNotFound() {
        RetroSessionRepository retros = mock(RetroSessionRepository.class);
        RbacService rbac = mock(RbacService.class);
        CockpitCoachService service =
                new CockpitCoachService(null, null, retros, null, null, rbac);

        RetroSession foreign = new RetroSession();
        foreign.setId("RET-1");
        foreign.setProjectId("PROJ-B");
        when(retros.findById("RET-1")).thenReturn(Optional.of(foreign));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");

        assertThatThrownBy(() -> service.clusterRetro("ws-A", "user-A", "RET-1", true))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void proTips_crossTenantProjectReturnsNotFound() {
        RbacService rbac = mock(RbacService.class);
        CockpitCoachService service = new CockpitCoachService(null, null, null, null, null, rbac);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");

        assertThatThrownBy(() -> service.proTips("ws-A", "user-A", "PROJ-B", true))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void classifyCategory_bucketsRaisesDeterministically() {
        assertThat(ImpedimentService.classifyCategory("Staging environment down", null))
                .isEqualTo("Environment");
        assertThat(ImpedimentService.classifyCategory("Blocked by vendor API", null))
                .isEqualTo("Dependency");
        assertThat(ImpedimentService.classifyCategory("Waiting on security approval", null))
                .isEqualTo("Dependency"); // "waiting" wins by rule order
        assertThat(ImpedimentService.classifyCategory("CI pipeline broken", null)).isEqualTo("Tooling");
        assertThat(ImpedimentService.classifyCategory("Acceptance criteria unclear", null))
                .isEqualTo("Requirements");
        assertThat(ImpedimentService.classifyCategory("Something odd", null)).isEqualTo("General");
    }
}
