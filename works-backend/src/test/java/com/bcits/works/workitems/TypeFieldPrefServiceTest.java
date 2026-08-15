package com.bcits.works.workitems;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class TypeFieldPrefServiceTest {

    private final TypeFieldPrefRepository repository = mock(TypeFieldPrefRepository.class);
    private final TypeFieldPrefService service = new TypeFieldPrefService(repository);

    @Test
    void listDelegatesToWorkspaceScopedRepositoryRead() {
        TypeFieldPref pref = new TypeFieldPref();
        when(repository.findByWorkspaceId("ws-1")).thenReturn(List.of(pref));

        assertThat(service.list("ws-1")).containsExactly(pref);
    }

    @Test
    void replaceDeletesPriorRowsSkipsBlankFieldsAndAppliesDefaults() {
        TypeFieldPref reloaded = new TypeFieldPref();
        when(repository.findByWorkspaceId("ws-1")).thenReturn(List.of(reloaded));
        List<TypeFieldPrefService.PrefRequest> requests = List.of(
            new TypeFieldPrefService.PrefRequest("summary", null, null),
            new TypeFieldPrefService.PrefRequest(" ", false, 9),
            new TypeFieldPrefService.PrefRequest("priority", false, 7));

        assertThat(service.replace("ws-1", "TASK", requests)).containsExactly(reloaded);

        verify(repository).deleteByWorkspaceIdAndTypeKey("ws-1", "TASK");
        ArgumentCaptor<TypeFieldPref> saved = ArgumentCaptor.forClass(TypeFieldPref.class);
        verify(repository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).allSatisfy(pref -> {
            assertThat(pref.getId()).startsWith("tfp_").hasSize(16);
            assertThat(pref.getWorkspaceId()).isEqualTo("ws-1");
            assertThat(pref.getTypeKey()).isEqualTo("TASK");
            assertThat(pref.getCreatedAt()).isNotNull();
        });
        assertThat(saved.getAllValues().get(0).getFieldKey()).isEqualTo("summary");
        assertThat(saved.getAllValues().get(0).getVisible()).isTrue();
        assertThat(saved.getAllValues().get(0).getSortOrder()).isZero();
        assertThat(saved.getAllValues().get(1).getFieldKey()).isEqualTo("priority");
        assertThat(saved.getAllValues().get(1).getVisible()).isFalse();
        assertThat(saved.getAllValues().get(1).getSortOrder()).isEqualTo(7);
    }
}
