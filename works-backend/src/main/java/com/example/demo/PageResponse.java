package com.example.demo;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Standard paginated response envelope for all list endpoints (CLAUDE.md §15).
 * Use {@code PageResponse.of(springPage)} from service layer; return from controller as-is.
 *
 * Wire to a Spring {@code Pageable} request via:
 *   GET /api/v1/work-items?page=0&size=25&sort=createdAt,desc
 */
public record PageResponse<T>(
        List<T> items,
        long total,
        int page,
        int size,
        int totalPages
) {
    /** Wrap a Spring Data {@link Page} — preferred form when using JPA {@code Pageable}. */
    public static <T> PageResponse<T> of(Page<T> springPage) {
        return new PageResponse<>(
                springPage.getContent(),
                springPage.getTotalElements(),
                springPage.getNumber(),
                springPage.getSize(),
                springPage.getTotalPages()
        );
    }

    /** Wrap a pre-fetched list when Pageable is not available (e.g. in-memory slice). */
    public static <T> PageResponse<T> of(List<T> items, long total, int page, int size) {
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return new PageResponse<>(items, total, page, size, totalPages);
    }
}
