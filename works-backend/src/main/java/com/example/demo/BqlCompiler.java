package com.example.demo;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Compiles BQL (bSmart Query Language) into a <b>parameterized</b> SQL WHERE fragment.
 *
 * <p>Grammar (unchanged from the original regex translator):
 * <pre>
 *   query     := condition ( (AND|OR) condition )*
 *   condition := field IN ( value (, value)* )
 *              | field operator value
 *   operator  := = | != | &lt;&gt; | &gt;= | &lt;= | &gt; | &lt; | CONTAINS | STARTSWITH
 *   value     := currentUser() | today() | now() | 'quoted' | number | bareword
 * </pre>
 *
 * <p>Every user-supplied value is emitted as a bind parameter ({@code ?}); field names are
 * matched by {@code \w+} and validated to a safe identifier charset before use. Nothing the
 * user types is ever concatenated into SQL as syntax, which closes the injection risk that the
 * former string-building translator carried (WRK-BUG-07 / TD-004).
 */
@Component
public class BqlCompiler {

    /** Compiled output: a SQL fragment with {@code ?} placeholders plus the ordered bind params. */
    public record Compiled(String sql, List<Object> params) { }

    private static final Pattern AND_OR =
        Pattern.compile("\\s+(AND|OR)\\s+", Pattern.CASE_INSENSITIVE);
    private static final Pattern IN_COND =
        Pattern.compile("^(\\w+)\\s+IN\\s+\\((.+)\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern OP_COND =
        Pattern.compile("^(\\w+)\\s*(=|!=|<>|>=|<=|>|<|CONTAINS|STARTSWITH)\\s*(.+)$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("[a-z0-9_]+");

    /**
     * @param query         raw BQL (may be empty)
     * @param currentUserId resolves {@code currentUser()} — itself emitted as a bind param
     * @return parameterized WHERE fragment + ordered params; empty sql for an empty query
     * @throws BqlException on unparseable input or an invalid field
     */
    public Compiled compile(String query, String currentUserId) {
        List<Object> params = new ArrayList<>();
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            return new Compiled("", params);
        }

        List<String> parts = new ArrayList<>();
        List<String> connectors = new ArrayList<>();
        Matcher m = AND_OR.matcher(q);
        int last = 0;
        while (m.find()) {
            parts.add(q.substring(last, m.start()).trim());
            connectors.add(m.group(1).toUpperCase());
            last = m.end();
        }
        parts.add(q.substring(last).trim());

        StringBuilder sql = new StringBuilder();
        for (int i = 0; i < parts.size(); i++) {
            if (i > 0) {
                sql.append(' ').append(connectors.get(i - 1)).append(' ');
            }
            sql.append(condition(parts.get(i).trim(), currentUserId, params));
        }
        return new Compiled(sql.toString(), params);
    }

    private String condition(String cond, String currentUserId, List<Object> params) {
        Matcher in = IN_COND.matcher(cond);
        if (in.matches()) {
            String column = field(in.group(1));
            String[] values = in.group(2).split(",");
            StringBuilder sb = new StringBuilder(column).append(" IN (");
            for (int i = 0; i < values.length; i++) {
                if (i > 0) {
                    sb.append(", ");
                }
                sb.append('?');
                params.add(unquote(values[i].trim()));
            }
            return sb.append(')').toString();
        }

        Matcher op = OP_COND.matcher(cond);
        if (op.matches()) {
            String column = field(op.group(1));
            String operator = op.group(2).toUpperCase();
            String rawValue = op.group(3).trim();
            return switch (operator) {
                case "!=", "<>" -> binary(column, "!=", rawValue, currentUserId, params);
                case ">=" -> binary(column, ">=", rawValue, currentUserId, params);
                case "<=" -> binary(column, "<=", rawValue, currentUserId, params);
                case ">" -> binary(column, ">", rawValue, currentUserId, params);
                case "<" -> binary(column, "<", rawValue, currentUserId, params);
                case "CONTAINS" -> {
                    params.add("%" + unquote(rawValue) + "%");
                    yield column + " ILIKE ?";
                }
                case "STARTSWITH" -> {
                    params.add(unquote(rawValue) + "%");
                    yield column + " ILIKE ?";
                }
                default -> binary(column, "=", rawValue, currentUserId, params);
            };
        }
        throw new BqlException("Cannot parse condition: " + cond);
    }

    /** Emits {@code <column> <op> ?} (value bound as a param); functions become safe SQL literals. */
    private String binary(String column, String op, String rawValue,
                          String currentUserId, List<Object> params) {
        if ("currentUser()".equalsIgnoreCase(rawValue)) {
            params.add(currentUserId);
            return column + " " + op + " ?";
        }
        if ("today()".equalsIgnoreCase(rawValue)) {
            return column + " " + op + " CURRENT_DATE";
        }
        if ("now()".equalsIgnoreCase(rawValue)) {
            return column + " " + op + " NOW()";
        }
        params.add(coerce(unquote(rawValue)));
        return column + " " + op + " ?";
    }

    /**
     * Maps a BQL field name to a real column. Known aliases are mapped explicitly; any other
     * {@code \w+} field passes through after a safe-identifier check, so a query can reference
     * work-item columns directly without ever injecting SQL syntax.
     */
    private String field(String field) {
        return switch (field.toLowerCase()) {
            case "priority" -> "priority";
            case "status" -> "status";
            case "type" -> "type";
            case "assignee" -> "assignee_id";
            case "reporter" -> "created_by";
            case "project" -> "project_id";
            case "duedate", "due_date" -> "due_date";
            case "createdat", "created_at" -> "created_at";
            case "sprint" -> "sprint_id";
            case "storypoints", "points" -> "story_points";
            default -> {
                String column = field.toLowerCase();
                if (!SAFE_IDENTIFIER.matcher(column).matches()) {
                    throw new BqlException("Invalid field: " + field);
                }
                yield column;
            }
        };
    }

    private String unquote(String value) {
        if (value.length() >= 2
            && ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }

    /** Bind numbers as numeric types so range comparisons behave; everything else binds as text. */
    private Object coerce(String value) {
        if (value.matches("-?\\d+")) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                return value;
            }
        }
        if (value.matches("-?\\d+\\.\\d+")) {
            try {
                return Double.parseDouble(value);
            } catch (NumberFormatException ignored) {
                return value;
            }
        }
        return value;
    }
}
