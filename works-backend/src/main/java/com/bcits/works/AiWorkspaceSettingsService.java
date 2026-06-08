package com.bcits.works;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * AI workspace settings (RB-40 §2): the default model tier and the data-boundary flags. The caller
 * (AiController) applies RBAC — workspace membership to read, {@code manage_ai} to write — and every
 * access is workspace-scoped (RB-40 §1). A workspace with no row uses the system defaults.
 */
@Service
public class AiWorkspaceSettingsService {

    private static final List<String> TIERS = List.of("HAIKU", "SONNET", "OPUS");

    private final AiWorkspaceSettingsRepository repo;

    public AiWorkspaceSettingsService(AiWorkspaceSettingsRepository repo) {
        this.repo = repo;
    }

    /** Current settings, or the system defaults (Sonnet, block PII + financial) when none are set. */
    public AiWorkspaceSettings get(String workspaceId) {
        return repo.findById(workspaceId).orElseGet(() -> {
            AiWorkspaceSettings s = new AiWorkspaceSettings();
            s.setWorkspaceId(workspaceId);
            return s;
        });
    }

    public AiWorkspaceSettings set(String workspaceId, String tier, boolean blockPii, boolean blockFinancial) {
        String t = tier == null ? "" : tier.toUpperCase();
        if (!TIERS.contains(t)) {
            throw ApiException.badRequest("INVALID_TIER", "defaultModelTier must be HAIKU, SONNET or OPUS.");
        }
        AiWorkspaceSettings s = get(workspaceId);
        s.setWorkspaceId(workspaceId);
        s.setDefaultModelTier(t);
        s.setBlockPii(blockPii);
        s.setBlockFinancial(blockFinancial);
        s.setUpdatedAt(OffsetDateTime.now());
        return repo.save(s);
    }
}
