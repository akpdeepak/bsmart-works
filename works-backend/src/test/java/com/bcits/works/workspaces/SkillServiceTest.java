package com.bcits.works.workspaces;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * People Graph / Skills (EPIC-22). Tenant isolation (RB-40 §1): a non-member sees a 404 and no query
 * runs; skills and edges are workspace-scoped; a person-skill cannot link to a foreign skill. Every
 * write is RBAC-gated.
 */
@Tag("unit")
class SkillServiceTest {

    private final SkillRepository skills = mock(SkillRepository.class);
    private final PersonSkillRepository personSkills = mock(PersonSkillRepository.class);
    private final RbacGate rbac = mock(RbacGate.class);
    private final SkillService service = new SkillService(skills, personSkills, rbac);

    private Skill skill(String id, String ws, String name) {
        Skill s = new Skill();
        s.setId(id);
        s.setWorkspaceId(ws);
        s.setName(name);
        return s;
    }

    @Test
    void listSkills_nonMemberGets404_andNeverQueries() {
        when(rbac.getUserTier("USR-OUT", "WS-B")).thenReturn(0);
        assertThatThrownBy(() -> service.listSkills("USR-OUT", "WS-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(skills, never()).findByWorkspaceIdOrderByNameAsc("WS-B");
    }

    @Test
    void createSkill_deniedWithoutPermission() {
        doThrow(ApiException.forbidden("no")).when(rbac).require("USR-1", "WS-1", "create_items");
        assertThatThrownBy(() -> service.createSkill("USR-1", "WS-1", "Kafka", "backend"))
                .isInstanceOf(ApiException.class);
        verify(skills, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createSkill_persistsWorkspaceScopedSkill() {
        when(skills.existsByWorkspaceIdAndName("WS-1", "Kafka")).thenReturn(false);
        when(skills.save(org.mockito.ArgumentMatchers.any(Skill.class))).thenAnswer(i -> i.getArgument(0));
        Skill created = service.createSkill("USR-1", "WS-1", "Kafka", "backend");
        assertThat(created.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(created.getName()).isEqualTo("Kafka");
        assertThat(created.getId()).startsWith("SKL-");
    }

    @Test
    void peopleWithSkill_returnsWorkspaceScopedEdges() {
        when(rbac.getUserTier("USR-1", "WS-1")).thenReturn(2);
        PersonSkill edge = new PersonSkill();
        edge.setUserId("USR-9");
        edge.setSkillId("SKL-1");
        when(personSkills.findByWorkspaceIdAndSkillId("WS-1", "SKL-1")).thenReturn(List.of(edge));
        assertThat(service.peopleWithSkill("USR-1", "WS-1", "SKL-1")).containsExactly(edge);
    }

    @Test
    void addPersonSkill_rejectsSkillFromAnotherWorkspace() {
        // Skill SKL-X belongs to WS-OTHER; linking it inside WS-1 must 404, not cross tenants.
        when(skills.findById("SKL-X")).thenReturn(Optional.of(skill("SKL-X", "WS-OTHER", "Foreign")));
        assertThatThrownBy(() -> service.addPersonSkill("USR-1", "WS-1", "USR-9", "SKL-X", "EXPERT"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(personSkills, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void addPersonSkill_createsScopedEdgeWithValidProficiency() {
        when(skills.findById("SKL-1")).thenReturn(Optional.of(skill("SKL-1", "WS-1", "Kafka")));
        when(personSkills.existsByWorkspaceIdAndUserIdAndSkillId("WS-1", "USR-9", "SKL-1")).thenReturn(false);
        when(personSkills.save(org.mockito.ArgumentMatchers.any(PersonSkill.class))).thenAnswer(i -> i.getArgument(0));

        PersonSkill ps = service.addPersonSkill("USR-1", "WS-1", "USR-9", "SKL-1", "expert");

        ArgumentCaptor<PersonSkill> captor = ArgumentCaptor.forClass(PersonSkill.class);
        verify(personSkills).save(captor.capture());
        assertThat(captor.getValue().getWorkspaceId()).isEqualTo("WS-1");
        assertThat(captor.getValue().getUserId()).isEqualTo("USR-9");
        assertThat(captor.getValue().getProficiency()).isEqualTo("EXPERT");
        assertThat(ps.getId()).startsWith("PSK-");
    }

    @Test
    void addPersonSkill_rejectsInvalidProficiency() {
        assertThatThrownBy(() -> service.addPersonSkill("USR-1", "WS-1", "USR-9", "SKL-1", "wizard"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(rbac).require(eq("USR-1"), eq("WS-1"), eq("create_items"));
    }
}
