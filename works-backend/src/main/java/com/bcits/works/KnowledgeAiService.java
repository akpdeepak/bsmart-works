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
    public static final List<String> MODES = List.of("write", "improve", "expand", "summarize", "shorten");

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
            default -> improve(t);
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
