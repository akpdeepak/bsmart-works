package com.bcits.works;

import com.bcits.works.shared.PerformanceMonitor;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Times every API request and feeds {@link PerformanceMonitor} (iteration 18, Cap S). Maps the
 * request to a coarse operation key — collapsing ids out of the path so {@code /work-items/WRK-9}
 * and {@code /work-items/WRK-3} aggregate together — and tags a few hot paths with the RB-40 §5
 * budget names so their P95 can be compared to the published budget.
 */
@Component
@Order(20)
public class PerformanceMonitorFilter extends OncePerRequestFilter {

    private final PerformanceMonitor monitor;

    public PerformanceMonitorFilter(PerformanceMonitor monitor) {
        this.monitor = monitor;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long ms = (System.nanoTime() - start) / 1_000_000L;
            monitor.record(operationKey(request), ms);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // Don't measure the streaming endpoint (it stays open) or the observability reads themselves.
        return uri.startsWith("/api/v1/realtime/stream") || uri.startsWith("/api/v1/observability");
    }

    /** A stable, low-cardinality operation key from method + path with ids collapsed to {id}. */
    static String operationKey(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (request.getMethod().equalsIgnoreCase("POST") && uri.endsWith("/work-items")) {
            return "work_item_create";
        }
        if (uri.contains("/command-palette/search") || uri.contains("/bql")) {
            return "search";
        }
        if (uri.contains("/dashboard")) {
            return "dashboard_render";
        }
        if (uri.contains("/attachments") && request.getMethod().equalsIgnoreCase("POST")) {
            return "file_upload";
        }
        String[] parts = uri.split("/");
        StringBuilder key = new StringBuilder(request.getMethod());
        for (String part : parts) {
            if (part.isBlank() || part.equals("api") || part.equals("v1")) {
                continue;
            }
            key.append(' ').append(looksLikeId(part) ? "{id}" : part);
        }
        return key.toString().trim();
    }

    private static boolean looksLikeId(String s) {
        if (s.matches(".*\\d.*") && s.matches("[A-Za-z0-9-]+") && s.length() >= 3
                && (s.contains("-") || s.matches(".*\\d{2,}.*"))) {
            return true;
        }
        return s.length() >= 16 && s.matches("[0-9a-fA-F-]+");
    }
}
