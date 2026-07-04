package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * KR-041: full-text search across articles using PostgreSQL tsvector GIN index.
 * KR-042: excerpts via ts_headline with <mark> highlighting.
 * Endpoint: GET /api/v1/articles/search?q={query}&spaceId={optional}
 */
@RestController
@RequestMapping("/api/v1/articles/search")
public class ArticleSearchController {

    private final JdbcTemplate jdbc;
    private final KnowledgeSpaceRepository spaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ArticleSearchController(JdbcTemplate jdbc,
                                    KnowledgeSpaceRepository spaceRepository,
                                    AuthenticatedUser authenticatedUser,
                                    RbacGate rbac) {
        this.jdbc = jdbc;
        this.spaceRepository = spaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<ArticleSearchResult> search(
            @RequestParam String q,
            @RequestParam(required = false) String spaceId,
            @RequestParam(defaultValue = "20") int limit) {

        if (q == null || q.isBlank()) return List.of();

        String userId = authenticatedUser.id();
        int safeLimit = Math.min(Math.max(limit, 1), 50);

        // KR-042: ts_headline produces excerpt with <mark> tags around matching terms.
        // Workspace-scoped (RB-40 §1): join through knowledge_spaces → workspace_members.
        String sql = """
            SELECT a.id, a.title, a.space_id, a.status, a.icon, a.template_type,
                   ts_headline('english', coalesce(a.text_content, ''),
                       plainto_tsquery('english', ?),
                       'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=35, MinWords=15') AS excerpt
            FROM articles a
            JOIN knowledge_spaces ks ON ks.id = a.space_id
            WHERE ks.workspace_id IN (
                    SELECT workspace_id FROM workspace_members WHERE user_id = ?
                )
              AND to_tsvector('english', coalesce(a.text_content, ''))
                    @@ plainto_tsquery('english', ?)
            """ + (spaceId != null ? "  AND a.space_id = ?" : "") + """
            ORDER BY ts_rank(to_tsvector('english', coalesce(a.text_content, '')),
                             plainto_tsquery('english', ?)) DESC
            LIMIT ?
            """;

        Object[] params = spaceId != null
            ? new Object[]{ q, userId, q, spaceId, q, safeLimit }
            : new Object[]{ q, userId, q, q, safeLimit };

        return jdbc.query(sql, params, (rs, i) -> {
            ArticleSearchResult r = new ArticleSearchResult();
            r.setId(rs.getString("id"));
            r.setTitle(rs.getString("title"));
            r.setSpaceId(rs.getString("space_id"));
            r.setStatus(rs.getString("status"));
            r.setIcon(rs.getString("icon"));
            r.setTemplateType(rs.getString("template_type"));
            r.setExcerpt(rs.getString("excerpt"));
            return r;
        });
    }
}
