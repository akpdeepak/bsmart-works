package com.bcits.works;
import com.bcits.works.reporting.LeadershipService;
import com.bcits.works.ai.AiAssistService;
import com.bcits.works.ai.api.AiControlPlaneService;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Iteration-16 AI engine for the Leadership Console (Cap X): the AI executive briefing and the
 * quarterly board-deck auto-draft. Both gather <em>workspace-scoped</em> figures via
 * {@link LeadershipService} (RB-40 §1) and route the narrative through
 * {@link AiControlPlaneService#invoke} (RB-40 §2). The deterministic draft assembled from real data
 * is the mandatory fallback — served verbatim when AI is off, over budget or unavailable. The pure
 * render helpers double as those fallbacks and are unit-testable without a database.
 */
@Service
public class Iteration16AiService {

    private final AiControlPlaneService controlPlane;
    private final LeadershipService leadership;

    public Iteration16AiService(AiControlPlaneService controlPlane, LeadershipService leadership) {
        this.controlPlane = controlPlane;
        this.leadership = leadership;
    }

    private Map<String, Object> withNarrative(String capability, String workspaceId, String userId,
                                              boolean inContext, String prompt, String draft,
                                              Map<String, Object> payload) {
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, capability, prompt, draft, null, inContext));
        payload.put("narrative", out.fallback() || out.text() == null ? draft : out.text());
        payload.put("meta", AiAssistService.AiMeta.of(out));
        return payload;
    }

    // ── Cap X · AI executive briefing ────────────────────────────────────────────
    public Map<String, Object> executiveBriefing(String workspaceId, String userId, String focus,
                                                 String tone, String length, boolean inContext) {
        Map<String, Object> rollup = leadership.crossTeamRollup(userId, workspaceId);
        Map<String, Object> customers = leadership.customerHealth(userId, workspaceId);
        Map<String, Object> risks = leadership.riskPortfolio(userId, workspaceId);

        String draft = renderBriefing(focus, rollup, customers, risks);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("rollup", rollup);
        payload.put("customerHealth", customers);
        payload.put("riskPortfolio", risks);
        payload.put("draft", draft);
        String prompt = "Write a " + safe(tone) + ", " + safe(length)
            + " executive briefing focused on: " + safe(focus);
        return withNarrative(AiCapabilities.EXEC_BRIEFING, workspaceId, userId, inContext, prompt, draft, payload);
    }

    /** Deterministic briefing markdown from the rollup / customer / risk figures. Pure (the fallback). */
    @SuppressWarnings("unchecked")
    static String renderBriefing(String focus, Map<String, Object> rollup,
                                 Map<String, Object> customers, Map<String, Object> risks) {
        Map<String, Object> totals = (Map<String, Object>) rollup.getOrDefault("totals", Map.of());
        StringBuilder sb = new StringBuilder("# Executive briefing\n\n");
        if (focus != null && !focus.isBlank()) {
            sb.append("_Focus: ").append(focus.trim()).append("_\n\n");
        }
        sb.append("## Delivery\n");
        sb.append("- ").append(num(totals.get("total"))).append(" work items, ")
          .append(rollup.getOrDefault("completionRate", 0)).append("% complete; ")
          .append(num(totals.get("in_progress"))).append(" in progress, ")
          .append(num(totals.get("overdue"))).append(" overdue, ")
          .append(num(totals.get("unassigned"))).append(" unassigned.\n\n");

        sb.append("## Customer health\n");
        List<Map<String, Object>> cust = (List<Map<String, Object>>) customers.getOrDefault("customers", List.of());
        sb.append("- ").append(cust.size()).append(" active customers; ")
          .append(customers.getOrDefault("atRiskCount", 0)).append(" at churn risk.\n");
        for (Map<String, Object> c : cust) {
            if (!"LOW".equals(c.get("churnRisk"))) {
                sb.append("  - ").append(c.get("name")).append(" — health ")
                  .append(c.get("healthScore")).append("/100 (").append(c.get("churnRisk"))
                  .append(" risk), ").append(c.get("overdueRequests")).append(" overdue requests.\n");
            }
        }
        sb.append("\n## Top risks\n");
        List<Map<String, Object>> riskList = (List<Map<String, Object>>) risks.getOrDefault("risks", List.of());
        if (riskList.isEmpty()) {
            sb.append("- No open risks.\n");
        } else {
            riskList.stream().limit(5).forEach(r ->
                sb.append("- [score ").append(r.get("score")).append("] ").append(r.get("title")).append("\n"));
        }
        return sb.toString();
    }

    // ── Cap X · Quarterly board-deck auto-draft ──────────────────────────────────
    public Map<String, Object> boardDeck(String workspaceId, String userId, String quarter, boolean inContext) {
        Map<String, Object> rollup = leadership.crossTeamRollup(userId, workspaceId);
        Map<String, Object> themes = leadership.strategicThemes(userId, workspaceId);
        Map<String, Object> risks = leadership.riskPortfolio(userId, workspaceId);

        List<Map<String, Object>> slides = buildSlides(quarter, rollup, themes, risks);
        String draft = renderSlides(slides);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("quarter", quarter);
        payload.put("slides", slides);
        payload.put("draft", draft);
        return withNarrative(AiCapabilities.BOARD_DECK, workspaceId, userId, inContext,
            "Draft the engineering/delivery board-deck section for " + safe(quarter), draft, payload);
    }

    /** Deterministic slide outline for the board deck. Pure (the fallback). */
    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> buildSlides(String quarter, Map<String, Object> rollup,
                                                 Map<String, Object> themes, Map<String, Object> risks) {
        Map<String, Object> totals = (Map<String, Object>) rollup.getOrDefault("totals", Map.of());
        List<Map<String, Object>> slides = new ArrayList<>();
        slides.add(slide("Engineering & Delivery — " + safe(quarter),
            List.of("Cross-team delivery overview", "Strategic themes", "Risk posture")));
        slides.add(slide("Delivery summary", List.of(
            num(totals.get("total")) + " work items, " + rollup.getOrDefault("completionRate", 0) + "% complete",
            num(totals.get("in_progress")) + " in progress; " + num(totals.get("overdue")) + " overdue")));

        List<Map<String, Object>> themeList = (List<Map<String, Object>>) themes.getOrDefault("themes", List.of());
        List<String> themeBullets = new ArrayList<>();
        for (Map<String, Object> t : themeList) {
            themeBullets.add(t.get("name") + " — " + t.get("progress") + "% (" + t.get("status") + ")");
        }
        if (themeBullets.isEmpty()) themeBullets.add("No strategic themes defined."); {
        slides.add(slide("Strategic themes", themeBullets));
        }

        List<Map<String, Object>> riskList = (List<Map<String, Object>>) risks.getOrDefault("risks", List.of());
        List<String> riskBullets = new ArrayList<>();
        riskList.stream().limit(5).forEach(r -> riskBullets.add("[" + r.get("score") + "] " + r.get("title")));
        if (riskBullets.isEmpty()) riskBullets.add("No open risks."); {
        slides.add(slide("Top risks", riskBullets));
        }
        return slides;
    }

    private static Map<String, Object> slide(String title, List<String> bullets) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("title", title);
        s.put("bullets", bullets);
        return s;
    }

    static String renderSlides(List<Map<String, Object>> slides) {
        StringBuilder sb = new StringBuilder();
        int n = 1;
        for (Map<String, Object> s : slides) {
            sb.append("## Slide ").append(n++).append(": ").append(s.get("title")).append("\n");
            @SuppressWarnings("unchecked")
            List<String> bullets = (List<String>) s.get("bullets");
            for (String b : bullets) sb.append("- ").append(b).append("\n"); {
            sb.append("\n");
            }
        }
        return sb.toString();
    }

    private static long num(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static String safe(String s) {
        return s == null || s.isBlank() ? "—" : s.trim();
    }
}
