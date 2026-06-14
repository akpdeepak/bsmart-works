package com.bcits.works;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.Locale;
import java.util.Set;

/**
 * Builds a validated {@link PageRequest} from the standard list-endpoint params
 * (RB-10 §4: offset-based, consistent {@code page} / {@code size} / {@code sort}, capped).
 *
 * <p>Mirrors the cap convention already used by {@code SecurityAuditLogService.search}:
 * page floored at 0, size clamped to [1, {@value #MAX_SIZE}] with default {@value #DEFAULT_SIZE}.
 * {@code sort} is {@code "field,dir"} and the field is checked against a per-endpoint allow-list
 * (filtering discipline — never sort by an arbitrary client-supplied column); an unknown field is a
 * {@code 400 INVALID_SORT} rather than a silent fallback, so callers can't quietly mis-sort.
 */
final class ListPaging {

    static final int DEFAULT_SIZE = 50;
    static final int MAX_SIZE = 200;

    private ListPaging() {
    }

    static PageRequest of(int page, int size, String sort, Set<String> allowedSortFields) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        return PageRequest.of(safePage, safeSize, parseSort(sort, allowedSortFields));
    }

    private static Sort parseSort(String sort, Set<String> allowedSortFields) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "updatedAt");
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim();
        if (!allowedSortFields.contains(field)) {
            throw ApiException.badRequest("INVALID_SORT",
                "Cannot sort by '" + field + "'. Allowed: " + allowedSortFields + ".", "sort");
        }
        Sort.Direction dir = parts.length > 1 && "asc".equals(parts[1].trim().toLowerCase(Locale.ROOT))
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;
        return Sort.by(dir, field);
    }
}
