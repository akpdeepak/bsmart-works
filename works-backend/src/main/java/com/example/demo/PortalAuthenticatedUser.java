package com.example.demo;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Resolves the authenticated <b>portal customer</b> for the current request (iteration 9, Cap N).
 * The portal is a SEPARATE identity from internal users: rather than reuse {@link AuthenticatedUser}
 * (whose principal is an internal user id), this re-reads the bearer token and asserts the
 * {@code portal} claim, exposing the customer account id and — critically — the {@code org} the
 * token is bound to. Portal controllers scope every read/write to that organization (RB-40 §1), so a
 * customer of one org can never touch another's data. A token without the portal claim is rejected.
 */
@Component
public class PortalAuthenticatedUser {

    private final JwtUtil jwtUtil;

    public PortalAuthenticatedUser(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /** The portal customer bound to the current request — account id, workspace, and organization. */
    public record Principal(String accountId, String workspaceId, String organizationId, String email) { }

    public Principal current() {
        Claims claims = claims();
        Boolean portal = claims.get("portal", Boolean.class);
        if (portal == null || !portal) {
            throw ApiException.forbidden("This action requires a customer portal session.");
        }
        String accountId = claims.getSubject();
        String workspaceId = claims.get("workspace", String.class);
        String organizationId = claims.get("org", String.class);
        if (accountId == null || workspaceId == null || organizationId == null) {
            throw ApiException.unauthorized("Invalid portal session.");
        }
        return new Principal(accountId, workspaceId, organizationId, claims.get("email", String.class));
    }

    private Claims claims() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            throw ApiException.unauthorized("Authentication required.");
        }
        HttpServletRequest request = attrs.getRequest();
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw ApiException.unauthorized("Authentication required.");
        }
        try {
            return jwtUtil.validate(header.substring(7));
        } catch (Exception e) {
            throw ApiException.unauthorized("Invalid or expired token.");
        }
    }
}
