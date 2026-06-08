package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Live {@link AiProvider} backed by the Anthropic Messages API (RB-40 §2: server-side only,
 * PII redacted before this point by the control plane). Active only when
 * {@code ANTHROPIC_API_KEY} is set; when absent, the context falls back to
 * {@link DeterministicAiProvider} automatically (Spring picks it by absence of this bean).
 *
 * <p>Model mapping (TD-016 decision 2026-06-08):
 * <ul>
 *   <li>{@link AiModelTier#HAIKU} → {@code claude-haiku-4-5}
 *   <li>{@link AiModelTier#SONNET} → {@code claude-sonnet-4-6}
 * </ul>
 *
 * <p>Tokens in/out come from the API response and feed the control plane budget meter and audit
 * log exactly as the deterministic provider does.
 */
@Component
@Primary
@ConditionalOnProperty(name = "ai.anthropic.api-key")
public class AnthropicAiProvider implements AiProvider {

    static final String HAIKU_MODEL = "claude-haiku-4-5";
    static final String SONNET_MODEL = "claude-sonnet-4-6";

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String API_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 2048;
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    public AnthropicAiProvider(@Value("${ai.anthropic.api-key}") String apiKey, ObjectMapper mapper) {
        this.apiKey = apiKey;
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    @Override
    public String name() {
        return "anthropic";
    }

    @Override
    public AiResult complete(AiRequest request) {
        String model = request.tier() == AiModelTier.SONNET ? SONNET_MODEL : HAIKU_MODEL;
        String userContent = buildUserContent(request);

        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", MAX_TOKENS,
                "messages", List.of(Map.of("role", "user", "content", userContent))
            );

            String json = mapper.writeValueAsString(body);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", API_VERSION)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest,
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return fallbackResult(request, "API error " + response.statusCode());
            }

            return parseResponse(response.body(), request.tier());

        } catch (Exception e) {
            return fallbackResult(request, e.getMessage());
        }
    }

    // ── internals ─────────────────────────────────────────────────────────────

    private String buildUserContent(AiRequest request) {
        if (request.draft() != null && !request.draft().isBlank()) {
            return request.prompt() + "\n\nDraft (refine if helpful):\n" + request.draft();
        }
        return request.prompt();
    }

    @SuppressWarnings("unchecked")
    private AiResult parseResponse(String body, AiModelTier requestedTier) throws Exception {
        Map<String, Object> root = mapper.readValue(body, Map.class);

        List<Map<String, Object>> content = (List<Map<String, Object>>) root.get("content");
        String text = content != null && !content.isEmpty()
            ? (String) content.get(0).get("text")
            : "";

        Map<String, Object> usage = (Map<String, Object>) root.get("usage");
        int tokensIn = usage != null ? toInt(usage.get("input_tokens")) : 0;
        int tokensOut = usage != null ? toInt(usage.get("output_tokens")) : 0;

        return new AiResult(text, requestedTier, tokensIn, tokensOut);
    }

    private AiResult fallbackResult(AiRequest request, String reason) {
        String draft = request.draft() != null ? request.draft() : "";
        int tokensIn = DeterministicAiProvider.estimateTokens(request.prompt());
        int tokensOut = DeterministicAiProvider.estimateTokens(draft);
        return new AiResult(draft, request.tier(), tokensIn, tokensOut);
    }

    private static int toInt(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        return 0;
    }
}
