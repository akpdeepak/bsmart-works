package com.bcits.works;
import com.bcits.works.projects.Idea;
import com.bcits.works.projects.IdeaService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class IdeaServiceTest {

    private final IdeaService service = new IdeaService(null, null, null);

    @Test
    void prepareNew_stampsDefaultsAndAutoClassifies() {
        Idea i = new Idea();
        i.setTitle("Add SSO login via SAML");
        service.prepareNew(i, "USR-1");
        assertThat(i.getId()).startsWith("IDEA-");
        assertThat(i.getSubmittedBy()).isEqualTo("USR-1");
        assertThat(i.getStatus()).isEqualTo("NEW");
        assertThat(i.getArea()).isEqualTo("Auth");
        assertThat(i.getCreatedAt()).isNotNull();
    }

    @Test
    void classifyArea_routesByKeywords() {
        assertThat(IdeaService.classifyArea("Mobile app crash", null)).isEqualTo("Mobile");
        assertThat(IdeaService.classifyArea("Velocity dashboard", "new chart")).isEqualTo("Reporting");
        assertThat(IdeaService.classifyArea("Slack webhook", "integration")).isEqualTo("Integrations");
        assertThat(IdeaService.classifyArea("Something else", null)).isEqualTo("General");
    }

    @Test
    void prepareNew_respectsProvidedArea() {
        Idea i = new Idea();
        i.setTitle("x");
        i.setArea("Billing");
        service.prepareNew(i, "USR-1");
        assertThat(i.getArea()).isEqualTo("Billing");
    }
}
