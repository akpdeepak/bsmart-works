package com.bcits.works.shared;

import com.bcits.works.shared.RateLimiter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for per-user write-endpoint rate limiting (RB-10 §8, W1 rate-limit PR4): only write
 * methods by an authenticated user are limited; reads, unauthenticated requests, and the disabled
 * default are pass-through; over-budget yields 429 and short-circuits the handler.
 */
@Tag("unit")
class WriteRateLimitInterceptorTest {

    private final RateLimiter rateLimiter = mock(RateLimiter.class);
    private final HttpServletRequest req = mock(HttpServletRequest.class);
    private final HttpServletResponse resp = mock(HttpServletResponse.class);

    private WriteRateLimitInterceptor interceptor(int perMinute) {
        return new WriteRateLimitInterceptor(rateLimiter, perMinute);
    }

    @Test
    void disabled_isPassThrough() throws Exception {
        when(req.getMethod()).thenReturn("POST");
        assertThat(interceptor(0).preHandle(req, resp, null)).isTrue();
        verifyNoInteractions(rateLimiter);
    }

    @Test
    void readMethod_isNotLimited() throws Exception {
        when(req.getMethod()).thenReturn("GET");
        assertThat(interceptor(600).preHandle(req, resp, null)).isTrue();
        verifyNoInteractions(rateLimiter);
    }

    @Test
    void unauthenticatedWrite_isPassThrough() throws Exception {
        when(req.getMethod()).thenReturn("POST");
        when(req.getAttribute("authenticatedUserId")).thenReturn(null);
        assertThat(interceptor(600).preHandle(req, resp, null)).isTrue();
        verifyNoInteractions(rateLimiter);
    }

    @Test
    void authenticatedWrite_withinBudget_isAllowed() throws Exception {
        when(req.getMethod()).thenReturn("PUT");
        when(req.getAttribute("authenticatedUserId")).thenReturn("u1");
        when(rateLimiter.allow(eq("write:u1"), anyInt(), anyLong())).thenReturn(true);
        assertThat(interceptor(600).preHandle(req, resp, null)).isTrue();
        verify(resp, never()).setStatus(anyInt());
    }

    @Test
    void authenticatedWrite_overBudget_is429AndShortCircuits() throws Exception {
        when(req.getMethod()).thenReturn("DELETE");
        when(req.getAttribute("authenticatedUserId")).thenReturn("u1");
        when(rateLimiter.allow(eq("write:u1"), anyInt(), anyLong())).thenReturn(false);
        when(resp.getWriter()).thenReturn(new PrintWriter(java.io.Writer.nullWriter()));

        assertThat(interceptor(600).preHandle(req, resp, null)).isFalse();
        verify(resp).setStatus(429);
    }
}
