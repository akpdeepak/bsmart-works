package com.bcits.works.ai;
import com.bcits.works.AiCapabilities;
import com.bcits.works.ai.api.AiControlPlaneService;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Structured data extraction (iteration-20 Cap I, Advanced Knowledge): pull structured fields —
 * emails, dates, ISO-style identifiers, and {@code key: value} lines — out of free-form article text.
 *
 * <p>Like every AI surface (RB-40 §2) this gathers a deterministic result first (the regex/keyword
 * parse), then routes through {@link AiControlPlaneService#invoke} so scope / budget / cache / audit and
 * the fallback contract are enforced centrally. The deterministic field map is <em>always</em> returned;
 * AI only contributes narrative richness. When AI is off, over budget, or unavailable the same fields are
 * served verbatim — the documented fallback is "regex/keyword extraction of the recognised field types".
 *
 * <p>The parsing helpers are pure {@code static} methods so they are unit-testable without a database or
 * Spring context (RB-10 §7), and they double as the fallback implementation.
 */
@Service
public class StructuredExtractionService {

    /** The AI capability id (RB-40 §2). The integrator registers its Descriptor in AiCapabilities. */
    public static final String CAPABILITY = "structured_extraction";

    private final AiControlPlaneService controlPlane;

    public StructuredExtractionService(AiControlPlaneService controlPlane) {
        this.controlPlane = controlPlane;
    }

    /** The extraction result plus the control-plane verdict, so the UI can show whether AI ran. */
    public record ExtractionResult(Map<String, Object> fields, boolean usedAi, boolean fallback,
                                   String policyState, String tier) { }

    public ExtractionResult extract(String workspaceId, String userId, String text, boolean inContext) {
        Map<String, Object> fields = extractFields(text);
        String draft = renderDraft(fields);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, CAPABILITY, "Extract structured fields", draft, null, inContext));
        // The field map is deterministic and always returned (it is the fallback); AI only adds narrative.
        return new ExtractionResult(fields, out.usedAi(), out.fallback(), out.policyState(),
            out.tier() == null ? "NONE" : out.tier().name());
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure deterministic helpers — unit-testable in isolation, double as the fallback
    // ══════════════════════════════════════════════════════════════════════════════

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
    // ISO-ish date: 2026-06-07 (optionally with a time) — the unambiguous machine date format.
    private static final Pattern DATE = Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2})?)?\\b");
    // ISO-style identifier: uppercase prefix + dash + digits, e.g. WRK-123, ART-9F2A1B7C, INC-42.
    private static final Pattern ID = Pattern.compile("\\b([A-Z][A-Z0-9]*-[A-Z0-9]+)\\b");
    // key: value on its own line — the value runs to end of line.
    private static final Pattern KEY_VALUE = Pattern.compile("(?m)^\\s*([A-Za-z][A-Za-z0-9 _-]{0,40}?)\\s*:\\s*(.+?)\\s*$");

    /**
     * Build the structured field map from free-form text. Keys: {@code emails}, {@code dates},
     * {@code ids} (each a de-duplicated, order-preserving list) and {@code keyValues} (an ordered map of
     * {@code key -> value} lines). Empty categories are omitted, so the map size reflects what was found.
     */
    public static Map<String, Object> extractFields(String text) {
        Map<String, Object> fields = new LinkedHashMap<>();
        String t = text == null ? "" : text;
        List<String> emails = findAll(EMAIL, t, 0);
        List<String> dates = findAll(DATE, t, 0);
        List<String> ids = findAll(ID, t, 1);
        Map<String, String> kv = keyValues(t);
        if (!emails.isEmpty()) {
            fields.put("emails", emails);
        }
        if (!dates.isEmpty()) {
            fields.put("dates", dates);
        }
        if (!ids.isEmpty()) {
            fields.put("ids", ids);
        }
        if (!kv.isEmpty()) {
            fields.put("keyValues", kv);
        }
        return fields;
    }

    /** Parse {@code key: value} lines into an ordered map (first occurrence of a key wins). */
    public static Map<String, String> keyValues(String text) {
        Map<String, String> out = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return out;
        }
        Matcher m = KEY_VALUE.matcher(text);
        while (m.find()) {
            String key = m.group(1).trim();
            String value = m.group(2).trim();
            // Skip lines that are really a date/time (e.g. "12:30") or have an empty value/key.
            if (key.isEmpty() || value.isEmpty() || key.matches("\\d{1,2}")) {
                continue;
            }
            out.putIfAbsent(key, value);
        }
        return out;
    }

    private static List<String> findAll(Pattern pattern, String text, int group) {
        List<String> out = new ArrayList<>();
        Matcher m = pattern.matcher(text);
        while (m.find()) {
            String v = m.group(group);
            if (v != null && !out.contains(v)) {
                out.add(v);
            }
        }
        return out;
    }

    /** A short human summary of what was extracted — the deterministic draft handed to the control plane. */
    static String renderDraft(Map<String, Object> fields) {
        if (fields.isEmpty()) {
            return "No structured fields were found in the text.";
        }
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, Object> e : fields.entrySet()) {
            int n = e.getValue() instanceof java.util.Collection<?> c ? c.size()
                : e.getValue() instanceof Map<?, ?> mp ? mp.size() : 1;
            parts.add(n + " " + e.getKey());
        }
        return "Extracted " + String.join(", ", parts) + ".";
    }
}
