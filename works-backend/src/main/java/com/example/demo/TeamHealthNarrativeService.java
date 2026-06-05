package com.example.demo;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Team-health narrative generator (iteration 12, Cap L · "AI team-health narrative").
 *
 * <p>The spec frames this as an AI feature ("AI generates narrative: 'Predictability improved; scope
 * stability declined due to mid-sprint additions.'"). Per the AI Control Plane fallback contract
 * (RB-40 §2 — <em>no fallback documented = it does not ship</em>), every AI feature must answer
 * "what happens when AI is off, over budget, or unavailable?" This service <strong>is</strong> that
 * deterministic fallback: a rules-based narrative composed from the computed team-health deltas. It
 * ships and works today with no model dependency.
 *
 * <p><b>AI seam:</b> when the iteration 10/11 orchestration layer lands, an AI generator can produce a
 * richer narrative — but it must (a) run server-side only, (b) receive only already-aggregated,
 * privacy-safe inputs (never individual data — RB-40 §1), and (c) fall back to {@link #generate} on
 * any off/over-budget/unavailable state. The orchestrator cannot bypass the privacy guardrails: it is
 * handed the same aggregated numbers the deterministic path uses.
 *
 * <p>Pure (no I/O) and unit-tested.
 */
@Service
public class TeamHealthNarrativeService {

    /** A generated narrative plus its structured highlights and which engine produced it. */
    public record Narrative(String summary, List<String> highlights, String source) {}

    private static final double MATERIAL_DELTA = 3.0; // points; below this a change isn't called out

    /**
     * Compose a narrative from the current health, the previous period's health (may be null on the
     * first period), and the count of mid-sprint scope additions that period. Deterministic: the same
     * inputs always yield the same narrative.
     */
    public Narrative generate(TeamHealthService.TeamHealth current,
                              TeamHealthService.TeamHealth previous,
                              int midSprintScopeAdditions) {
        List<String> highlights = new ArrayList<>();
        StringBuilder summary = new StringBuilder();

        summary.append("Overall team health is ").append(bandWord(current.band()))
            .append(" at ").append(fmt(current.composite())).append("%.");

        if (previous != null) {
            describeDelta(highlights, "Predictability", current.predictability(), previous.predictability(),
                midSprintScopeAdditions);
            describeDelta(highlights, "Scope stability", current.scopeStability(), previous.scopeStability(),
                midSprintScopeAdditions);
            describeDelta(highlights, "Flow efficiency", current.flowEfficiency(), previous.flowEfficiency(),
                midSprintScopeAdditions);
        } else {
            highlights.add("Predictability is at " + fmt(current.predictability()) + "%.");
            highlights.add("Scope stability is at " + fmt(current.scopeStability()) + "%.");
            highlights.add("Flow efficiency is at " + fmt(current.flowEfficiency()) + "%.");
        }

        if (highlights.isEmpty()) {
            highlights.add("Metrics held steady versus the previous period.");
        }
        summary.append(' ').append(String.join(" ", highlights));
        return new Narrative(summary.toString(), highlights, "deterministic");
    }

    private void describeDelta(List<String> out, String label, double now, double then, int scopeAdditions) {
        double delta = now - then;
        if (Math.abs(delta) < MATERIAL_DELTA) {
            return;
        }
        StringBuilder s = new StringBuilder();
        s.append(label).append(delta > 0 ? " improved " : " declined ")
            .append(fmt(Math.abs(delta))).append(" points to ").append(fmt(now)).append('%');
        // Attribute a scope-stability decline to mid-sprint additions when there were any — this is
        // the concrete "likely cause" the spec calls for, derived from data, not invented.
        if (delta < 0 && "Scope stability".equals(label) && scopeAdditions > 0) {
            s.append(", likely due to ").append(scopeAdditions)
                .append(scopeAdditions == 1 ? " mid-sprint addition" : " mid-sprint additions");
        }
        s.append('.');
        out.add(s.toString());
    }

    private String bandWord(String band) {
        if (band == null) return "unknown";
        switch (band) {
            case "HEALTHY": return "healthy";
            case "WATCH":   return "worth watching";
            case "AT_RISK": return "at risk";
            default:        return band.toLowerCase();
        }
    }

    private String fmt(double v) {
        return (Math.round(v * 10.0) / 10.0) + "";
    }
}
