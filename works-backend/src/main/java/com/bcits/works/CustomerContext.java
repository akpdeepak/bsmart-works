package com.bcits.works;

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

    public CustomerContext(JwtUtil jwtUtil, HttpServletRequest request) {
        this.jwtUtil = jwtUtil;
        this.request = request;
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
            return new CustomerPrincipal(
                    jwtUtil.extractUserId(token),
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
