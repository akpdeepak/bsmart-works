package com.bcits.works;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * KR-066 — Article public share link integration tests.
 *
 * <p>Verifies:
 * <ul>
 *   <li>Happy path: token inserted directly; GET /api/v1/public/articles/{token} returns 200
 *       with article content.</li>
 *   <li>Non-existent token → 404.</li>
 *   <li>Token for a DRAFT article → 404 (no content leakage).</li>
 *   <li>Revoked token (set to null) → 404.</li>
 * </ul>
 */
@Tag("integration")
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ArticlePublicShareIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @LocalServerPort
    int port;

    @Autowired
    JdbcTemplate jdbc;

    private final HttpClient http = HttpClient.newHttpClient();

    private static final String WS_ID    = "PSL-WS-1";
    private static final String USER_ID  = "PSL-USR-1";
    private static final String SPACE_ID = "PSL-KS-1";
    private static final String ART_PUB  = "ART-PSL0001"; // PUBLISHED
    private static final String ART_DFT  = "ART-PSL0002"; // DRAFT

    private String publishedToken;

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        publishedToken = UUID.randomUUID().toString().replace("-", "")
                       + UUID.randomUUID().toString().replace("-", "");

        jdbc.execute("DELETE FROM articles WHERE id IN ('" + ART_PUB + "','" + ART_DFT + "')");
        jdbc.execute("DELETE FROM knowledge_spaces WHERE id = '" + SPACE_ID + "'");
        jdbc.execute("DELETE FROM workspace_members WHERE workspace_id = '" + WS_ID + "'");
        jdbc.execute("DELETE FROM workspaces WHERE id = '" + WS_ID + "'");
        jdbc.execute("DELETE FROM users WHERE id = '" + USER_ID + "'");

        jdbc.update("INSERT INTO users(id,email,full_name,password_hash,created_at) " +
                "VALUES(?,?,?,?,?)",
                USER_ID, "psl@test.io", "PSL User", "x", now);
        jdbc.update("INSERT INTO workspaces(id,name,slug,created_at,updated_at) VALUES(?,?,?,?,?)",
                WS_ID, "PSL WS", "psl-ws", now, now);
        jdbc.update("INSERT INTO workspace_members(workspace_id,user_id,system_role,role_id) VALUES(?,?,?,?)",
                WS_ID, USER_ID, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO knowledge_spaces(id,workspace_id,name,visibility,created_by,created_at,updated_at) " +
                "VALUES(?,?,?,?,?,?,?)", SPACE_ID, WS_ID, "PSL Space", "TEAM", USER_ID, now, now);

        jdbc.update("INSERT INTO articles(id,space_id,title,content,status,content_format," +
                "version_number,helpful_votes,view_count,author_id,created_by,created_at,updated_at," +
                "public_share_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ART_PUB, SPACE_ID, "Public Article", "Hello world", "PUBLISHED", "markdown",
                1, 0, 0, USER_ID, USER_ID, now, now, publishedToken);

        jdbc.update("INSERT INTO articles(id,space_id,title,content,status,content_format," +
                "version_number,helpful_votes,view_count,author_id,created_by,created_at,updated_at," +
                "public_share_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ART_DFT, SPACE_ID, "Draft Article", "draft content", "DRAFT", "markdown",
                1, 0, 0, USER_ID, USER_ID, now, now,
                UUID.randomUUID().toString().replace("-", ""));
    }

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void publishedArticle_returnsContentByToken() throws Exception {
        HttpResponse<String> res = get("/api/v1/public/articles/" + publishedToken);
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("Public Article");
        assertThat(res.body()).contains("Hello world");
        // Must not expose workspace-sensitive fields
        assertThat(res.body()).doesNotContain(WS_ID);
        assertThat(res.body()).doesNotContain(SPACE_ID);
        assertThat(res.body()).doesNotContain(USER_ID);
    }

    @Test
    void unknownToken_returns404() throws Exception {
        HttpResponse<String> res = get("/api/v1/public/articles/nonexistenttoken0000000000");
        assertThat(res.statusCode()).isEqualTo(404);
    }

    @Test
    void draftArticleToken_returns404_noContentLeak() throws Exception {
        // Even though the DRAFT article has a token, the public endpoint must return 404.
        String draftToken = jdbc.queryForObject(
                "SELECT public_share_token FROM articles WHERE id = ?", String.class, ART_DFT);
        assertThat(draftToken).isNotNull();

        HttpResponse<String> res = get("/api/v1/public/articles/" + draftToken);
        assertThat(res.statusCode()).isEqualTo(404);
        assertThat(res.body()).doesNotContain("draft content");
    }

    @Test
    void revokedToken_returns404() throws Exception {
        // Revoke by setting token to null in DB (simulates DELETE /articles/{id}/share)
        jdbc.update("UPDATE articles SET public_share_token = NULL WHERE id = ?", ART_PUB);

        HttpResponse<String> res = get("/api/v1/public/articles/" + publishedToken);
        assertThat(res.statusCode()).isEqualTo(404);
    }
}
