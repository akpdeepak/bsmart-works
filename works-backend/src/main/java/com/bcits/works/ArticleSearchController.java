package com.bcits.works;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * KR-041: full-text search across articles using PostgreSQL tsvector GIN index.
 * KR-042: excerpts via ts_headline with &lt;mark&gt; highlighting.
 * KR-043: advanced filter params — status, templateType, tag, authorId.
 * Endpoint: GET /api/v1/articles/search?q={query}&amp;spaceId={optional}&amp;status=&amp;templateType=&amp;tag=&amp;authorId=
 */
@RestController
@RequestMapping("/api/v1/articles/search")
public class ArticleSearchController {

    private final NamedParameterJdbcTemplate namedJdbc;
    private final KnowledgeSpaceRepository spaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ArticleSearchController(NamedParameterJdbcTemplate namedJdbc,
                                    KnowledgeSpaceRepository spaceRepository,
                                    AuthenticatedUser authenticatedUser,
                                    RbacService rbac) {
        this.namedJdbc = namedJdbc;
        this.spaceRepository = spaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<ArticleSearchResult> search(
            @RequestParam String q,
            @RequestParam(required = false) String spaceId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String templateType,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String authorId) {

        if (q == null || q.isBlank()) return List.of();

        String userId = authenticatedUser.id();
        int safeLimit = Math.min(Math.max(limit, 1), 50);

        // KR-042: ts_headline produces excerpt with <mark> tags around matching terms.
        // KR-043: optional filters on status, templateType, tag name, and authorId.
        // Workspace-scoped (RB-40 §1): join through knowledge_spaces → workspace_members.
        StringBuilder sql = new StringBuilder("""
            SELECT a.id, a.title, a.space_id, a.status, a.icon, a.template_type, a.author_id,
                   ts_headline('english', coalesce(a.text_content, ''),
                       plainto_tsquery('english', :q),
                       'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=35, MinWords=15') AS excerpt
            FROM articles a
            JOIN knowledge_spaces ks ON ks.id = a.space_id
            WHERE ks.workspace_id IN (
                    SELECT workspace_id FROM workspace_members WHERE user_id = :userId
                )
              AND to_tsvector('english', coalesce(a.text_content, ''))
                    @@ plainto_tsquery('english', :q)
            """);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("q", q)
                .addValue("userId", userId)
                .addValue("limit", safeLimit);

        if (spaceId != null) {
            sql.append(" AND a.space_id = :spaceId");
            params.addValue("spaceId", spaceId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND a.status = :status");
            params.addValue("status", status);
        }
        if (templateType != null && !templateType.isBlank()) {
            sql.append(" AND a.template_type = :templateType");
            params.addValue("templateType", templateType);
        }
        if (authorId != null && !authorId.isBlank()) {
            sql.append(" AND a.author_id = :authorId");
            params.addValue("authorId", authorId);
        }
        if (tag != null && !tag.isBlank()) {
            // Workspace-scoped tag filter: article must have a tag with this name in the workspace.
            sql.append("""
                 AND EXISTS (
                     SELECT 1 FROM article_tag_assignments ata
                     JOIN article_tags at ON at.id = ata.tag_id
                     WHERE ata.article_id = a.id
                       AND at.name = :tagName
                       AND at.workspace_id = ks.workspace_id
                 )
                """);
            params.addValue("tagName", tag);
        }

        sql.append("""
            ORDER BY ts_rank(to_tsvector('english', coalesce(a.text_content, '')),
                             plainto_tsquery('english', :q)) DESC
            LIMIT :limit
            """);

        return namedJdbc.query(sql.toString(), params, (rs, i) -> {
            ArticleSearchResult r = new ArticleSearchResult();
            r.setId(rs.getString("id"));
            r.setTitle(rs.getString("title"));
            r.setSpaceId(rs.getString("space_id"));
            r.setStatus(rs.getString("status"));
            r.setIcon(rs.getString("icon"));
            r.setTemplateType(rs.getString("template_type"));
            r.setAuthorId(rs.getString("author_id"));
            r.setExcerpt(rs.getString("excerpt"));
            return r;
        });
    }
}
