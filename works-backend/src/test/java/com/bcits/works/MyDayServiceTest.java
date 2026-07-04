package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class MyDayServiceTest {

    @Test
    void staleDays_countsWholeDaysAndNeverGoesNegative() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-12T10:00:00Z");
        assertThat(MyDayService.staleDays(now.minusDays(4), now)).isEqualTo(4);
        assertThat(MyDayService.staleDays(now.minusHours(5), now)).isZero();
        assertThat(MyDayService.staleDays(now.plusDays(1), now)).isZero();
        assertThat(MyDayService.staleDays(null, now)).isZero();
    }

    @Test
    void myDay_crossTenantReturnsNotFound() {
        RbacService rbac = mock(RbacService.class);
        MyDayService service = new MyDayService(null, null, null, null, null, rbac);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");
        when(rbac.getUserTier("user-A", "ws-B")).thenReturn(0);

        assertThatThrownBy(() -> service.myDay("user-A", "PROJ-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void myDay_returnsOnlyTheCallersRows() {
        WorkItemRepository workItems = mock(WorkItemRepository.class);
        ImpedimentRepository impediments = mock(ImpedimentRepository.class);
        ActionItemRepository actions = mock(ActionItemRepository.class);
        StandupSessionRepository standups = mock(StandupSessionRepository.class);
        StandupEntryRepository entries = mock(StandupEntryRepository.class);
        RbacService rbac = mock(RbacService.class);
        MyDayService service = new MyDayService(workItems, impediments, actions, standups, entries, rbac);

        when(rbac.workspaceForProject("PROJ-1")).thenReturn("ws-A");
        when(rbac.getUserTier("me", "ws-A")).thenReturn(2);

        WorkItem mine = new WorkItem();
        mine.setId("WI-1");
        mine.setTitle("Mine");
        mine.setAssigneeId("me");
        WorkItem theirs = new WorkItem();
        theirs.setId("WI-2");
        theirs.setTitle("Theirs");
        theirs.setAssigneeId("other");
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(mine, theirs));

        Impediment minePending = new Impediment();
        minePending.setRaisedBy("me");
        minePending.setStatus("OPEN");
        Impediment mineResolved = new Impediment();
        mineResolved.setRaisedBy("me");
        mineResolved.setStatus("RESOLVED");
        Impediment someoneElses = new Impediment();
        someoneElses.setRaisedBy("other");
        someoneElses.setStatus("OPEN");
        when(impediments.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc("PROJ-1"))
                .thenReturn(List.of(minePending, mineResolved, someoneElses));

        ActionItem myAction = new ActionItem();
        myAction.setOwnerId("me");
        myAction.setStatus("OPEN");
        ActionItem doneAction = new ActionItem();
        doneAction.setOwnerId("me");
        doneAction.setStatus("DONE");
        when(actions.findByProjectIdScopedToUser("PROJ-1", "me")).thenReturn(List.of(myAction, doneAction));

        when(standups.findByProjectIdOrderByCreatedAtDesc("PROJ-1")).thenReturn(List.of());

        Map<String, Object> out = service.myDay("me", "PROJ-1");

        assertThat((List<?>) out.get("myItems")).hasSize(1);
        assertThat(out.get("myImpediments")).isEqualTo(List.of(minePending));
        assertThat(out.get("myActions")).isEqualTo(List.of(myAction));
        assertThat(out.get("todayStandup")).isNull();
        assertThat(out.get("myStandupEntry")).isNull();
    }
}
