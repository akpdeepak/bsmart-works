package com.bcits.works;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Know Studio AI compose (Know section — make every writing surface AI-assisted, RB-40 §2). One
 * endpoint behind the editor's "AI write / improve / summarize / expand / shorten" actions, so the
 * knowledge editor can draft and refine text inline. Like every AI surface it computes a
 * deterministic result first, then routes through {@link AiControlPlaneService#invoke} so scope /
 * budget / cache / audit and the mandatory fallback contract are enforced centrally.
 *
 * <p>The deterministic result is <em>always</em> returned when AI is off, over budget, or
 * unavailable — the documented fallback (RB-40 §2) is "deterministic text transformation"
 * (extractive summary, whitespace/sentence cleanup, scaffold). AI only enriches it. The transforms
 * are pure {@code static} methods so they are unit-testable without a database or Spring context
 * (RB-10 §7) and double as the fallback implementation.
 *
 * <p>KR-073 adds {@code outline} mode; KR-074 adds {@code check_writing}; KR-075 adds
 * {@code suggest_tags}; KR-076 adds {@code simplify}.
 */
@Service
public class KnowledgeAiService {

    /** The AI capability id this surface bills against (RB-40 §2). Generation is the natural fit. */
    public static final String CAPABILITY = AiCapabilities.GENERATION;

    /** Supported compose modes. Anything else is rejected at the boundary. */
    public static final List<String> MODES = List.of(
        "write", "improve", "expand", "summarize", "shorten",
        "outline", "check_writing", "suggest_tags", "simplify"
    );

    private final AiControlPlaneService controlPlane;

    public KnowledgeAiService(AiControlPlaneService controlPlane) {
        this.controlPlane = controlPlane;
    }

    /** The composed text plus the control-plane verdict, so the editor can show whether AI ran. */
    public record ComposeResult(String mode, String text, AiAssistService.AiMeta meta) { }

    /** KR-074: a single writing issue (text excerpt, suggestion, severity). */
    public record WritingIssue(String text, String suggestion, String severity) { }

    public ComposeResult compose(String workspaceId, String userId, String mode, String text,
                                 String instruction, boolean inContext) {
        String m = normalizeMode(mode);
        String draft = transform(m, text, instruction);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Know compose (" + m + ")", draft,
            m + ":" + nv(instruction) + ":" + nv(text), inContext));
        // The deterministic draft is always available (the fallback); AI enriches it when on.
        String result = out.fallback() || out.text() == null || out.text().isBlank() ? draft : out.text();
        return new ComposeResult(m, result, AiAssistService.AiMeta.of(out));
    }

    /**
     * KR-074: Check writing for issues. Returns a list of issues found in the article text.
     */
    public List<WritingIssue> checkWriting(String workspaceId, String userId, String articleText) {
        return checkWritingDeterministic(nv(articleText));
    }

    /**
     * KR-075: Suggest tags for an article based on its content.
     */
    public List<String> suggestTags(String workspaceId, String userId, String articleContent,
                                    List<String> workspaceTagNames) {
        return suggestTagsDeterministic(nv(articleContent), workspaceTagNames);
    }

    static String normalizeMode(String mode) {
        String m = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        return MODES.contains(m) ? m : "improve";
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure deterministic transforms — unit-testable, double as the documented fallback
    // ══════════════════════════════════════════════════════════════════════════════

    /** Dispatch a compose mode to its deterministic transform. */
    public static String transform(String mode, String text, String instruction) {
        String t = nv(text).trim();
        String m = normalizeMode(mode);
        return switch (m) {
            case "write"     -> write(instruction);
            case "expand"    -> expand(t, instruction);
            case "summarize" -> summarize(t);
            case "shorten"   -> shorten(t);
            case "outline"   -> outlineDeterministic(t, instruction);
            case "simplify"  -> simplifyDeterministic(t, instruction);
            default          -> improve(t);
        };
    }

    /** Split prose into sentences on ., ! or ? boundaries (keeps it simple and dependency-free). */
    public static List<String> sentences(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) {
            return out;
        }
        for (String raw : text.split("(?<=[.!?])\\s+")) {
            String s = raw.trim();
            if (!s.isEmpty()) {
                out.add(s);
            }
        }
        return out;
    }

    /** Extractive summary: the lead sentence, plus up to two more distinct sentences as bullets. */
    public static String summarize(String text) {
        List<String> all = sentences(text);
        if (all.isEmpty()) {
            return "Nothing to summarize yet.";
        }
        StringBuilder sb = new StringBuilder(all.get(0));
        List<String> rest = new ArrayList<>();
        for (int i = 1; i < all.size() && rest.size() < 2; i++) {
            if (!all.get(i).equalsIgnoreCase(all.get(0))) {
                rest.add(all.get(i));
            }
        }
        for (String s : rest) {
            sb.append("\n- ").append(s);
        }
        return sb.toString();
    }

    /** Light, honest cleanup: collapse whitespace, capitalize the first letter, end with a period. */
    public static String improve(String text) {
        String t = nv(text).replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) {
            return "";
        }
        t = Character.toUpperCase(t.charAt(0)) + t.substring(1);
        char last = t.charAt(t.length() - 1);
        if (last != '.' && last != '!' && last != '?') {
            t = t + ".";
        }
        return t;
    }

    /** Keep the lead sentence only — the deterministic "make it shorter". */
    public static String shorten(String text) {
        List<String> all = sentences(text);
        return all.isEmpty() ? "" : improve(all.get(0));
    }

    /** Append a scaffolded continuation prompting the author to add detail (deterministic expand). */
    public static String expand(String text, String instruction) {
        String base = improve(text);
        String topic = keyPhrase(text, instruction);
        String tail = "the context, the steps involved, and the expected outcome.";
        String addition = "In more detail: "
            + (topic.isEmpty() ? "describe " + tail : "expand on " + topic + " — " + tail);
        return base.isEmpty() ? addition : base + "\n\n" + addition;
    }

    /** Scaffold a fresh paragraph from a write instruction (the documented generation fallback). */
    public static String write(String instruction) {
        String topic = nv(instruction).trim();
        if (topic.isEmpty()) {
            return "Start with the key point, then add the supporting detail.";
        }
        String capped = Character.toUpperCase(topic.charAt(0)) + topic.substring(1);
        return capped + ".\n\nAdd the context, the key steps, and what \"done\" looks like.";
    }

    // ── KR-073: Outline generator ─────────────────────────────────────────────

    /**
     * KR-073: Generate a document outline for the given topic and template type.
     *
     * @param topic        the user's topic (text field in the modal)
     * @param templateType template key: KB, RUNBOOK, ADR, POSTMORTEM, or any other value
     * @return markdown outline with h1/h2 headings
     */
    public static String outlineDeterministic(String topic, String templateType) {
        String t = nv(topic).trim();
        String label = t.isEmpty() ? "{topic}" : t;
        String type = nv(templateType).trim().toUpperCase(Locale.ROOT);

        return switch (type) {
            case "KB" -> "# Overview\n\n## Background\n\n## Details\n\n## References";
            case "RUNBOOK" -> "# Runbook: " + label
                + "\n\n## Prerequisites\n\n## Steps\n\n## Verification\n\n## Rollback";
            case "ADR" -> "# ADR: " + label
                + "\n\n## Status\n\n## Context\n\n## Decision\n\n## Consequences";
            case "POSTMORTEM" -> "# Postmortem: " + label
                + "\n\n## Timeline\n\n## Root Cause\n\n## Impact\n\n## Action Items";
            default -> "# " + label
                + "\n\n## Section 1\n\n## Section 2\n\n## Conclusion";
        };
    }

    // ── KR-074: Grammar & style check ────────────────────────────────────────

    /**
     * KR-074: Check article text for writing issues (deterministic heuristics).
     * Checks: long sentences (&gt;40 words), common word-choice issues, double spaces.
     */
    public static List<WritingIssue> checkWritingDeterministic(String articleText) {
        List<WritingIssue> issues = new ArrayList<>();
        if (articleText == null || articleText.isBlank()) {
            return issues;
        }

        // Check for double spaces
        if (articleText.contains("  ")) {
            issues.add(new WritingIssue("  ", "Use a single space between words.", "info"));
        }

        // Check sentences for excessive length
        List<String> sentList = sentences(articleText);
        for (String sentence : sentList) {
            String[] words = sentence.split("\\s+");
            if (words.length > 40) {
                String excerpt = words.length > 8
                    ? String.join(" ", Arrays.copyOfRange(words, 0, 8)) + "…"
                    : sentence;
                issues.add(new WritingIssue(excerpt,
                    "Consider breaking this long sentence (" + words.length + " words) into shorter ones.",
                    "warning"));
            }
        }

        // Word-choice heuristics on the full text (lowercased for matching)
        String lower = articleText.toLowerCase(Locale.ROOT);

        // "its a" or "its an" — missing apostrophe in "it's"
        if (lower.contains("its a ") || lower.contains("its an ")) {
            String match = lower.contains("its a ") ? "its a" : "its an";
            issues.add(new WritingIssue(match, "Did you mean \"it's\" (it is)?", "warning"));
        }

        // "utilize" → "use"
        if (lower.contains("utilize")) {
            issues.add(new WritingIssue("utilize", "Prefer \"use\" over \"utilize\".", "info"));
        }

        // "in order to" → "to"
        if (lower.contains("in order to")) {
            issues.add(new WritingIssue("in order to", "Simplify to just \"to\".", "info"));
        }

        return issues;
    }

    // ── KR-075: Auto-tagging ─────────────────────────────────────────────────

    /** Common English stop words excluded from TF keyword extraction. */
    private static final Set<String> STOP_WORDS = Set.of(
        "a", "an", "the", "is", "in", "of", "to", "and", "for", "it", "this", "that",
        "are", "was", "with", "be", "as", "at", "by", "we", "on", "or", "but", "not",
        "from", "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "its", "our", "your", "their", "they", "you",
        "all", "any", "each", "such", "when", "then", "than", "so", "if", "up", "out",
        "into", "about", "after", "before", "more", "also", "only", "been", "over"
    );

    /**
     * KR-075: Suggest tags using simple word-frequency analysis (TF approach).
     * Returns the top-5 non-stop words that appear more than twice, lowercased.
     *
     * @param articleContent   the article's plain text
     * @param existingTagNames existing workspace tag names (reserved for AI enrichment)
     * @return up to 5 suggested tag names
     */
    public static List<String> suggestTagsDeterministic(String articleContent,
                                                         List<String> existingTagNames) {
        if (articleContent == null || articleContent.isBlank()) {
            return List.of();
        }

        Map<String, Integer> freq = new HashMap<>();
        String[] tokens = articleContent
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9 ]", " ")
            .trim()
            .split("\\s+");
        for (String token : tokens) {
            if (token.length() > 2 && !STOP_WORDS.contains(token)) {
                freq.merge(token, 1, Integer::sum);
            }
        }

        return freq.entrySet().stream()
            .filter(e -> e.getValue() > 2)
            .sorted((a, b) -> b.getValue() - a.getValue())
            .limit(5)
            .map(Map.Entry::getKey)
            .toList();
    }

    // ── KR-076: Simplify selection ────────────────────────────────────────────

    /**
     * KR-076: Simplify text for the target reading grade level.
     * Splits long sentences at conjunctions and replaces verbose phrases with simpler ones.
     *
     * @param text        the selected text to simplify
     * @param targetGrade target reading grade (e.g. "6", "8", "12") — informational for now
     * @return simplified text
     */
    public static String simplifyDeterministic(String text, String targetGrade) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }

        // Phase 1: replace verbose phrases with simpler alternatives
        String simplified = text
            .replace("in order to", "to")
            .replace("In order to", "To")
            .replace("due to the fact that", "because")
            .replace("Due to the fact that", "Because")
            .replace("utilize", "use")
            .replace("Utilize", "Use")
            .replace("implement", "build")
            .replace("Implement", "Build")
            .replace("facilitate", "help")
            .replace("Facilitate", "Help");

        // Phase 2: split long sentences at conjunctions
        List<String> inputSentences = sentences(simplified);
        List<String> outputSentences = new ArrayList<>();
        for (String sentence : inputSentences) {
            String[] words = sentence.split("\\s+");
            if (words.length > 30) {
                String split = sentence
                    .replaceAll("(?i)\\s+and\\s+", ". And ")
                    .replaceAll("(?i)\\s+but\\s+", ". But ")
                    .replaceAll("(?i)\\s+or\\s+", ". Or ")
                    .replaceAll("(?i)\\s+which\\s+", ". Which ");
                outputSentences.add(split);
            } else {
                outputSentences.add(sentence);
            }
        }

        return String.join(" ", outputSentences);
    }

    /** First few significant words of the instruction (preferred) or the text — for the expand prompt. */
    static String keyPhrase(String text, String instruction) {
        String source = nv(instruction).isBlank() ? nv(text) : nv(instruction);
        String[] words = source.replaceAll("[^A-Za-z0-9 ]", " ").trim().split("\\s+");
        return Arrays.stream(words).filter(w -> w.length() > 2).limit(4)
            .reduce((a, b) -> a + " " + b).orElse("").trim();
    }

    private static String nv(String s) {
        return s == null ? "" : s;
    }
}
