package com.bcits.works.workspaces;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.OperatingModelGate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Enforces the V1.6 operating-model policies as a deny-override on top of role RBAC (see
 * {@link OperatingModelGate}). Reads the caller's {@code business_user_type} for the workspace and
 * checks {@code operating_model_policies} for an explicit deny; both queries are workspace-scoped, so
 * a policy in one workspace can never affect another (RB-40 §1).
 */
@Service
public class OperatingModelPolicyService implements OperatingModelGate {

    private final JdbcTemplate jdbc;

    public OperatingModelPolicyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean isAllowed(String userId, String workspaceId, String resourceType, String actionName) {
        if (workspaceId == null || userId == null) return true;
        String userType;
        try {
            userType = jdbc.queryForObject(
                    "SELECT business_user_type FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
                    String.class, workspaceId, userId);
        } catch (Exception notAMemberOrAmbiguous) {
            // Membership is RBAC's concern; the operating model imposes no additional restriction here.
            return true;
        }
        if (userType == null || userType.isBlank()) return true;
        Integer denies = jdbc.queryForObject(
                "SELECT COUNT(*) FROM operating_model_policies "
              + "WHERE workspace_id = ? AND user_type = ? AND resource_type = ? AND action_name = ? "
              + "AND is_allowed = FALSE",
                Integer.class, workspaceId, userType, resourceType, actionName);
        return denies == null || denies == 0;
    }

    @Override
    public void requireAllowed(String userId, String workspaceId, String resourceType, String actionName) {
        if (!isAllowed(userId, workspaceId, resourceType, actionName)) {
            throw ApiException.forbidden(
                    "The workspace operating model does not permit your user type to perform this action.");
        }
    }
}
