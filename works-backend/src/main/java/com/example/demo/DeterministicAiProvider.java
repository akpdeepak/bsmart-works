package com.example.demo;

import org.springframework.stereotype.Service;

/**
 * The always-available {@link AiProvider} (iteration 10, Cap O; RB-40 §2). It needs no API key and no
 * external service — it <b>is</b> the deterministic fallback for every AI surface, so the whole
 * control plane is fully functional and testable without a live LLM:
 *
 * <ul>
 *   <li><b>NL → BQL</b> (I10-S12): delegates to {@link NlToBqlParser}, a rule-based phrase mapper.
 *       An unrecognised phrase comes back as low-confidence so the UI offers the manual builder.</li>
 *   <li><b>Summarization</b> (I10-S13): delegates to {@link Summarizer}, an extractive picker.</li>
 * </ul>
 *
 * <p>It reports a {@code DETERMINISTIC} model tier, {@code fallbackUsed = true}, and zero model token
 * cost (the "tokens" it reports are a deterministic char-based proxy for the usage dashboard). A
 * future live provider implements the same {@link AiProvider} seam; the orchestration selects between
 * them.
 */
@Service
public class DeterministicAiProvider implements AiProvider {

    static final String TIER = "DETERMINISTIC";

    private final NlToBqlParser nlToBql;
    private final Summarizer summarizer;

    public DeterministicAiProvider(NlToBqlParser nlToBql, Summarizer summarizer) {
        this.nlToBql = nlToBql;
        this.summarizer = summarizer;
    }

    @Override
    public AiResult complete(AiTask task) {
        String input = task.input() == null ? "" : task.input();
        return switch (task.capability()) {
            case NL_TO_BQL -> {
                NlToBqlParser.Result r = nlToBql.parse(input);
                String text = r.confident() ? r.bql() : "";
                yield result(text, input, r.confident());
            }
            case SUMMARIZATION -> {
                Summarizer.Summary s = summarizer.summarize(input);
                yield result(s.text(), input, true);
            }
        };
    }

    @Override
    public boolean isDeterministic() {
        return true;
    }

    /** A deterministic char-based token proxy (≈4 chars/token) so the usage dashboard has real numbers. */
    private AiResult result(String text, String input, boolean confident) {
        int tokensIn = approxTokens(input);
        int tokensOut = approxTokens(text);
        return new AiResult(text, tokensIn, tokensOut, TIER, confident, true);
    }

    private int approxTokens(String s) {
        return s == null || s.isBlank() ? 0 : (int) Math.ceil(s.length() / 4.0);
    }
}
