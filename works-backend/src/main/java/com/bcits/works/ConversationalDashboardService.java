package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conversational dashboards (Cap O, iteration 20). A natural-language ask — "Show velocity per team,
 * last 6 sprints, with predictability composite" — is compiled into a structured widget spec the
 * dashboard renders. The deterministic parser (metric · grouping · timeframe · chart) is the
 * fallback for the {@code conversational_dashboard} capability and pre-fills the manual visual
 * builder, so the feature works with AI off (RB-40 §2). Specs can be saved; every read/write is
 * workspace-scoped (RB-40 §1).
 */
@Service
public class ConversationalDashboardService {

    private static final Pattern TIMEFRAME = Pattern.compile("last\\s+(\\d{1,3})\\s*(sprint|week|day|month)");

    private final ConversationalDashboardRepository repo;
    private final AiControlPlaneService controlPlane;
    private final EventService events;
    private final ObjectMapper json = new ObjectMapper();

    public ConversationalDashboardService(ConversationalDashboardRepository repo,
                                          AiControlPlaneService controlPlane, EventService events) {
        this.repo = repo;
        this.controlPlane = controlPlane;
        this.events = events;
    }

    public record CompiledSpec(Map<String, Object> spec, boolean usedAi, boolean fallback,
                               String policyState, String tier) { }

    // ── Compilation ─────────────────────────────────────────────────────────────────

    /** Parse + (optionally) AI-refine an NL ask into a widget spec. Nothing is persisted here. */
    public CompiledSpec compile(String workspaceId, String userId, String prompt, boolean inContext) {
        if (prompt == null || prompt.isBlank()) {
            throw ApiException.badRequest("PROMPT_REQUIRED", "A dashboard request is required.");
        }
        Map<String, Object> spec = parse(prompt);
        String draft = specToText(spec);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.CONVERSATIONAL_DASHBOARD,
            "Compose a dashboard widget for: " + prompt, draft,
            "convdash:" + prompt.toLowerCase(Locale.ROOT).strip(), inContext));
        // The spec itself is always the deterministic parse (structure must be valid regardless of
        // the model); the AI narrative is attached as the widget caption when AI ran.
        if (!out.fallback() && out.text() != null) {
            spec.put("caption", out.text());
        }
        return new CompiledSpec(spec, out.usedAi(), out.fallback(), out.policyState(),
            out.tier() == null ? "NONE" : out.tier().name());
    }

    /**
     * Deterministic NL → widget-spec parser (pure). Recognises a metric, a grouping dimension, a
     * timeframe and any composite add-ons. Unknown asks still yield a sane default widget.
     */
    static Map<String, Object> parse(String prompt) {
        String p = prompt.toLowerCase(Locale.ROOT);
        Map<String, Object> spec = new LinkedHashMap<>();

        String metric = "throughput";
        if (p.contains("velocity")) {
            metric = "velocity";
        } else if (p.contains("cycle time") || p.contains("cycle-time")) {
            metric = "cycle_time";
        } else if (p.contains("lead time") || p.contains("lead-time")) {
            metric = "lead_time";
        } else if (p.contains("throughput")) {
            metric = "throughput";
        } else if (p.contains("defect") || p.contains("escaped")) {
            metric = "defect_rate";
        } else if (p.contains("burndown") || p.contains("burn-down")) {
            metric = "burndown";
        }
        spec.put("metric", metric);

        String groupBy = "none";
        if (p.contains("per team") || p.contains("by team")) {
            groupBy = "team";
        } else if (p.contains("per project") || p.contains("by project")) {
            groupBy = "project";
        } else if (p.contains("per sprint") || p.contains("by sprint")) {
            groupBy = "sprint";
        } else if (p.contains("per assignee") || p.contains("by assignee") || p.contains("per person")) {
            groupBy = "assignee";
        }
        spec.put("groupBy", groupBy);

        int amount = 6;
        String unit = "sprint";
        Matcher m = TIMEFRAME.matcher(p);
        if (m.find()) {
            amount = Integer.parseInt(m.group(1));
            unit = m.group(2);
        }
        spec.put("timeframe", Map.of("amount", amount, "unit", unit));

        List<String> composites = new java.util.ArrayList<>();
        if (p.contains("predictab")) {
            composites.add("predictability");
        }
        if (p.contains("trend")) {
            composites.add("trend");
        }
        if (p.contains("forecast")) {
            composites.add("forecast");
        }
        spec.put("composites", composites);

        String chart = "bar";
        if ("none".equals(groupBy)) {
            chart = "line";
        }
        if (p.contains("donut") || p.contains("pie") || p.contains("breakdown")) {
            chart = "donut";
        }
        spec.put("chart", chart);
        spec.put("title", titleFor(metric, groupBy));
        return spec;
    }

    static String titleFor(String metric, String groupBy) {
        String pretty = metric.replace('_', ' ');
        String label = Character.toUpperCase(pretty.charAt(0)) + pretty.substring(1);
        return "none".equals(groupBy) ? label : label + " by " + groupBy;
    }

    static String specToText(Map<String, Object> spec) {
        return "Widget: " + spec.get("title") + " (" + spec.get("chart") + " chart, metric="
            + spec.get("metric") + ", groupBy=" + spec.get("groupBy") + ").";
    }

    // ── Persistence ─────────────────────────────────────────────────────────────────

    public List<ConversationalDashboard> list(String workspaceId) {
        return repo.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional
    public ConversationalDashboard save(String workspaceId, String userId, String title, String prompt) {
        CompiledSpec compiled = compile(workspaceId, userId, prompt, true);
        ConversationalDashboard d = new ConversationalDashboard();
        d.setId("CVD-" + shortId());
        d.setWorkspaceId(workspaceId);
        d.setUserId(userId);
        d.setTitle(title == null || title.isBlank() ? String.valueOf(compiled.spec().get("title")) : title.trim());
        d.setPrompt(prompt);
        d.setSpecJson(toJson(compiled.spec()));
        d.setCreatedAt(OffsetDateTime.now());
        ConversationalDashboard saved = repo.save(d);
        events.recordInWorkspace(workspaceId, saved.getId(), "CONVERSATIONAL_DASHBOARD_SAVED", userId,
            java.util.Map.of("title", saved.getTitle()));
        return saved;
    }

    @Transactional
    public void delete(String workspaceId, String userId, String id) {
        ConversationalDashboard d = repo.findByWorkspaceIdAndId(workspaceId, id)
            .orElseThrow(() -> ApiException.notFound("ConversationalDashboard", id));
        repo.delete(d);
        events.recordInWorkspace(workspaceId, id, "CONVERSATIONAL_DASHBOARD_DELETED", userId, java.util.Map.of());
    }

    private String toJson(Map<String, Object> spec) {
        try {
            return json.writeValueAsString(spec);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
