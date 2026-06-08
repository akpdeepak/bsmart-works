package com.bcits.works;

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
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public CustomerAuthController(CustomerUserRepository customerUsers, CustomerAccountRepository accounts,
                                 JwtUtil jwtUtil, EventService eventService, RateLimiter rateLimiter,
                                 CustomerContext customerContext) {
        this.customerUsers = customerUsers;
        this.accounts = accounts;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.rateLimiter = rateLimiter;
        this.customerContext = customerContext;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest http) {
        String email = body.getOrDefault("email", "").toLowerCase().trim();
        String password = body.getOrDefault("password", "");
        if (!rateLimiter.allow("portal-login:" + email + ":" + clientIp(http), LOGIN_MAX, LOGIN_WINDOW_S)) {
            throw ApiException.tooManyRequests("Too many attempts. Please wait a moment and try again.");
        }
        CustomerUser user = customerUsers.findByEmailIgnoreCase(email)
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
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        CustomerContext.CustomerPrincipal principal = customerContext.current();
        CustomerUser user = customerUsers.findById(principal.customerUserId())
                .orElseThrow(() -> ApiException.unauthorized("Invalid or expired customer session."));
        CustomerAccount account = accounts.findById(user.getCustomerAccountId())
                .orElseThrow(() -> ApiException.notFound("Customer account", user.getCustomerAccountId()));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("customer", customerToMap(user));
        out.put("account", brandingToMap(account));
        return out;
    }

    private Map<String, Object> customerToMap(CustomerUser u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("displayName", u.getDisplayName());
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
