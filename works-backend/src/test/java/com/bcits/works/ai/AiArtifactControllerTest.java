package com.bcits.works.ai;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiArtifactControllerTest {

    @Test
    void testGenerateRequiresRbacAndViewItems() {
        AiAssistService assist = mock(AiAssistService.class);
        AuthenticatedUser user = mock(AuthenticatedUser.class);
        when(user.id()).thenReturn("U1");
        RbacGate rbac = mock(RbacGate.class);
        AiArtifactController controller = new AiArtifactController(assist, user, rbac);

        AiAssistService.ArtifactGenerationResult mockResult = new AiAssistService.ArtifactGenerationResult(
            List.of(Map.of("id", "h1")),
            new AiAssistService.AiMeta(false, true, "NONE", "NONE", 0, false)
        );
        when(assist.generateArtifact(eq("WS1"), eq("U1"), eq("test prompt"), anyBoolean()))
            .thenReturn(mockResult);

        ResponseEntity<AiArtifactController.GenerateResponse> response = controller.generate(
            "WS1", new AiArtifactController.GenerateRequest("test prompt"));

        verify(rbac).require("U1", "WS1", "view_items");
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().blocks().size());
        assertEquals(true, response.getBody().meta().fallback());
    }
}
