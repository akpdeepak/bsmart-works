package com.bcits.works;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

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
 */
@Service
public class KnowledgeAiService {

    /** The AI capability id this surface bills against (RB-40 §2). Generation is the natural fit. */
    public static final String CAPABILITY = AiCapabilities.GENERATION;

    /** Supported compose modes. Anything else is rejected at the boundary. */
    public static final List<String> MODES = List.of(
        "write", "improve", "expand", "summarize", "shorten", "meeting_notes");

    private final AiControlPlaneService controlPlane;

    public KnowledgeAiService(AiControlPlaneService controlPlane) {
        this.controlPlane = controlPlane;
    }

    /** The composed text plus the control-plane verdict, so the editor can show whether AI ran. */
    public record ComposeResult(String mode, String text, AiAssistService.AiMeta meta) { }

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
            case "write" -> write(instruction);
            case "expand" -> expand(t, instruction);
            case "summarize" -> summarize(t);
            case "shorten" -> shorten(t);
            case "meeting_notes" -> meetingNotesDeterministic(t, instruction);
            default -> improve(t);
        };
    }

    /**
     * Deterministic meeting-notes scaffold from a raw transcript (the mandatory fallback for
     * the AI meeting-notes assistant, RB-40 §2).
     *
     * <ul>
     *   <li>Lines containing {@code @mention} patterns → Attendees section</li>
     *   <li>Lines starting with {@code Action:} or {@code TODO:} (case-insensitive) → Action Items
     *       as unchecked checklist items {@code - [ ] ...}</li>
     *   <li>Other non-blank lines → Key Decisions section</li>
     * </ul>
     *
     * Returns a structured markdown string with Attendees / Key Decisions / Action Items / Next
     * Steps sections — the same shape the AI prompt returns, so the frontend {@code markdownToBlocks}
     * logic applies identically to both paths.
     */
    public static String meetingNotesDeterministic(String rawInput, String instruction) {
        String input = nv(rawInput).trim();
        if (input.isEmpty()) {
            return "# Attendees\n\n# Key Decisions\n\n# Action Items\n\n# Next Steps\n";
        }

        List<String> attendees = new ArrayList<>();
        List<String> actionItems = new ArrayList<>();
        List<String> decisions = new ArrayList<>();

        for (String rawLine : input.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }
            String lower = line.toLowerCase(Locale.ROOT);
            if (lower.startsWith("action:") || lower.startsWith("todo:")) {
                // Strip the prefix and record as an unchecked action item.
                int colon = line.indexOf(':');
                String item = line.substring(colon + 1).trim();
                if (!item.isEmpty()) {
                    actionItems.add(item);
                }
            } else if (line.contains("@")) {
                // Collect @mention tokens as attendees.
                java.util.regex.Pattern mention = java.util.regex.Pattern.compile("@([\\w.-]+)");
                java.util.regex.Matcher m = mention.matcher(line);
                while (m.find()) {
                    String name = m.group(1);
                    if (!attendees.contains(name)) {
                        attendees.add(name);
                    }
                }
            } else {
                decisions.add(line);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("# Attendees\n");
        if (attendees.isEmpty()) {
            sb.append("_No attendees detected._\n");
        } else {
            for (String a : attendees) {
                sb.append("- ").append(a).append('\n');
            }
        }

        sb.append("\n# Key Decisions\n");
        if (decisions.isEmpty()) {
            sb.append("_No key decisions detected._\n");
        } else {
            for (String d : decisions) {
                sb.append("- ").append(d).append('\n');
            }
        }

        sb.append("\n# Action Items\n");
        if (actionItems.isEmpty()) {
            sb.append("_No action items detected._\n");
        } else {
            for (String ai : actionItems) {
                sb.append("- [ ] ").append(ai).append('\n');
            }
        }

        sb.append("\n# Next Steps\n");
        sb.append("_Add next steps here._\n");

        return sb.toString();
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

    /** First few significant words of the instruction (preferred) or the text — for the expand prompt. */
    static String keyPhrase(String text, String instruction) {
        String source = nv(instruction).isBlank() ? nv(text) : nv(instruction);
        String[] words = source.replaceAll("[^A-Za-z0-9 ]", " ").trim().split("\\s+");
        return Arrays.stream(words).filter(w -> w.length() > 2).limit(4)
            .reduce((a, b) -> a + " " + b).orElse("").trim();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  KR-074: writing check — grammar/style issues with deterministic fallback
    // ══════════════════════════════════════════════════════════════════════════════

    /** A single writing issue identified in the article text. */
    public record WritingIssue(int offset, int length, String type, String message, String suggestion) { }

    /**
     * KR-074: check writing quality. Deterministic rules run first (the mandatory fallback);
     * AI enrichment is applied when available (RB-40 §2).
     */
    public List<WritingIssue> checkWriting(String workspaceId, String userId, String text) {
        List<WritingIssue> issues = deterministicWritingIssues(nv(text));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Know writing-check", text,
            "writing-check:" + nv(text).length(), false));
        if (!out.fallback() && out.text() != null && !out.text().isBlank()) {
            // AI returned structured issue text; merge with deterministic results (deduplicate by offset)
            List<WritingIssue> aiIssues = parseAiIssues(out.text());
            for (WritingIssue ai : aiIssues) {
                boolean dup = issues.stream().anyMatch(i -> i.offset() == ai.offset());
                if (!dup) issues.add(ai);
            }
        }
        return issues;
    }

    /** Deterministic writing-issue detector (the documented fallback). */
    static List<WritingIssue> deterministicWritingIssues(String text) {
        List<WritingIssue> issues = new ArrayList<>();
        if (text == null || text.isBlank()) return issues;
        // Double-space
        java.util.regex.Matcher dsm = java.util.regex.Pattern.compile("  +").matcher(text);
        while (dsm.find()) {
            issues.add(new WritingIssue(dsm.start(), dsm.end() - dsm.start(),
                "STYLE", "Extra whitespace", " "));
        }
        // Very long sentence (> 50 words)
        for (String sent : sentences(text)) {
            int words = sent.split("\\s+").length;
            if (words > 50) {
                int idx = text.indexOf(sent);
                issues.add(new WritingIssue(Math.max(0, idx), sent.length(),
                    "READABILITY", "Sentence is very long (" + words + " words); consider splitting", ""));
            }
        }
        return issues;
    }

    /** Parse AI-returned issue text (best-effort; malformed → empty list). */
    private static List<WritingIssue> parseAiIssues(String raw) {
        // AI is expected to return lines like: "OFFSET:n LEN:n TYPE:x MESSAGE:y SUGGESTION:z"
        // Lenient parse: if format is unexpected just return empty.
        List<WritingIssue> out = new ArrayList<>();
        if (raw == null) return out;
        for (String line : raw.split("\\r?\\n")) {
            try {
                java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("OFFSET:(\\d+)\\s+LEN:(\\d+)\\s+TYPE:(\\S+)\\s+MESSAGE:(.+?)(?:\\s+SUGGESTION:(.*))?$")
                    .matcher(line.trim());
                if (m.matches()) {
                    out.add(new WritingIssue(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)),
                        m.group(3), m.group(4).trim(),
                        m.group(5) == null ? "" : m.group(5).trim()));
                }
            } catch (Exception ignored) { /* lenient */ }
        }
        return out;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  KR-075: auto-tag suggestion — keyword extraction with deterministic fallback
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * KR-075: suggest tags for the article. Deterministic keyword extraction runs first;
     * AI enrichment adds context-aware tags when available (RB-40 §2).
     */
    public List<String> suggestTags(String workspaceId, String userId, String text,
                                    List<Object> existingTags) {
        List<String> tags = deterministicTags(nv(text));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Know suggest-tags", text,
            "suggest-tags:" + nv(text).length(), false));
        if (!out.fallback() && out.text() != null && !out.text().isBlank()) {
            for (String aiTag : out.text().split("[,\\n]")) {
                String t = aiTag.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9-]", "");
                if (!t.isEmpty() && !tags.contains(t) && t.length() <= 40) tags.add(t);
            }
        }
        return tags.stream().distinct().limit(10).toList();
    }

    /** Deterministic tag extraction: top frequent non-stopword tokens (the mandatory fallback). */
    static List<String> deterministicTags(String text) {
        if (text == null || text.isBlank()) return new ArrayList<>();
        java.util.Set<String> stopWords = java.util.Set.of(
            "the", "and", "for", "are", "this", "that", "with", "from", "will", "not",
            "have", "has", "was", "can", "all", "but", "you", "your", "its", "our", "use");
        java.util.Map<String, Long> freq = Arrays.stream(
                text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").split("\\s+"))
            .filter(w -> w.length() > 3 && !stopWords.contains(w))
            .collect(java.util.stream.Collectors.groupingBy(w -> w, java.util.stream.Collectors.counting()));
        return freq.entrySet().stream()
            .sorted(java.util.Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(5)
            .map(java.util.Map.Entry::getKey)
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    private static String nv(String s) {
        return s == null ? "" : s;
    }
}
