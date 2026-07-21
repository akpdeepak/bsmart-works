package com.bcits.works.reporting;

import com.bcits.works.AiCapabilities;
import com.bcits.works.ai.AiControlPlaneService;
import com.bcits.works.ai.AiModelTier;
import com.bcits.works.auth.RbacService;
import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cap J · AI-suggested starter dashboards (RB-40 §2, INSIGHTS-AI-ALIGNMENT-REVIEW §2.2). Verifies the
 * deterministic role-based starter set (the mandatory fallback, a pure function), that the service
 * enforces {@code view_items} before any AI budget is touched (RB-10 §2), routes through the one
 * control plane, and that the capability is registered HAIKU + fallback (RB-40 §2 model tiering).
 */
@Tag("unit")
class DashboardSuggestionServiceTest {

    private static final String WS = "ws-1";
    private static final String ME = "user-me";

    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final DashboardSuggestionService service = new DashboardSuggestionService(controlPlane, rbac);

    // ── deterministic role-based starter set (pure fallback) ──────────────────────

    @Test
    void starterWidgets_areRoleSpecificAndNonEmpty() {
        for (String role : DashboardSuggestionService.ROLE_KEYS) {
            assertThat(DashboardSuggestionService.starterWidgets(role))
                .as("starter set for %s", role).isNotEmpty();
        }
        // The scrum-master set is velocity-aware; the developer set is "mine"-scoped.
        assertThat(DashboardSuggestionService.starterWidgets("scrum-master"))
            .anySatisfy(w -> assertThat(w.title()).containsIgnoringCase("velocity"));
        assertThat(DashboardSuggestionService.starterWidgets("developer"))
            .anySatisfy(w -> assertThat(w.title()).containsIgnoringCase("my"));
    }

    @Test
    void starterWidgets_unknownRoleFallsBackToGenericSet() {
        assertThat(DashboardSuggestionService.starterWidgets("nobody")).isNotEmpty();
        // Unknown role normalizes to developer at the boundary.
        assertThat(DashboardSuggestionService.normalizeRole("Scrum_Master")).isEqualTo("scrum-master");
        assertThat(DashboardSuggestionService.normalizeRole(" Product Owner "))
            .isEqualTo("product-owner");
        assertThat(DashboardSuggestionService.normalizeRole(null)).isEqualTo("developer");
        assertThat(DashboardSuggestionService.normalizeRole("nope")).isEqualTo("developer");
    }

    @Test
    void starterWidgets_useRenderableWidgetTypes() {
        // Every proposed widget must be a type the dashboard widget card can actually render.
        var renderable = java.util.Set.of("SCORECARD", "STATUS_BAR", "ITEM_LIST", "PIE", "BAR");
        for (String role : DashboardSuggestionService.ROLE_KEYS) {
            assertThat(DashboardSuggestionService.starterWidgets(role))
                .allSatisfy(w -> assertThat(renderable).contains(w.widgetType()));
        }
    }

    // ── RBAC + control-plane routing ─────────────────────────────────────────────

    @Test
    void suggest_requiresViewItemsBeforeTouchingAi() {
        doThrow(ApiException.forbidden("no access"))
            .when(rbac).require(ME, WS, "view_items");

        assertThatThrownBy(() -> service.suggest(WS, ME, "developer", true))
            .isInstanceOf(ApiException.class);

        verify(rbac).require(ME, WS, "view_items");
        verify(controlPlane, never()).invoke(any());   // never reaches the AI budget
    }

    @Test
    void suggest_routesThroughControlPlaneAndFallsBackDeterministically() {
        when(controlPlane.invoke(any())).thenReturn(
            AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));

        DashboardSuggestionService.Suggestion s = service.suggest(WS, ME, "scrum-master", true);

        verify(rbac).require(ME, WS, "view_items");
        verify(controlPlane).invoke(any());
        assertThat(s.fallback()).isTrue();
        assertThat(s.usedAi()).isFalse();
        assertThat(s.policyState()).isEqualTo("DISABLED_WORKSPACE");
        assertThat(s.role()).isEqualTo("scrum-master");
        // The widgets are the deterministic starter set even on fallback (the structure is always valid).
        assertThat(s.widgets()).isEqualTo(DashboardSuggestionService.starterWidgets("scrum-master"));
        // On fallback the rationale is the deterministic one, not AI text.
        assertThat(s.rationale()).contains("starter set");
    }

    @Test
    void suggest_usesAiRationaleWhenEnabledButKeepsDeterministicWidgets() {
        when(controlPlane.invoke(any())).thenReturn(
            new AiControlPlaneService.AiOutcome(true, false, "Tuned for a scrum master leading a sprint.",
                AiModelTier.HAIKU, "ENABLED", 1, false));

        DashboardSuggestionService.Suggestion s = service.suggest(WS, ME, "scrum-master", true);

        assertThat(s.usedAi()).isTrue();
        assertThat(s.fallback()).isFalse();
        assertThat(s.rationale()).isEqualTo("Tuned for a scrum master leading a sprint.");
        assertThat(s.tier()).isEqualTo("HAIKU");
        // AI only refines the rationale — the widget set is still the deterministic starter set.
        assertThat(s.widgets()).isEqualTo(DashboardSuggestionService.starterWidgets("scrum-master"));
    }

    @Test
    void capability_isRegisteredAsHaikuWithFallback() {
        assertThat(AiCapabilities.isKnown(AiCapabilities.DASHBOARD_SUGGESTION)).isTrue();
        assertThat(AiCapabilities.defaultTier(AiCapabilities.DASHBOARD_SUGGESTION)).isEqualTo(AiModelTier.HAIKU);
        AiCapabilities.Descriptor d = AiCapabilities.all().stream()
            .filter(x -> x.id().equals(AiCapabilities.DASHBOARD_SUGGESTION)).findFirst().orElseThrow();
        assertThat(d.fallback()).isNotBlank();
    }
}
