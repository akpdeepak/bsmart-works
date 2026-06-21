package com.bcits.works;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end proof that field-level security (RB-40 §1; spec {@code 06 §5.5}, {@code 06 §3 Layer 2};
 * EPIC P1 §8) is <b>enforced server-side</b>, not merely hidden in the UI — against real Postgres
 * (Testcontainers, RB-10 §7). It drives the actual production beans that assemble field-value
 * responses ({@link WorkItemReadService}, {@link FieldDefController}) so the {@link
 * FieldVisibilityService} verdict is exercised on the genuine read/write code paths, not a mock.
 *
 * <p>The model is a per-{@code (field, role-tier)} rule in {@code field_visibility} (joined to
 * {@code role_def} on {@code tier}) with vocabulary {@code HIDDEN | READ_ONLY | EDITABLE} and
 * most-restrictive-wins. The caller's tier comes from {@code roles.tier} via
 * {@link RbacService#getUserTier} (V7), matched against {@code role_def.tier} (V21) on the shared
 * 1–5 scale (VIEWER 1 &lt; MEMBER 2 &lt; LEAD 3 &lt; ADMIN 4 &lt; OWNER 5).
 *
 * <h2>Fixture</h2>
 * One workspace {@code WS} with a project + work item carrying three custom fields:
 * <ul>
 *   <li><b>Salary</b> — {@code HIDDEN} for the VIEWER (tier 1) {@code role_def};</li>
 *   <li><b>Notes</b> — {@code READ_ONLY} for the VIEWER {@code role_def};</li>
 *   <li><b>Title-extra</b> — <b>no</b> {@code field_visibility} rule (the conservative / no-over-redaction case).</li>
 * </ul>
 * A low-tier user (VIEWER) and a high-tier user (ADMIN) are members of {@code WS}. A second
 * workspace {@code WS2}, its own work item, and an outsider user prove the workspace bound holds
 * under FLS (cross-tenant + unauthorized scenarios, RB-05 Stage 3).
 *
 * <p>{@code @Transactional} keeps each test isolated; {@link SecurityContextHolder} is set per test
 * so {@link AuthenticatedUser#id()} resolves the acting user, exactly as the JWT filter does at
 * runtime.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
class FieldLevelSecurityIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WorkItemReadService readService;
    @Autowired FieldDefController fieldDefController;
    @Autowired BqlContextFactory contextFactory;   // FLS Slice 2: BQL custom-field gate
    @Autowired BqlCompiler bqlCompiler;             // FLS Slice 2: end-to-end compile rejection
    @Autowired BqlController bqlController;         // FLS Slice 2: /bql/schema enumeration
    @PersistenceContext EntityManager em;

    // ── Fixture ids ──────────────────────────────────────────────────────────────────────────
    private static final String WS        = "FLS-WS";
    private static final String WS2       = "FLS-WS2";     // a second tenant for the cross-tenant test
    private static final String PROJ      = "FLS-PROJ";
    private static final String PROJ2     = "FLS-PROJ2";
    private static final String ITEM      = "FLS-ITEM";
    private static final String ITEM2     = "FLS-ITEM2";   // lives in WS2

    private static final String USER_LOW  = "FLS-USR-LOW";   // VIEWER (tier 1) member of WS
    private static final String USER_HIGH = "FLS-USR-HIGH";  // ADMIN  (tier 4) member of WS
    private static final String USER_OUT  = "FLS-USR-OUT";   // member of WS2 only (outsider to WS)

    // role_def rows on the V7 1–5 tier scale (the rules key on role_def.tier)
    private static final String ROLE_VIEWER = "FLS-RD-VIEWER"; // tier 1
    private static final String ROLE_ADMIN  = "FLS-RD-ADMIN";  // tier 4

    // field_def rows
    private static final String FD_HIDDEN   = "FLS-FD-SALARY";  // HIDDEN for VIEWER
    private static final String FD_READONLY = "FLS-FD-NOTES";   // READ_ONLY for VIEWER
    private static final String FD_NORMAL   = "FLS-FD-EXTRA";   // no rule — always visible/editable

    private static final String SALARY_VALUE = "₹42,00,000";
    private static final String NOTES_VALUE  = "internal handover notes";
    private static final String EXTRA_VALUE  = "plain visible value";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown previous run (FK-safe order; id-scoped so unrelated seed data is untouched).
        jdbc.update("DELETE FROM work_item_field_value WHERE work_item_id IN (?, ?)", ITEM, ITEM2);
        jdbc.update("DELETE FROM field_visibility WHERE field_def_id IN (?, ?, ?)",
            FD_HIDDEN, FD_READONLY, FD_NORMAL);
        jdbc.update("DELETE FROM field_def WHERE id IN (?, ?, ?)", FD_HIDDEN, FD_READONLY, FD_NORMAL);
        jdbc.update("DELETE FROM role_def WHERE id IN (?, ?)", ROLE_VIEWER, ROLE_ADMIN);
        jdbc.update("DELETE FROM work_items WHERE id IN (?, ?)", ITEM, ITEM2);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ, PROJ2);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS, WS2);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS, WS2);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?)", USER_LOW, USER_HIGH, USER_OUT);

        // Users
        insertUser(USER_LOW,  "fls-low@test.invalid",  "FLS Low",  now);
        insertUser(USER_HIGH, "fls-high@test.invalid", "FLS High", now);
        insertUser(USER_OUT,  "fls-out@test.invalid",  "FLS Out",  now);

        // Workspaces
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS, "FLS Workspace", "fls-ws", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS2, "FLS Workspace 2", "fls-ws2", now, now);

        // Memberships — tier comes from roles.tier (V7) via the role_id linkage.
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS, USER_LOW, "VIEWER", "VIEWER");   // tier 1
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS, USER_HIGH, "ADMIN", "ADMIN");    // tier 4
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS2, USER_OUT, "ADMIN", "ADMIN");    // member of the OTHER workspace only

        // Projects + work items
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ, WS, "FLS Project", "FLS", "fls-proj", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ2, WS2, "FLS Project 2", "FL2", "fls-proj2", now);
        insertItem(ITEM, "FLS item", PROJ, USER_HIGH, now);
        insertItem(ITEM2, "FLS item in WS2", PROJ2, USER_OUT, now);

        // role_def rows on the V7 1–5 scale (the table the field_visibility rules join to).
        jdbc.update("INSERT INTO role_def(id, workspace_id, name, tier, created_at) VALUES (?,?,?,?,?)",
            ROLE_VIEWER, WS, "Viewer", 1, now);
        jdbc.update("INSERT INTO role_def(id, workspace_id, name, tier, created_at) VALUES (?,?,?,?,?)",
            ROLE_ADMIN, WS, "Admin", 4, now);

        // field_def rows (workspace-scoped custom fields on the unified V80 store).
        insertFieldDef(FD_HIDDEN,   "Salary",      "salary",      "TEXT", 0, now);
        insertFieldDef(FD_READONLY, "Notes",       "notes",       "TEXT", 1, now);
        insertFieldDef(FD_NORMAL,   "Title-extra", "title_extra", "TEXT", 2, now);

        // field_visibility rules — ONLY for the VIEWER (tier 1) role. Salary HIDDEN, Notes READ_ONLY.
        // Title-extra has no rule (defaults to EDITABLE → always visible). ADMIN (tier 4) has no
        // rules at all → sees/edits everything (the no-over-redaction baseline).
        insertVisibility(FD_HIDDEN,   ROLE_VIEWER, "HIDDEN");
        insertVisibility(FD_READONLY, ROLE_VIEWER, "READ_ONLY");

        // work_item_field_value rows — the actual values that must (or must not) leak.
        insertValue("FLS-FV-1", ITEM, FD_HIDDEN,   SALARY_VALUE, now);
        insertValue("FLS-FV-2", ITEM, FD_READONLY, NOTES_VALUE, now);
        insertValue("FLS-FV-3", ITEM, FD_NORMAL,   EXTRA_VALUE, now);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    // ── Seed helpers ─────────────────────────────────────────────────────────────────────────

    private void insertUser(String id, String email, String name, OffsetDateTime now) {
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            id, email, "x", name, now);
    }

    private void insertItem(String id, String title, String projectId, String createdBy, OffsetDateTime now) {
        jdbc.update("INSERT INTO work_items("
            + " id, title, status, type, priority, project_id, created_by, created_at, updated_at"
            + ") VALUES (?,?,?,?,?,?,?,?,?)",
            id, title, "Open", "Task", "MEDIUM", projectId, createdBy, now, now);
    }

    private void insertFieldDef(String id, String name, String key, String type, int position, OffsetDateTime now) {
        jdbc.update("INSERT INTO field_def(id, workspace_id, name, field_key, field_type, position, created_at) "
            + "VALUES (?,?,?,?,?,?,?)", id, WS, name, key, type, position, now);
    }

    private void insertVisibility(String fieldDefId, String roleDefId, String visibility) {
        jdbc.update("INSERT INTO field_visibility(id, field_def_id, role_def_id, visibility) VALUES (?,?,?,?)",
            "FLS-VIS-" + fieldDefId + "-" + roleDefId, fieldDefId, roleDefId, visibility);
    }

    private void insertValue(String id, String itemId, String fieldDefId, String text, OffsetDateTime now) {
        jdbc.update("INSERT INTO work_item_field_value(id, work_item_id, field_def_id, value_text, "
            + "created_at, updated_at) VALUES (?,?,?,?,?,?)", id, itemId, fieldDefId, text, now, now);
    }

    /** Act as {@code userId} for the duration of one assertion block (mirrors the JWT filter). */
    private void actAs(String userId) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    // ── (1) HIDDEN value: high tier sees it, low tier does not ─────────────────────────────────

    /**
     * The headline guarantee. The HIGH (ADMIN, tier 4) user — who has no HIDDEN rule — receives the
     * HIDDEN field's value on BOTH response paths: the embedded {@code WorkItem.fieldValues} map
     * (work-item detail) AND the dedicated {@code GET /field-defs/values/{id}} endpoint.
     */
    @Test
    void highTierUser_receivesHiddenFieldValue_onBothReadPaths() {
        actAs(USER_HIGH);

        WorkItem item = readService.getWorkItem(ITEM);
        assertThat(item.getFieldValues())
            .as("ADMIN sees the HIDDEN field's value in the embedded work-item read path")
            .containsEntry(FD_HIDDEN, SALARY_VALUE);

        List<WorkItemFieldValue> values = fieldDefController.getValues(ITEM);
        assertThat(values).extracting(WorkItemFieldValue::getFieldDefId)
            .as("ADMIN sees the HIDDEN field via the dedicated values endpoint")
            .contains(FD_HIDDEN);
    }

    /**
     * The low-tier (VIEWER, tier 1) user has a HIDDEN rule on Salary — the value must be stripped
     * server-side from BOTH read paths. This is "manager drill-down blocked at the API", per field.
     */
    @Test
    void lowTierUser_doesNotReceiveHiddenFieldValue_onBothReadPaths() {
        actAs(USER_LOW);

        WorkItem item = readService.getWorkItem(ITEM);
        assertThat(item.getFieldValues())
            .as("VIEWER must NOT receive the HIDDEN field in the embedded work-item read path")
            .doesNotContainKey(FD_HIDDEN);

        List<WorkItemFieldValue> values = fieldDefController.getValues(ITEM);
        assertThat(values).extracting(WorkItemFieldValue::getFieldDefId)
            .as("VIEWER must NOT receive the HIDDEN field via the dedicated values endpoint")
            .doesNotContain(FD_HIDDEN);
    }

    /**
     * Regression closed in this EPIC: the legacy {@code custom_fields} JSONB is a SECOND value store
     * whose keys are field_def ids post-V80, so a HIDDEN field leaked through it even after the
     * {@code work_item_field_value} path was redacted. The low tier must NOT receive the HIDDEN key
     * via {@code WorkItem.customFields}; the high tier (no rule) still does (no over-redaction).
     */
    @Test
    void hiddenValue_inLegacyCustomFieldsJsonb_isAlsoRedacted() {
        jdbc.update("UPDATE work_items SET custom_fields = ?::jsonb WHERE id = ?",
            "{\"" + FD_HIDDEN + "\":\"legacy salary leak\",\"" + FD_NORMAL + "\":\"legacy plain\"}", ITEM);

        actAs(USER_LOW);
        assertThat(readService.getWorkItem(ITEM).getCustomFields())
            .as("VIEWER must NOT receive the HIDDEN field via the legacy custom_fields JSONB")
            .doesNotContainKey(FD_HIDDEN)
            .as("VIEWER still receives a no-rule field from custom_fields (no over-redaction)")
            .containsKey(FD_NORMAL);

        actAs(USER_HIGH);
        assertThat(readService.getWorkItem(ITEM).getCustomFields())
            .as("ADMIN (no rule) still sees the HIDDEN field's legacy custom_fields value")
            .containsKey(FD_HIDDEN);
    }

    // ── (2) READ_ONLY write rejected for the unpermitted tier; high tier may write ─────────────

    /**
     * A READ_ONLY field is rejected on write for the low tier (VIEWER) with the standard 403 error
     * shape — on BOTH mutation surfaces ({@code setValue} create/update AND {@code deleteValue}).
     */
    @Test
    void lowTierUser_writeToReadOnlyField_isRejected() {
        actAs(USER_LOW);

        assertThatThrownBy(() ->
                fieldDefController.setValue(ITEM, FD_READONLY, Map.of("valueText", "tampered")))
            .as("VIEWER PUT on a READ_ONLY field → 403 FORBIDDEN")
            .isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.getStatus().value()).isEqualTo(403);
                assertThat(e.getCode()).isEqualTo("FORBIDDEN");
                assertThat(e.getMessage()).isEqualTo("This field is read-only for your role.");
            });

        assertThatThrownBy(() -> fieldDefController.deleteValue(ITEM, FD_READONLY))
            .as("VIEWER DELETE on a READ_ONLY field → 403 (deleteValue parity)")
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getCode()).isEqualTo("FORBIDDEN"));

        // The value was never mutated — still present in the store.
        String stillThere = jdbc.queryForObject(
            "SELECT value_text FROM work_item_field_value WHERE work_item_id = ? AND field_def_id = ?",
            String.class, ITEM, FD_READONLY);
        assertThat(stillThere)
            .as("the rejected writes left the READ_ONLY value untouched")
            .isEqualTo(NOTES_VALUE);
    }

    /** A HIDDEN field is also un-writable by the low tier (HIDDEN is more restrictive than READ_ONLY). */
    @Test
    void lowTierUser_writeToHiddenField_isRejected() {
        actAs(USER_LOW);

        assertThatThrownBy(() ->
                fieldDefController.setValue(ITEM, FD_HIDDEN, Map.of("valueText", "tampered")))
            .as("VIEWER PUT on a HIDDEN field → 403 FORBIDDEN")
            .isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.getStatus().value()).isEqualTo(403);
                assertThat(e.getCode()).isEqualTo("FORBIDDEN");
                assertThat(e.getMessage()).isEqualTo("You do not have permission to access this field.");
            });
    }

    /**
     * The high tier (ADMIN, no rules) may write the READ_ONLY field — proving the write guard targets
     * the unpermitted tier specifically, not the field globally.
     */
    @Test
    void highTierUser_canWriteReadOnlyField() {
        actAs(USER_HIGH);

        WorkItemFieldValue saved = fieldDefController.setValue(
            ITEM, FD_READONLY, Map.of("valueText", "admin edit"));

        assertThat(saved.getValueText()).isEqualTo("admin edit");
        em.flush(); // push the JPA write to the DB so the raw-JDBC read-back sees it within this @Transactional test
        String persisted = jdbc.queryForObject(
            "SELECT value_text FROM work_item_field_value WHERE work_item_id = ? AND field_def_id = ?",
            String.class, ITEM, FD_READONLY);
        assertThat(persisted).isEqualTo("admin edit");
    }

    // ── (3) No over-redaction: a field with no rule is visible/editable for every tier ─────────

    /**
     * Conservative posture (EPIC P1 §4): a field with NO {@code field_visibility} rule is returned
     * unchanged for BOTH tiers, and the READ_ONLY field's <i>value</i> is still returned to the low
     * tier (READ_ONLY redacts writes, never reads). Nothing is over-redacted.
     */
    @Test
    void normalFields_areNeverOverRedacted_forEitherTier() {
        actAs(USER_LOW);
        WorkItem lowItem = readService.getWorkItem(ITEM);
        assertThat(lowItem.getFieldValues())
            .as("VIEWER still sees the un-ruled field AND the READ_ONLY field's value (reads not redacted)")
            .containsEntry(FD_NORMAL, EXTRA_VALUE)
            .containsEntry(FD_READONLY, NOTES_VALUE);

        actAs(USER_HIGH);
        WorkItem highItem = readService.getWorkItem(ITEM);
        assertThat(highItem.getFieldValues())
            .as("ADMIN sees every field (no rules apply to tier 4)")
            .containsEntry(FD_NORMAL, EXTRA_VALUE)
            .containsEntry(FD_READONLY, NOTES_VALUE)
            .containsEntry(FD_HIDDEN, SALARY_VALUE);
    }

    /** The low tier may freely write a field that carries no visibility rule. */
    @Test
    void lowTierUser_canWriteUnruledField() {
        actAs(USER_LOW);

        WorkItemFieldValue saved = fieldDefController.setValue(
            ITEM, FD_NORMAL, Map.of("valueText", "viewer edit"));

        assertThat(saved.getValueText()).isEqualTo("viewer edit");
    }

    // ── (4) Workspace-scoped: cross-tenant + unauthorized bounds hold under FLS ────────────────

    /**
     * Cross-tenant (RB-05 Stage 3): the WS2 user reading their OWN item never sees WS's HIDDEN field
     * — the {@code field_visibility} rules are workspace-scoped, so a rule authored in WS cannot leak
     * across tenants, and WS2 (no rules) returns its own values unredacted. The verdict is resolved
     * per the item's workspace, never the caller's.
     */
    @Test
    void crossTenant_visibilityRulesDoNotLeakAcrossWorkspaces() {
        actAs(USER_OUT);

        WorkItem ws2Item = readService.getWorkItem(ITEM2);
        assertThat(ws2Item.getFieldValues())
            .as("WS2's item carries no WS field values; WS's HIDDEN rule is irrelevant to WS2")
            .doesNotContainKey(FD_HIDDEN);
    }

    /**
     * Unauthorized (RB-05 Stage 3): a user who is not a member of WS cannot even read WS's item — it
     * is excluded by the upstream {@code MEMBER_PROJECTS} workspace scope (404), so FLS is never
     * reached. This documents that the workspace bound, not FLS, is what stops the non-member; FLS
     * narrows fields within an already-authorized read.
     */
    @Test
    void nonMember_cannotReadForeignWorkspaceItem_atAll() {
        actAs(USER_OUT); // member of WS2 only, not WS

        assertThatThrownBy(() -> readService.getWorkItem(ITEM))
            .as("a non-member of WS is blocked at the row level (MEMBER_PROJECTS), before FLS")
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus().value()).isEqualTo(404));
    }

    /**
     * Batch / multi-path: the list path ({@code getAllWorkItems} → {@code attachFieldValuesBatch}, the
     * primary leak surface) applies the same per-workspace redaction. The VIEWER's list view of WS's
     * item has the HIDDEN field stripped while the un-ruled field survives.
     */
    @Test
    void listPath_redactsHiddenField_forLowTier() {
        actAs(USER_LOW);

        List<WorkItem> items = readService.getAllWorkItems(null, 0, 100).getBody();
        WorkItem seeded = items.stream().filter(w -> ITEM.equals(w.getId())).findFirst().orElseThrow();

        assertThat(seeded.getFieldValues())
            .as("the list/board choke point strips HIDDEN but keeps un-ruled fields")
            .doesNotContainKey(FD_HIDDEN)
            .containsEntry(FD_NORMAL, EXTRA_VALUE);
    }

    // ── (5) FLS Slice 2: a HIDDEN field cannot be INFERRED via BQL (filter oracle + schema leak) ──
    // The read path (above) strips a HIDDEN field's VALUE from responses, but BQL was a side channel:
    // a low-tier user could filter on the HIDDEN field (e.g. `salary > X`) and binary-search its value
    // from which rows match, and the /bql/schema autocomplete listed the HIDDEN field's existence/type.
    // Slice 2 excludes HIDDEN custom fields from the per-user BQL context so both channels are closed.

    /**
     * The inference oracle is closed: for the VIEWER (Salary HIDDEN) the field is not in the BQL
     * context, so the compiler rejects a filter on it exactly like an unknown field — no row-presence
     * oracle. The ADMIN (no rule) may still filter on it, and an un-ruled field stays queryable for the
     * VIEWER (no over-restriction).
     */
    @Test
    void lowTier_cannotFilterOnHiddenField_inBql_inferenceOracleClosed() {
        BqlContext low = contextFactory.forUser(USER_LOW, WS);
        assertThat(low.customField("salary"))
            .as("VIEWER: the HIDDEN custom field is NOT queryable in BQL").isNull();
        assertThat(low.customField("title_extra"))
            .as("VIEWER: an un-ruled custom field stays queryable (no over-restriction)").isNotNull();

        BqlContext high = contextFactory.forUser(USER_HIGH, WS);
        assertThat(high.customField("salary"))
            .as("ADMIN (no HIDDEN rule): the field remains queryable").isNotNull();

        // End-to-end compile: filtering on the HIDDEN field is rejected for the VIEWER (unknown field),
        // so result-count/row-presence can never reveal its value; ADMIN may still filter on it.
        assertThatThrownBy(() -> bqlCompiler.compileFor("salary = '42'", low))
            .as("VIEWER filtering on a HIDDEN field is rejected — the binary-search oracle is closed")
            .isInstanceOf(BqlException.class)
            .hasMessageContaining("Unknown field");
        assertThatCode(() -> bqlCompiler.compileFor("salary = '42'", high))
            .as("ADMIN can still filter on the field").doesNotThrowAnyException();
        assertThatCode(() -> bqlCompiler.compileFor("title_extra = '42'", low))
            .as("VIEWER can still filter on an un-ruled custom field").doesNotThrowAnyException();
    }

    /**
     * The schema/autocomplete endpoint ({@code GET /bql/schema}) must not enumerate a HIDDEN field's
     * existence/type to a user who may not see it. It builds its context via the same
     * {@code BqlContextFactory.forUser}, so the Slice 2 exclusion closes this surface too: the VIEWER's
     * schema omits the HIDDEN field but keeps the un-ruled one; the ADMIN still sees it.
     */
    @Test
    void bqlSchema_omitsHiddenCustomField_forLowTier_butListsItForHighTier() {
        actAs(USER_LOW);
        List<String> lowAliases = schemaCustomFieldAliases(WS);
        assertThat(lowAliases)
            .as("VIEWER's BQL schema must NOT enumerate the HIDDEN custom field")
            .doesNotContain("salary")
            .as("VIEWER's BQL schema still lists an un-ruled custom field")
            .contains("title_extra");

        actAs(USER_HIGH);
        assertThat(schemaCustomFieldAliases(WS))
            .as("ADMIN (no rule) still sees the field in the BQL schema (no over-restriction)")
            .contains("salary", "title_extra");
    }

    /** Custom-field aliases the {@code /bql/schema} endpoint exposes to the acting user. */
    @SuppressWarnings("unchecked")
    private List<String> schemaCustomFieldAliases(String workspaceId) {
        Map<String, Object> schema = bqlController.schema(workspaceId);
        List<Map<String, Object>> fields = (List<Map<String, Object>>) schema.get("fields");
        return fields.stream()
            .filter(f -> Boolean.TRUE.equals(f.get("custom")))
            .map(f -> String.valueOf(f.get("alias")))
            .toList();
    }
}
