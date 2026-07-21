package com.bcits.works.ai;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * EPIC 15 - Canvas & AI Artifacts
 *
 * <p><b>Tenant isolation + RBAC.</b>
 * Every generation request goes through the {@link AiAssistService} which applies
 * tenant-scoped limits and forwards to the AI Control Plane.
 */
@RestController
@RequestMapping("/api/v1/ai/artifacts")
public class AiArtifactController {

    private final AiAssistService assist;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public AiArtifactController(AiAssistService assist, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.assist = assist;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    public record GenerateRequest(String prompt) { }
    
    public record GenerateResponse(List<Map<String, Object>> blocks, AiAssistService.AiMeta meta) { }

    @PostMapping("/generate")
    public ResponseEntity<GenerateResponse> generate(@RequestParam String workspaceId,
                                                     @RequestBody GenerateRequest request) {
        // RBAC: Generating an artifact requires basic workspace read access.
        // It does not persist anything until the user explicitly saves it.
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        
        // Use AiAssistService to generate the artifact blocks via the AI Control Plane
        AiAssistService.ArtifactGenerationResult result = assist.generateArtifact(
            workspaceId, authenticatedUser.id(), request.prompt(), true);
            
        return ResponseEntity.ok(new GenerateResponse(result.blocks(), result.meta()));
    }
}
