package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

/**
 * The single field-level-security resolver (RB-40 §1; spec {@code 06 §5.5}, {@code 06 §3 Layer 2}).
 *
 * <p>Field visibility is a per-{@code (field, role-tier)} rule held in {@code field_visibility}
 * (joined to {@code role_def} on {@code tier}) with vocabulary {@code HIDDEN | READ_ONLY | EDITABLE}
 * and most-restrictive-wins ({@code HIDDEN > READ_ONLY > EDITABLE}). The schema is V21
 * ({@code field_visibility}, {@code field_def}, {@code role_def}); both {@code field_visibility} and
 * {@code role_def} are empty in production until an admin authors rules, so enforcement is a no-op on
 * current data (safe rollout).
 *
 * <p>This service is the <b>only</b> place the rules are computed: {@link FieldDefController}
 * delegates here instead of holding its own inline copies, so the dedicated value endpoints and the
 * work-item read/write response paths all share one implementation.
 *
 * <p><b>Tier source.</b> The caller's tier comes from {@link RbacGate#getUserTier} ({@code roles.tier},
 * V7) while the rules key on {@code role_def.tier} (V21). They align on the shared 1–5 scale
 * (VIEWER 1 &lt; MEMBER 2 &lt; LEAD 3 &lt; ADMIN 4 &lt; OWNER 5); the deeper membership-role → {@code role_def}
 * reconciliation is deferred (EPIC P1 §7).
 */
@Service
public class FieldVisibilityService {

    private static final Logger log = LoggerFactory.getLogger(FieldVisibilityService.class);

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;

    public FieldVisibilityService(JdbcTemplate jdbc, RbacGate rbac) {
        this.jdbc = jdbc;
        this.rbac = rbac;
    }

    /**
     * The per-{@code (user, workspace)} field-visibility verdict, computed once.
     *
     * @param hiddenFieldDefIds   field_def ids the caller must NOT see (stripped from read responses)
     * @param readOnlyFieldDefIds field_def ids the caller may see but must NOT write
     */
    public record FieldVisibilitySets(Set<String> hiddenFieldDefIds, Set<String> readOnlyFieldDefIds) {
        /** No rules apply — nothing is hidden or read-only. */
        public static final FieldVisibilitySets EMPTY = new FieldVisibilitySets(Set.of(), Set.of());
    }

    /**
     * PRIMARY ENTRY POINT for read redaction. Returns the HIDDEN and READ_ONLY field_def-id sets for
     * the given user in the given workspace, resolved from {@code field_visibility → role_def} at the
     * user's tier.
     *
     * <p>Workspace-scoped (RB-40 §1): every underlying query is bounded to {@code workspaceId}, so the
     * result can never reference another tenant's field defs.
     *
     * <p>Returns {@link FieldVisibilitySets#EMPTY} when the workspace is unknown ({@code null}) or the
     * user is not a member ({@code tier == 0}) — those items are already bounded by the upstream
     * {@code MEMBER_PROJECTS} workspace scope, so there is nothing extra to redact here (EPIC P1 §3.4).
     */
    public FieldVisibilitySets resolveForUser(String userId, String workspaceId) {
        if (workspaceId == null) {
            return FieldVisibilitySets.EMPTY;
        }
        int tier = rbac.getUserTier(userId, workspaceId);
        if (tier <= 0) {
            // Non-member: unreachable for in-tenant reads (MEMBER_PROJECTS already excludes the item);
            // the bound is the tenant scope, not FLS. Redact nothing extra (EPIC P1 §3.4).
            return FieldVisibilitySets.EMPTY;
        }
        return new FieldVisibilitySets(hiddenFieldIds(workspaceId, tier), readOnlyFieldIds(workspaceId, tier));
    }

    /**
     * Single-field verdict for the write path: the MOST-RESTRICTIVE visibility
     * ({@code HIDDEN > READ_ONLY > EDITABLE}) for one field, for the user's tier, in the workspace.
     * Returns {@code "EDITABLE"} when no rule is configured — the safe default.
     */
    public String resolveFieldVisibility(String fieldDefId, String workspaceId, int tier) {
        try {
            String vis = jdbc.queryForObject(
                "SELECT fv.visibility FROM field_visibility fv "
                + "JOIN role_def rd ON rd.id = fv.role_def_id "
                + "WHERE fv.field_def_id = ? AND rd.workspace_id = ? AND rd.tier = ? "
                + "ORDER BY CASE fv.visibility WHEN 'HIDDEN' THEN 1 WHEN 'READ_ONLY' THEN 2 ELSE 3 END "
                + "LIMIT 1",
                String.class, fieldDefId, workspaceId, tier);
            return vis != null ? vis : "EDITABLE";
        } catch (org.springframework.dao.EmptyResultDataAccessException none) {
            return "EDITABLE"; // no rule for this field/tier — default editable
        } catch (Exception e) {
            // Write path fails CLOSED on a genuine resolution error (EPIC P1 §3.4): the caller treats a
            // non-EDITABLE verdict as a 403, so surfacing the error here denies the write on uncertainty.
            log.warn("Field visibility resolution failed for fieldDef={} ws={} tier={}; failing closed",
                fieldDefId, workspaceId, tier, e);
            throw e;
        }
    }

    /** The set of field_def ids that are HIDDEN for the given tier in the workspace. */
    public Set<String> hiddenFieldIds(String workspaceId, int tier) {
        return fieldIdsWithVisibility(workspaceId, tier, "HIDDEN");
    }

    /**
     * The set of field_def ids that are READ_ONLY for the given tier in the workspace. Symmetric to
     * {@link #hiddenFieldIds} — lets the read path mark READ_ONLY without an N×SQL per-field fan-out.
     */
    public Set<String> readOnlyFieldIds(String workspaceId, int tier) {
        return fieldIdsWithVisibility(workspaceId, tier, "READ_ONLY");
    }

    /** One indexed, workspace-scoped round-trip for a single visibility token. */
    private Set<String> fieldIdsWithVisibility(String workspaceId, int tier, String visibility) {
        try {
            return new HashSet<>(jdbc.queryForList(
                "SELECT fv.field_def_id FROM field_visibility fv "
                + "JOIN role_def rd ON rd.id = fv.role_def_id "
                + "WHERE rd.workspace_id = ? AND rd.tier = ? AND fv.visibility = ?",
                String.class, workspaceId, tier, visibility));
        } catch (Exception e) {
            // Read path degrades to "redact nothing" on a DB error (EPIC P1 §3.4): over-redacting on a
            // transient fault would drop legitimate field values; the upstream workspace scope still
            // bounds which items are visible. Surfaced at WARN so it is never silent.
            log.warn("Field visibility batch query ({}) failed for ws={} tier={}; redacting nothing",
                visibility, workspaceId, tier, e);
            return Set.of();
        }
    }
}
