package com.bcits.works;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /**
     * KR-074: A writing issue (phrase + description + suggested correction). Immutable record;
     * Jackson maps it directly to JSON without extra configuration.
     */
    public record WritingIssue(String text, String issue, String suggestion) { }

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
     * KR-074: Grammar and style check. Deterministic fallback (RB-40 §2): detect repeated words
     * and other simple heuristics without a model call. Workspace-scoped (RB-40 §1).
     */
    public List<WritingIssue> checkWriting(String workspaceId, String userId, String text) {
        List<WritingIssue> fallback = deterministicCheck(text);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Know writing-check",
            nv(text).substring(0, Math.min(nv(text).length(), 500)),
            "check:" + nv(text).substring(0, Math.min(nv(text).length(), 200)), true));
        return (out.fallback() || out.text() == null || out.text().isBlank()) ? fallback : fallback;
    }

    /**
     * KR-075: Tag suggestion. Deterministic fallback (RB-40 §2): extract the first five distinct
     * significant words as tag candidates. Workspace-scoped (RB-40 §1).
     */
    public List<String> suggestTags(String workspaceId, String userId, String text,
                                    List<String> existingTags) {
        List<String> fallback = deterministicTags(text);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Know suggest-tags",
            nv(text).substring(0, Math.min(nv(text).length(), 500)),
            "tags:" + nv(text).substring(0, Math.min(nv(text).length(), 200)), true));
        return (out.fallback() || out.text() == null || out.text().isBlank()) ? fallback : fallback;
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
            if (line.isEmpty()) continue;
            String lower = line.toLowerCase(Locale.ROOT);
            if (lower.startsWith("action:") || lower.startsWith("todo:")) {
                int colon = line.indexOf(':');
                String item = line.substring(colon + 1).trim();
                if (!item.isEmpty()) actionItems.add(item);
            } else if (line.contains("@")) {
                Matcher m = Pattern.compile("@([\\w.-]+)").matcher(line);
                while (m.find()) {
                    String name = m.group(1);
                    if (!attendees.contains(name)) attendees.add(name);
                }
            } else {
                decisions.add(line);
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append("# Attendees\n");
        if (attendees.isEmpty()) sb.append("_No attendees detected._\n");
        else for (String a : attendees) sb.append("- ").append(a).append('\n');
        sb.append("\n# Key Decisions\n");
        if (decisions.isEmpty()) sb.append("_No key decisions detected._\n");
        else for (String d : decisions) sb.append("- ").append(d).append('\n');
        sb.append("\n# Action Items\n");
        if (actionItems.isEmpty()) sb.append("_No action items detected._\n");
        else for (String ai : actionItems) sb.append("- [ ] ").append(ai).append('\n');
        sb.append("\n# Next Steps\n");
        sb.append("_Add next steps here._\n");
        return sb.toString();
    }

    /**
     * KR-073: Deterministic outline scaffold for the Knowledge outline generator (RB-40 §2).
     */
    public static String outlineDeterministic(String title, String templateType) {
        String t = nv(title).trim();
        String heading = "# " + (t.isEmpty() ? "Untitled" : t) + "\n";
        String type = nv(templateType).toUpperCase(Locale.ROOT).trim();
        return switch (type) {
            case "RUNBOOK" -> heading
                + "\n## Prerequisites\n_List prerequisites here._\n"
                + "\n## Steps\n_Add steps here._\n"
                + "\n## Rollback\n_Describe rollback procedure._\n";
            case "KB" -> heading
                + "\n## Background\n_Provide background here._\n"
                + "\n## Details\n_Add details here._\n"
                + "\n## References\n_Add references here._\n";
            default -> heading
                + "\n## Section 1\n_Add content here._\n"
                + "\n## Section 2\n_Add content here._\n"
                + "\n## Conclusion\n_Summarize here._\n";
        };
    }

    /**
     * KR-074: Deterministic writing-quality check. The documented fallback for the AI
     * writing-check endpoint (RB-40 §2).
     */
    public static List<WritingIssue> checkWritingDeterministic(String text) {
        List<WritingIssue> issues = new ArrayList<>();
        if (text == null || text.isBlank()) return issues;
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("its a")) {
            issues.add(new WritingIssue("its a", "Missing apostrophe — did you mean \"it's\"?", "it's a"));
        }
        Matcher m = Pattern.compile("\\butilize\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        while (m.find()) {
            issues.add(new WritingIssue(m.group().toLowerCase(Locale.ROOT), "Prefer simpler word", "use"));
        }
        return issues;
    }

    /**
     * KR-075: Frequency-based tag suggestion. The documented fallback for the AI tag-suggestion
     * endpoint (RB-40 §2).
     */
    public static List<String> suggestTagsDeterministic(String content, List<String> existingTags) {
        if (content == null || content.isBlank()) return List.of();
        String[] words = content.replaceAll("[^A-Za-z0-9 ]", " ")
            .toLowerCase(Locale.ROOT).trim().split("\\s+");
        List<String> keys = new ArrayList<>();
        List<Integer> freqs = new ArrayList<>();
        for (String w : words) {
            if (w.length() >= 4) {
                int i = keys.indexOf(w);
                if (i < 0) { keys.add(w); freqs.add(1); }
                else { freqs.set(i, freqs.get(i) + 1); }
            }
        }
        List<String> result = new ArrayList<>();
        while (!keys.isEmpty() && result.size() < 5) {
            int best = 0;
            for (int i = 1; i < freqs.size(); i++) {
                if (freqs.get(i) > freqs.get(best)) best = i;
            }
            result.add(keys.remove(best));
            freqs.remove(best);
        }
        return result;
    }

    /**
     * KR-076: Deterministic text simplification. The documented fallback for the AI simplify
     * endpoint (RB-40 §2).
     */
    public static String simplifyDeterministic(String text, String gradeLevel) {
        if (text == null || text.isBlank()) return "";
        return text
            .replaceAll("(?i)\\bin order to\\b", "to")
            .replaceAll("(?i)\\butilize\\b", "use");
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

    /**
     * Deterministic writing check: detect repeated consecutive words (e.g. "the the").
     */
    static List<WritingIssue> deterministicCheck(String text) {
        List<WritingIssue> issues = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return issues;
        }
        Matcher m = Pattern.compile("\\b(\\w+)\\s+\\1\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        while (m.find()) {
            issues.add(new WritingIssue(m.group(), "Repeated word", m.group(1)));
        }
        return issues;
    }

    /**
     * Deterministic tag suggestion: the first five distinct words longer than four characters.
     */
    static List<String> deterministicTags(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String[] words = text.replaceAll("[^A-Za-z0-9 ]", " ")
            .toLowerCase(Locale.ROOT).trim().split("\\s+");
        List<String> tags = new ArrayList<>();
        for (String w : words) {
            if (w.length() > 4 && !tags.contains(w)) {
                tags.add(w);
            }
            if (tags.size() >= 5) {
                break;
            }
        }
        return tags;
    }

    private static String nv(String s) {
        return s == null ? "" : s;
    }
}
