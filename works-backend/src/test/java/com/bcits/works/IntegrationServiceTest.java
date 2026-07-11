package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Integration connector behaviour (iteration 13, Cap Q / Cap A): provider config validation, connect
 * upsert, and the email inbound → work item path with its workspace-scope guard (RB-40 §1).
 */
@Tag("unit")
class IntegrationServiceTest {

    private static final String WS = "ws-1";

    private final IntegrationConnectionRepository connections = mock(IntegrationConnectionRepository.class);
    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final EventService events = mock(EventService.class);

    private final AutomationService automations = mock(AutomationService.class);

    private final IntegrationService svc = new IntegrationService(connections, workItems, projects, events, automations);

    private Project project(String id) {
        Project p = new Project();
        p.setId(id);
        p.setWorkspaceId(WS);
        return p;
    }

    @Test
    void validateConfig_requiresProviderFields() {
        assertThatThrownBy(() -> IntegrationService.validateConfig(IntegrationCatalog.SLACK, Map.of()))
            .isInstanceOf(ApiException.class);
        IntegrationService.validateConfig(IntegrationCatalog.SLACK, Map.of("webhookUrl", "https://x"));
    }

    @Test
    void connect_rejectsUnknownProvider() {
        assertThatThrownBy(() -> svc.connect(WS, "user-1", "FACEBOOK", "x", "{}"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void connect_persistsConnectedConnection() {
        when(connections.findByWorkspaceIdAndProviderAndName(any(), any(), any())).thenReturn(java.util.Optional.empty());
        when(connections.save(any(IntegrationConnection.class))).thenAnswer(i -> i.getArgument(0));

        IntegrationConnection conn = svc.connect(WS, "user-1", "slack", "Eng channel",
            "{\"webhookUrl\":\"https://hooks.slack.com/x\"}");

        assertThat(conn.getProvider()).isEqualTo("SLACK");
        assertThat(conn.getStatus()).isEqualTo("CONNECTED");
        assertThat(conn.getId()).startsWith("INT-");
    }

    @Test
    void inboundEmail_createsWorkItemInWorkspaceProject() {
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project("PROJ-1")));
        when(workItems.save(any(WorkItem.class))).thenAnswer(i -> i.getArgument(0));

        WorkItem w = svc.ingestInboundEmail(WS, "user-1", "Meter outage", "Body text", null);

        assertThat(w.getType()).isEqualTo("Service Request");
        assertThat(w.getProjectId()).isEqualTo("PROJ-1");
        verify(workItems).save(any(WorkItem.class));
    }

    @Test
    void inboundEmail_rejectsForeignProject() {
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project("PROJ-1")));
        assertThatThrownBy(() -> svc.ingestInboundEmail(WS, "user-1", "x", "y", "PROJ-FOREIGN"))
            .isInstanceOf(ApiException.class);
        verify(workItems, never()).save(any());
    }
}
