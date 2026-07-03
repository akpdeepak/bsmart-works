package com.bcits.works;

import com.bcits.works.shared.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Resolves the external customer principal for {@code /api/v1/portal/**} endpoints from the bearer
 * token, asserting it is a customer-scoped token (iteration 9). This keeps the two identity systems
 * cleanly separated: an internal token cannot drive the portal, and a customer token — whose subject
 * is not a workspace member — cannot drive internal endpoints (RBAC denies it). Account and workspace
 * come from signed claims, so a customer can only ever act within their own account (RB-40 §1).
 */
@Component
public class CustomerContext {

    private final JwtUtil jwtUtil;
    private final HttpServletRequest request;
    private final TokenRevocationService tokenRevocation;

    public CustomerContext(JwtUtil jwtUtil, HttpServletRequest request,
                           TokenRevocationService tokenRevocation) {
        this.jwtUtil = jwtUtil;
        this.request = request;
        this.tokenRevocation = tokenRevocation;
    }

    public record CustomerPrincipal(String customerUserId, String accountId, String workspaceId, String email) { }

    /** The current customer principal, or a 401/403 if the request is not a valid customer token. */
    public CustomerPrincipal current() {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw ApiException.unauthorized("Customer authentication required.");
        }
        String token = header.substring(7);
        try {
            if (!jwtUtil.isCustomerToken(token)) {
                throw ApiException.forbidden("This endpoint is for customer-portal users only.");
            }
            String customerUserId = jwtUtil.extractUserId(token);
            // Token-version revocation parity (W1 rate-limit/JWT PR1): a portal token issued before the
            // customer user's cutoff (bumped on a portal password change) is rejected, so a changed
            // credential cannot keep portal access for up to 7 days. SecurityConfig's filter only
            // revokes internal-scoped tokens; this is the customer-scoped enforcement point.
            if (tokenRevocation.isCustomerTokenRevoked(customerUserId, jwtUtil.extractIssuedAt(token))) {
                throw ApiException.unauthorized("Your session has expired. Please sign in again.");
            }
            // Individual-token revocation parity (PR2): a portal logout blocklists this token's jti.
            if (tokenRevocation.isBlocklisted(jwtUtil.extractJti(token))) {
                throw ApiException.unauthorized("Your session has expired. Please sign in again.");
            }
            return new CustomerPrincipal(
                    customerUserId,
                    jwtUtil.extractClaim(token, "accountId"),
                    jwtUtil.extractClaim(token, "workspaceId"),
                    jwtUtil.extractClaim(token, "email"));
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.unauthorized("Invalid or expired customer session.");
        }
    }
}
