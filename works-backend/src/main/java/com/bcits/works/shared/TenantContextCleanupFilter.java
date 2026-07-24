package com.bcits.works.shared;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Guarantees the {@link TenantContext} {@link ThreadLocal} is cleared at the end of every request,
 * so a workspace binding can never leak onto the next request served by a pooled servlet thread
 * (RB-40 §1). It runs as the outermost filter and only clears on the way out — it deliberately does
 * <b>not</b> bind a workspace, because the workspace is resolved per-request inside the controller
 * (from a validated param or from the data), not from the JWT (a user may belong to several
 * workspaces). Binding is the controller/service's job via {@link CurrentWorkspace}; cleanup is here.
 */
@Component
@Order(Integer.MIN_VALUE)
public class TenantContextCleanupFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
