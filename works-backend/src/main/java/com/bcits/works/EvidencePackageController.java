package com.bcits.works;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Cap Y · Compliance evidence package HTTP surface (iteration 16). Thin; delegates to
 * {@link EvidencePackageService}.
 */
@RestController
@RequestMapping("/api/v1/evidence-packages")
public class EvidencePackageController {

    private final EvidencePackageService service;
    private final AuthenticatedUser authenticatedUser;

    public EvidencePackageController(EvidencePackageService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<EvidencePackage> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/{id}")
    public EvidencePackage get(@PathVariable String id) {
        return service.get(authenticatedUser.id(), id);
    }

    @PostMapping
    public EvidencePackage generate(@RequestParam String workspaceId, @RequestBody(required = false) Map<String, Object> body) {
        String framework = body == null ? null : (String) body.get("framework");
        return service.generate(authenticatedUser.id(), workspaceId, framework);
    }
}
