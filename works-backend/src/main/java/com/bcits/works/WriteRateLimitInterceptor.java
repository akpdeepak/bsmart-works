package com.bcits.works;

import com.bcits.works.shared.RateLimiter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Set;

/**
 * Per-user rate limiting on write requests (RB-10 §8 — "rate limiting on auth and write endpoints").
 * Auth endpoints already carry their own per-email/IP limit ({@link AuthController}/{@link
 * CustomerAuthController}); this closes the other half by capping mutating HTTP methods
 * (POST/PUT/PATCH/DELETE) per authenticated user, reusing the one {@link RateLimiter} (so it inherits
 * the in-process or distributed backend chosen in PR3).
 *
 * <h2>Scope &amp; safety</h2>
 * <ul>
 *   <li>Only fires for write methods, and only when a user is authenticated (the JWT filter set
 *       {@code authenticatedUserId}). Unauthenticated writes (login/signup) are skipped — they have
 *       their own limiter and no user key.</li>
 *   <li><b>Default-off</b> ({@code app.rate-limit.writes-per-minute=0}) → no behaviour change on merge,
 *       matching the canary-first rollout of the other W1 slices. An operator sets a positive limit
 *       (recommended ~600/min/user — well above interactive use, catching only abuse/runaway clients)
 *       per environment. A bulk/import surface that legitimately needs more is the reason it is a tunable
 *       knob, not a hardcoded cap.</li>
 * </ul>
 */
@Component
public class WriteRateLimitInterceptor implements HandlerInterceptor {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final long WINDOW_SECONDS = 60;

    private final RateLimiter rateLimiter;
    private final int writesPerMinute;

    public WriteRateLimitInterceptor(RateLimiter rateLimiter,
                                     @Value("${app.rate-limit.writes-per-minute:0}") int writesPerMinute) {
        this.rateLimiter = rateLimiter;
        this.writesPerMinute = writesPerMinute;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             @Nullable Object handler) throws IOException {
        if (writesPerMinute <= 0) {
            return true; // disabled
        }
        if (!WRITE_METHODS.contains(request.getMethod())) {
            return true; // reads are not write-limited
        }
        Object userId = request.getAttribute("authenticatedUserId"); // set by SecurityConfig.jwtAuthFilter
        if (userId == null) {
            return true; // unauthenticated write (e.g. login) — its own limiter applies, no user key here
        }
        if (!rateLimiter.allow("write:" + userId, writesPerMinute, WINDOW_SECONDS)) {
            response.setStatus(429); // TOO_MANY_REQUESTS
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"Too many write requests. Please slow down.\"}");
            return false;
        }
        return true;
    }
}
