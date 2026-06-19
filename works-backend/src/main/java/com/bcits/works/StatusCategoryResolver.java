package com.bcits.works;

import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/**
 * Shared status-name to board-category resolver.
 *
 * <p>Workflow configuration wins when present; otherwise legacy seed names are categorized by
 * heuristic so reporting, WIP limits, and status-duration metrics stay aligned.
 */
final class StatusCategoryResolver {

    static final String TODO = "TODO";
    static final String IN_PROGRESS = "IN_PROGRESS";
    static final String DONE = "DONE";

    private StatusCategoryResolver() {
    }

    static Function<String, String> from(Map<String, String> nameToCategory) {
        return name -> {
            if (name == null) {
                return TODO;
            }
            String normalized = normalize(name);
            String mapped = nameToCategory.get(normalized);
            if (mapped != null) {
                return mapped;
            }
            if (normalized.contains("progress") || normalized.contains("review")
                    || normalized.contains("test") || normalized.equals("blocked")
                    || normalized.contains("doing")) {
                return IN_PROGRESS;
            }
            if (normalized.equals("done") || normalized.contains("closed")
                    || normalized.contains("resolved") || normalized.contains("complete")
                    || normalized.contains("fixed")) {
                return DONE;
            }
            return TODO;
        };
    }

    static String normalize(String statusName) {
        return statusName.toLowerCase(Locale.ROOT);
    }
}
