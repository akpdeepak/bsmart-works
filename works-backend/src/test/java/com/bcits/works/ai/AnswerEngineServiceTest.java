package com.bcits.works.ai;

import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;
import com.bcits.works.projects.Project;
import com.bcits.works.projects.ProjectRepository;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnswerEngineServiceTest {

    private AnswerEngineService service;
    private AiControlPlaneService controlPlane;
    private ArticleRepository articles;
    private KnowledgeSpaceRepository spaces;
    private ProjectRepository projects;
    private WorkItemRepository workItems;

    @BeforeEach
    void setup() {
        controlPlane = mock(AiControlPlaneService.class);
        articles = mock(ArticleRepository.class);
        spaces = mock(KnowledgeSpaceRepository.class);
        projects = mock(ProjectRepository.class);
        workItems = mock(WorkItemRepository.class);

        service = new AnswerEngineService(controlPlane, articles, spaces, projects, workItems);
    }

    @Test
    void testAskReturnsHighConfidenceWithSources() {
        KnowledgeSpace space = new KnowledgeSpace();
        space.setId("s1");
        when(spaces.findByWorkspaceIdOrderByNameAsc("ws1")).thenReturn(List.of(space));

        Article article = new Article();
        article.setId("a1");
        article.setTitle("How to login");
        article.setContent("Go to the login page");
        when(articles.findBySpaceIdOrderByUpdatedAtDesc("s1")).thenReturn(List.of(article));

        Project project = new Project();
        project.setId("p1");
        when(projects.findByWorkspaceId("ws1")).thenReturn(List.of(project));

        WorkItem item = new WorkItem();
        item.setId("w1");
        item.setTitle("Login is broken");
        item.setDescription("Login button does not work");
        item.setStatus("Open");
        when(workItems.findByProjectId("p1")).thenReturn(List.of(item));

        AiControlPlaneService.AiOutcome out = new AiControlPlaneService.AiOutcome(
            true, false, "To login, fix the button.", AiModelTier.SONNET, "ENABLED", 0, false);
        when(controlPlane.invoke(any())).thenReturn(out);

        AnswerEngineService.AnswerResponse response = service.ask("ws1", "u1", "How do I login?", false);

        assertEquals("To login, fix the button.", response.answer());
        assertEquals("HIGH", response.confidence());
        assertEquals(2, response.sources().size()); // matched both article and workitem because of keyword "login"
    }

    @Test
    void testAskReturnsLowConfidenceWithoutSources() {
        when(spaces.findByWorkspaceIdOrderByNameAsc("ws1")).thenReturn(List.of());
        when(projects.findByWorkspaceId("ws1")).thenReturn(List.of());

        AiControlPlaneService.AiOutcome out = new AiControlPlaneService.AiOutcome(
            true, true, "I don't know.", AiModelTier.SONNET, "ENABLED", 0, false);
        when(controlPlane.invoke(any())).thenReturn(out);

        AnswerEngineService.AnswerResponse response = service.ask("ws1", "u1", "How do I jump?", false);

        assertEquals("I don't know.", response.answer());
        assertEquals("LOW", response.confidence());
        assertEquals(0, response.sources().size());
    }
}
