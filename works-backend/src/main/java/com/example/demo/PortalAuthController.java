package com.example.demo;

import com.example.demo.dto.PortalLoginRequest;
import com.example.demo.dto.PortalRegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Customer portal authentication (iteration 9, Cap N) — the EXTERNAL identity flow, kept entirely
 * separate from internal {@link AuthController}. A customer registers/logs in against a specific
 * organization resolved from its portal {@code subdomain}; the workspace is derived from that org,
 * never chosen by the caller (RB-40 §1). Passwords use the same BCrypt scheme as internal auth, and
 * the issued JWT is a portal token ({@link JwtUtil#generatePortal}) carrying the account id, the
 * bound workspace, and the org — the basis every portal endpoint scopes reads to. Stateless. Auth
 * + write endpoints are rate-limited fail-closed (RB-10 §8).
 */
@RestController
@RequestMapping("/api/v1/portal/auth")
public class PortalAuthController {

    private static final int  LOGIN_MAX       = 10;
    private static final long LOGIN_WINDOW_S  = 60;
    private static final int  REGISTER_MAX    = 5;
    private static final long REGISTER_WINDOW_S = 300;

    private final CustomerAccountRepository accounts;
    private final CustomerOrganizationRepository organizations;
    private final JwtUtil jwtUtil;
    private final EventService eventService;
    private final RateLimiter rateLimiter;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public PortalAuthController(CustomerAccountRepository accounts,
                               CustomerOrganizationRepository organizations, JwtUtil jwtUtil,
                               EventService eventService, RateLimiter rateLimiter) {
        this.accounts = accounts;
        this.organizations = organizations;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody PortalRegisterRequest req, HttpServletRequest http) {
        rateLimit("portal-register:" + clientIp(http), REGISTER_MAX, REGISTER_WINDOW_S);
        CustomerOrganization org = resolveOrg(req.subdomain());
        String email = req.email().toLowerCase().trim();

        if (accounts.findByWorkspaceIdAndEmail(org.getWorkspaceId(), email).isPresent()) {
            throw ApiException.conflict("An account with that email already exists for this portal.");
        }

        CustomerAccount account = new CustomerAccount();
        account.setId("CACC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        account.setWorkspaceId(org.getWorkspaceId());
        account.setOrganizationId(org.getId());
        account.setEmail(email);
        account.setFullName(req.fullName().trim());
        account.setPasswordHash(passwordEncoder.encode(req.password()));
        account.setActive(true);
        account.setCreatedAt(OffsetDateTime.now());
        accounts.save(account);

        eventService.record(account.getId(), "CUSTOMER_ACCOUNT_REGISTERED", account.getId(),
                Map.of("organizationId", org.getId(), "workspaceId", org.getWorkspaceId()));

        String token = jwtUtil.generatePortal(account.getId(), email, org.getWorkspaceId(), org.getId());
        return ResponseEntity.ok(session(account, org, token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody PortalLoginRequest req, HttpServletRequest http) {
        CustomerOrganization org = resolveOrg(req.subdomain());
        String email = req.email().toLowerCase().trim();
        rateLimit("portal-login:" + email + ":" + clientIp(http), LOGIN_MAX, LOGIN_WINDOW_S);

        Optional<CustomerAccount> accountOpt = accounts.findByWorkspaceIdAndEmail(org.getWorkspaceId(), email);
        if (accountOpt.isEmpty()) {
            throw ApiException.unauthorized("Invalid email or password.");
        }
        CustomerAccount account = accountOpt.get();
        if (account.getActive() == null || !account.getActive()) {
            throw ApiException.forbidden("This account has been deactivated.");
        }
        if (!passwordEncoder.matches(req.password(), account.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password.");
        }

        eventService.record(account.getId(), "CUSTOMER_ACCOUNT_LOGGED_IN", account.getId(),
                Map.of("organizationId", org.getId()));
        String token = jwtUtil.generatePortal(account.getId(), email, org.getWorkspaceId(), org.getId());
        return ResponseEntity.ok(session(account, org, token));
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private CustomerOrganization resolveOrg(String subdomain) {
        CustomerOrganization org = organizations.findBySubdomain(subdomain.trim().toLowerCase())
                .orElseThrow(() -> ApiException.notFound("Portal", subdomain));
        if (org.getActive() == null || !org.getActive()) {
            throw ApiException.forbidden("This portal is not available.");
        }
        return org;
    }

    private Map<String, Object> session(CustomerAccount account, CustomerOrganization org, String token) {
        Map<String, Object> account_ = new LinkedHashMap<>();
        account_.put("id", account.getId());
        account_.put("email", account.getEmail());
        account_.put("fullName", account.getFullName());
        account_.put("organizationId", org.getId());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("account", account_);
        response.put("organization", Map.of(
                "id", org.getId(),
                "name", org.getName() == null ? "" : org.getName(),
                "tier", org.getTier() == null ? "" : org.getTier()));
        return response;
    }

    private void rateLimit(String key, int max, long windowSeconds) {
        if (!rateLimiter.allow(key, max, windowSeconds)) {
            throw ApiException.tooManyRequests("Too many attempts. Please wait a moment and try again.");
        }
    }

    private String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}
