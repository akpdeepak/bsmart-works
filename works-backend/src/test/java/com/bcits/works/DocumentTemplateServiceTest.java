package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Document template CRUD (iteration-20 Cap I). Pure unit tests with mocked repository/events
 * (RB-10 §7). Includes the mandatory cross-tenant test (RB-40 §1): a get of another workspace's
 * template is a {@code NOT_FOUND}, and the row is never returned across the boundary.
 */
@Tag("unit")
class DocumentTemplateServiceTest {

    private final DocumentTemplateRepository repo = mock(DocumentTemplateRepository.class);
    private final EventService events = mock(EventService.class);
    private final DocumentTemplateService service = new DocumentTemplateService(repo, events);

    private static final String WS = "ws-1";
    private static final String USER = "user-1";

    private DocumentTemplate template(String id, String workspaceId) {
        DocumentTemplate t = new DocumentTemplate();
        t.setId(id);
        t.setWorkspaceId(workspaceId);
        t.setName("Runbook");
        return t;
    }

    @Test
    void create_stampsIdWorkspaceTimestampsAndAudits() {
        when(repo.save(any(DocumentTemplate.class))).thenAnswer(i -> i.getArgument(0));
        DocumentTemplate input = new DocumentTemplate();
        input.setName("Postmortem");
        input.setCategory("POSTMORTEM");

        DocumentTemplate saved = service.create(WS, USER, input);

        assertThat(saved.getId()).startsWith("DTPL-");
        assertThat(saved.getWorkspaceId()).isEqualTo(WS);
        assertThat(saved.getCreatedBy()).isEqualTo(USER);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        verify(events).recordInWorkspace(eqWs(), any(), any(), any(), any());
    }

    @Test
    void create_rejectsBlankName() {
        DocumentTemplate input = new DocumentTemplate();
        input.setName("  ");
        assertThatThrownBy(() -> service.create(WS, USER, input))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("TEMPLATE_NAME_REQUIRED"));
        verify(repo, never()).save(any());
    }

    @Test
    void get_returnsTemplateInOwnWorkspace() {
        when(repo.findById("DTPL-1")).thenReturn(Optional.of(template("DTPL-1", WS)));
        assertThat(service.get(WS, "DTPL-1").getId()).isEqualTo("DTPL-1");
    }

    @Test
    void get_crossTenantTemplateIsNotFound() {
        // The row exists, but it belongs to another workspace — must not be returned (RB-40 §1).
        when(repo.findById("DTPL-foreign")).thenReturn(Optional.of(template("DTPL-foreign", "ws-OTHER")));
        assertThatThrownBy(() -> service.get(WS, "DTPL-foreign"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void update_appliesEditsWhenInWorkspace() {
        when(repo.findById("DTPL-1")).thenReturn(Optional.of(template("DTPL-1", WS)));
        when(repo.save(any(DocumentTemplate.class))).thenAnswer(i -> i.getArgument(0));
        DocumentTemplate edit = new DocumentTemplate();
        edit.setName("Renamed");
        edit.setBody("# New body");

        DocumentTemplate saved = service.update(WS, USER, "DTPL-1", edit);

        assertThat(saved.getName()).isEqualTo("Renamed");
        assertThat(saved.getBody()).isEqualTo("# New body");
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void delete_removesTemplateInWorkspace() {
        when(repo.findById("DTPL-1")).thenReturn(Optional.of(template("DTPL-1", WS)));
        service.delete(WS, USER, "DTPL-1");
        verify(repo).delete(any(DocumentTemplate.class));
        verify(events).recordInWorkspace(eqWs(), any(), any(), any(), any());
    }

    private static String eqWs() {
        return org.mockito.ArgumentMatchers.eq(WS);
    }
}
