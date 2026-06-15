package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Framing-header behaviour per path (RB-10 Â§8, RB-40 Â§1; iteration 6, Cap J â€” iframe-embeddable
 * dashboards). The two {@link SecurityConfig} filter chains must apply different framing policy:
 * <ul>
 *   <li><b>Public embed API</b> ({@code /api/v1/public/**}): relaxed â€” CSP {@code frame-ancestors}
 *       carries the configurable allow-list (default {@code 'self'}) and {@code X-Frame-Options}
 *       is <em>absent</em> (it can only say DENY/SAMEORIGIN and would contradict the allow-list).</li>
 *   <li><b>Authenticated app</b> (everything else): unchanged â€” {@code frame-ancestors 'none'} +
 *       {@code X-Frame-Options: DENY}. Never framable.</li>
 * </ul>
 * Run against a real servlet container so the actual filter chains execute; headers are emitted
 * regardless of response status, so a 404 (no such token) and a 401 (no auth) suffice â€” no seeding.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublicEmbedFramingIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private static String header(HttpResponse<String> res, String name) {
        return res.headers().firstValue(name).orElse(null);
    }

    @Test
    void publicEmbedPath_isFramableViaFrameAncestors_andOmitsXFrameOptions() throws Exception {
        HttpResponse<String> res = get("/api/v1/public/dashboards/no-such-token");

        String csp = header(res, "Content-Security-Policy");
        assertThat(csp).contains("frame-ancestors 'self'");
        assertThat(csp).doesNotContain("frame-ancestors 'none'");

        Optional<String> xfo = res.headers().firstValue("X-Frame-Options");
        assertThat(xfo).as("public embed path must not send X-Frame-Options").isEmpty();
    }

    @Test
    void authenticatedApp_isNeverFramable() throws Exception {
        // Any app path runs the default chain; unauthenticated â†’ 401/403, but framing headers are
        // still written.
        HttpResponse<String> res = get("/api/v1/work-items");

        assertThat(header(res, "Content-Security-Policy")).contains("frame-ancestors 'none'");
        assertThat(header(res, "X-Frame-Options")).contains("DENY");
    }
}
