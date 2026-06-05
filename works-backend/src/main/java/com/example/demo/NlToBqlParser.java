package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic natural-language → BQL parser (iteration 10, Cap O / I10-S12; RB-40 §2). This is the
 * <b>always-available fallback</b> for the "NL → query" surface: a rule-based phrase mapper that
 * needs no model. It maps recognisable phrases to BQL conditions joined by AND, e.g.
 * <pre>
 *   "open bugs assigned to me"   → status != "Done" AND type = "Bug" AND assignee = currentUser()
 *   "my high priority tasks"     → assignee = currentUser() AND priority = "High" AND type = "Task"
 * </pre>
 *
 * <p>The output is intended to compile through {@link BqlCompiler}; the orchestration validates it
 * before returning a preview. When no phrase is recognised the parser returns a
 * {@link #lowConfidence() low-confidence} result the UI shows as "couldn't interpret — use the
 * manual builder", so the deterministic path never silently produces a wrong query.
 *
 * <p>Pure (no I/O), so the phrase table is unit-testable in isolation (mirrors
 * {@link SlaCalculationService}).
 */
@Service
public class NlToBqlParser {

    /** A parsed result: the BQL string, whether confident, and a short human explanation. */
    public record Result(String bql, boolean confident, String explanation) { }

    private static final Pattern PRIORITY_WORD =
        Pattern.compile("\\b(highest|high|medium|low|lowest)\\b", Pattern.CASE_INSENSITIVE);

    private static final List<String[]> TYPE_WORDS = List.of(
        new String[]{"\\bbugs?\\b", "Bug"},
        new String[]{"\\bstor(y|ies)\\b", "Story"},
        new String[]{"\\btasks?\\b", "Task"},
        new String[]{"\\bepics?\\b", "Epic"},
        new String[]{"\\bsub-?tasks?\\b", "Sub-task"});

    /** Parse a phrase into BQL. Never throws — an unrecognised phrase yields a low-confidence result. */
    public Result parse(String phrase) {
        String text = phrase == null ? "" : phrase.toLowerCase().trim();
        if (text.isEmpty()) {
            return lowConfidence();
        }

        List<String> conditions = new ArrayList<>();

        // ── status ──────────────────────────────────────────────────────────────
        // "open" / "not done" / "unresolved" → status != "Done"; "closed"/"done"/"resolved" → status = "Done".
        if (text.matches(".*\\b(open|unresolved|not done|in progress|active|outstanding)\\b.*")) {
            conditions.add("status != \"Done\"");
        } else if (text.matches(".*\\b(closed|done|resolved|completed|finished)\\b.*")) {
            conditions.add("status = \"Done\"");
        }

        // ── type ────────────────────────────────────────────────────────────────
        for (String[] tw : TYPE_WORDS) {
            if (Pattern.compile(tw[0], Pattern.CASE_INSENSITIVE).matcher(text).find()) {
                conditions.add("type = \"" + tw[1] + "\"");
                break;
            }
        }

        // ── priority ────────────────────────────────────────────────────────────
        Matcher pm = PRIORITY_WORD.matcher(text);
        if (pm.find()) {
            conditions.add("priority = \"" + capitalize(pm.group(1)) + "\"");
        }

        // ── assignee ────────────────────────────────────────────────────────────
        // "assigned to me" / "my" / "mine" → currentUser(); "assigned to <name>" → that name.
        if (text.matches(".*\\b(assigned to me|my|mine|to me)\\b.*")) {
            conditions.add("assignee = currentUser()");
        } else {
            Matcher am = Pattern.compile("assigned to ([a-z][a-z .'-]+)", Pattern.CASE_INSENSITIVE).matcher(text);
            if (am.find()) {
                String name = am.group(1).trim()
                    .replaceAll("\\b(last|this) (week|month|year)\\b.*$", "")
                    .trim();
                if (!name.isEmpty()) {
                    conditions.add("assignee = \"" + name + "\"");
                }
            }
        }

        // ── time window (created) ─────────────────────────────────────────────────
        // "today" → created_at >= today(); "this week"/"last week"/"recent" → a recent created cutoff.
        if (text.matches(".*\\btoday\\b.*")) {
            conditions.add("created_at >= today()");
        }

        if (conditions.isEmpty()) {
            return lowConfidence();
        }
        String bql = String.join(" AND ", conditions);
        return new Result(bql, true, "Interpreted as: " + bql);
    }

    /** The standard "could not interpret" result — confident is false, BQL is empty. */
    public Result lowConfidence() {
        return new Result("", false,
            "Couldn't confidently interpret that phrase — use the manual BQL/visual builder.");
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) {
            return s;
        }
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
