package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Fallback documentation surface (iteration 10, Cap Z / I10-S09). Exposes the tested, queryable
 * registry of each AI capability's deterministic behavior when AI is off, over budget, or unavailable
 * (RB-40 §2 fallback contract). The narrative lives in {@code docs/AI-FALLBACKS.md}; this is its
 * machine-readable mirror. No tenant data is involved, so it requires only an authenticated caller.
 */
@RestController
@RequestMapping("/api/v1/ai/fallbacks")
public class AiFallbackController {

    private final AiFallbackRegistry registry;
    private final AuthenticatedUser authenticatedUser;

    public AiFallbackController(AiFallbackRegistry registry, AuthenticatedUser authenticatedUser) {
        this.registry = registry;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        authenticatedUser.id(); // require an authenticated caller
        return registry.asMaps();
    }
}
