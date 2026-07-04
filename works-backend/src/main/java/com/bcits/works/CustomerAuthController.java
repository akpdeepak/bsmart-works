package com.bcits.works;

import com.bcits.works.auth.JwtUtil;
import com.bcits.works.auth.TokenRevocationService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.TenantScope;

import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RateLimiter;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * External customer-portal authentication (iteration 9, Cap N) — a SEPARATE login flow from the
 * internal {@code /auth} endpoints, issuing customer-scoped tokens. {@code /login} is public; all
 * other portal endpoints require the customer token resolved by {@link CustomerContext}. Login is
 * rate-limited and fail-closed (RB-10 §8) and never reveals whether an email is registered.
 */
@RestController
@RequestMapping("/api/v1/portal/auth")
public class CustomerAuthController {

    private static final int LOGIN_MAX = 10;
    private static final long LOGIN_WINDOW_S = 60;

    private final CustomerUserRepository customerUsers;
    private final CustomerAccountRepository accounts;
    private final JwtUtil jwtUtil;
    private final EventService eventService;
    private final RateLimiter rateLimiter;
    private final CustomerContext customerContext;
    private final CustomerUserPiiService customerUserPii;
    private final TokenRevocationService tokenRevocation;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public CustomerAuthController(CustomerUserRepository customerUsers, CustomerAccountRepository accounts,
                                 JwtUtil jwtUtil, EventService eventService, RateLimiter rateLimiter,
                                 CustomerContext customerContext, CustomerUserPiiService customerUserPii,
                                 TokenRevocationService tokenRevocation) {
        this.customerUsers = customerUsers;
        this.accounts = accounts;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.rateLimiter = rateLimiter;
        this.customerContext = customerContext;
        this.customerUserPii = customerUserPii;
        this.tokenRevocation = tokenRevocation;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest http) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): customer-portal login is a
        // SEPARATE identity system (public, no internal workspace bound). It authenticates a
        // CustomerUser by email and derives the workspace from the customer's account claim, not from
        // an internal member binding. The internal central tenant filter must be off so these
        // customer-scoped reads (customer_users / customer_accounts, both tenant-scoped) are never
        // narrowed by a stale internal binding.
        return TenantScope.callAsSystem(() -> {
            String email = body.getOrDefault("email", "").toLowerCase().trim();
            String password = body.getOrDefault("password", "");
            if (!rateLimiter.allow(String.format("portal-login:%s:%s", email, clientIp(http)), LOGIN_MAX, LOGIN_WINDOW_S)) {
                throw ApiException.tooManyRequests("Too many attempts. Please wait a moment and try again.");
            }
            // Resolve the portal user by the blind index when login-via-blind-index is on, else by the
            // legacy email column (default off until customer_users.email_hmac is backfilled) (RB-40 §3).
            CustomerUser user = customerUserPii.resolveByEmail(email)
                    .filter(u -> Boolean.TRUE.equals(u.getActive()))
                    .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                    .orElseThrow(() -> ApiException.unauthorized("Invalid email or password."));

            CustomerAccount account = accounts.findById(user.getCustomerAccountId())
                    .filter(a -> Boolean.TRUE.equals(a.getActive()))
                    .orElseThrow(() -> ApiException.forbidden("Your account is not active. Contact support."));

            String token = jwtUtil.generateCustomer(user.getId(), user.getEmail(),
                    account.getId(), account.getWorkspaceId());
            eventService.record(user.getId(), "CUSTOMER_LOGGED_IN", user.getId(),
                    Map.of("accountId", account.getId()));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("token", token);
            out.put("customer", customerToMap(user));
            out.put("account", brandingToMap(account));
            return ResponseEntity.ok(out);
        });
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest http) {
        // Individual-token revocation parity (PR2): blocklist this portal session's token by jti so it
        // cannot be reused after logout. Best-effort + idempotent; always returns OK.
        String header = http.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                tokenRevocation.blocklist(jwtUtil.extractJti(token), jwtUtil.extractUserId(token),
                        "customer", jwtUtil.extractExpiration(token));
            } catch (Exception ignored) {
                // unusable token → nothing to revoke
            }
        }
        return ResponseEntity.ok(Map.of("message", "Logged out."));
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): the portal /me reads the
        // CustomerUser + CustomerAccount resolved from the signed CUSTOMER claim, not from an internal
        // workspace binding. The internal central filter never binds for a portal token; run unscoped
        // so these customer-scoped reads aren't mis-narrowed by a stale internal binding.
        return TenantScope.callAsSystem(() -> {
            CustomerContext.CustomerPrincipal principal = customerContext.current();
            CustomerUser user = customerUsers.findById(principal.customerUserId())
                    .orElseThrow(() -> ApiException.unauthorized("Invalid or expired customer session."));
            CustomerAccount account = accounts.findById(user.getCustomerAccountId())
                    .orElseThrow(() -> ApiException.notFound("Customer account", user.getCustomerAccountId()));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("customer", customerToMap(user));
            out.put("account", brandingToMap(account));
            return out;
        });
    }

    private Map<String, Object> customerToMap(CustomerUser u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        // Resolve identity PII from the vault when reads are switched on (RB-40 §3); legacy column otherwise.
        m.put("email", customerUserPii.displayEmail(u));
        m.put("displayName", customerUserPii.displayName(u));
        m.put("accountId", u.getCustomerAccountId());
        m.put("isAccountAdmin", u.getIsAccountAdmin());
        return m;
    }

    private Map<String, Object> brandingToMap(CustomerAccount a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("name", a.getName());
        m.put("tier", a.getTier());
        m.put("primaryColor", a.getPrimaryColor());
        m.put("logoUrl", a.getLogoUrl());
        m.put("subdomain", a.getSubdomain());
        return m;
    }

    private String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}
