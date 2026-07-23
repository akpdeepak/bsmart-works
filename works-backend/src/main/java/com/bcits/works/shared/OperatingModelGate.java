package com.bcits.works.shared;

/**
 * Operating-model authorization port (V1.6). Admin/Owner-configurable per-business-user-type policies
 * ({@code operating_model_policies}) can <b>further restrict</b> what a user type may do — they never
 * grant beyond role RBAC. This is a <b>deny-override</b> layer: an explicit {@code is_allowed = false}
 * row removes a capability from that business user type; the absence of a row (or an allow row) leaves
 * role RBAC ({@link RbacGate}) as the sole decision, so a workspace that has configured no policies
 * behaves exactly as before (most-restrictive-wins, RB-40 §2 scope semantics applied to RBAC).
 *
 * <p>Lives in the shared kernel (JDK types only) so any domain module can consult it without a
 * compile dependency on the {@code workspaces} module — the same reason {@link RbacGate} lives here.
 */
public interface OperatingModelGate {

    /**
     * Whether {@code userId} is permitted, under the workspace operating model, to perform
     * {@code actionName} on {@code resourceType}. Returns {@code true} unless an explicit deny row
     * applies to the caller's business user type in {@code workspaceId}.
     */
    boolean isAllowed(String userId, String workspaceId, String resourceType, String actionName);

    /** Throw 403 when {@link #isAllowed} is false; otherwise return normally. */
    void requireAllowed(String userId, String workspaceId, String resourceType, String actionName);
}
