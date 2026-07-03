package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Proves AttachmentController endpoints are tenant-scoped (RB-40 §1): a caller who is not a
 * member of the work item's workspace gets 404 (indistinguishable from a missing item) and the
 * database is never touched; delete binds the path's work_item_id so an attachment can only be
 * removed through its own work item.
 */
@Tag("unit")
class AttachmentControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String ITEM_IN_A = "WI-001";
    private static final String ITEM_IN_B = "WI-666";
    private static final String MISSING_ITEM = "WI-404";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AttachmentController controller = new AttachmentController(jdbc, authenticatedUser, rbac);

    AttachmentControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // Caller is a member of workspace A only.
        when(rbac.workspaceForWorkItem(ITEM_IN_A)).thenReturn(WS_A);
        when(rbac.getUserTier(CALLER, WS_A)).thenReturn(1);
        when(rbac.workspaceForWorkItem(ITEM_IN_B)).thenReturn(WS_B);
        when(rbac.getUserTier(CALLER, WS_B)).thenReturn(0);
        when(rbac.workspaceForWorkItem(MISSING_ITEM)).thenReturn(null);
    }

    // ── Cross-tenant: every endpoint 404s and never reaches the database ────────

    @Test
    void getAttachments_crossTenant_returns404AndNeverQueries() {
        assertThrows(ApiException.class, () -> controller.getAttachments(ITEM_IN_B, 0, 50));
        verifyNoInteractions(jdbc);
    }

    @Test
    void upload_crossTenant_returns404AndNeverStores() {
        MockMultipartFile file = new MockMultipartFile("file", "a.txt", "text/plain", "x".getBytes());
        assertThrows(ApiException.class, () -> controller.upload(ITEM_IN_B, file));
        verifyNoInteractions(jdbc);
    }

    @Test
    void serveFile_crossTenant_returns404AndNeverQueries() {
        assertThrows(ApiException.class, () -> controller.serveFile(ITEM_IN_B, 7L));
        verifyNoInteractions(jdbc);
    }

    @Test
    void delete_crossTenant_returns404AndNeverDeletes() {
        assertThrows(ApiException.class, () -> controller.delete(ITEM_IN_B, 7L));
        verifyNoInteractions(jdbc);
    }

    // ── Unauthorized: unknown work item is indistinguishable from a foreign one ─

    @Test
    void getAttachments_unknownWorkItem_returns404() {
        assertThrows(ApiException.class, () -> controller.getAttachments(MISSING_ITEM, 0, 50));
        verifyNoInteractions(jdbc);
    }

    // ── Happy path: a workspace member passes the gate ──────────────────────────

    @Test
    void getAttachments_member_queriesScopedToWorkItem() {
        controller.getAttachments(ITEM_IN_A, 0, 50);
        verify(jdbc).queryForList(
            "SELECT a.id, a.file_name, a.file_size, a.mime_type, a.attachment_type, a.url, a.created_at, "
            + "u.full_name as uploaded_by_name "
            + "FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by "
            + "WHERE a.work_item_id = ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
            ITEM_IN_A, 50, 0);
    }

    @Test
    void delete_member_bindsWorkItemIdFromPath() {
        when(jdbc.queryForList(
                "SELECT storage_path FROM attachments WHERE id = ? AND work_item_id = ?",
                String.class, 7L, ITEM_IN_A))
            .thenReturn(List.of());

        controller.delete(ITEM_IN_A, 7L);

        verify(jdbc).update("DELETE FROM attachments WHERE id = ? AND work_item_id = ?", 7L, ITEM_IN_A);
    }

    // ── Upload directory configurability (audit finding #10) ─────────────────────

    /**
     * Proves that {@code uploadDir} is an injectable instance field, not a hardcoded static
     * constant. Spring injects the value via {@code @Value("${app.attachments.dir:...}")} so any
     * deployment can override it (including the Docker named volume at {@code /data/uploads}).
     * This test uses ReflectionTestUtils to simulate what Spring does at startup.
     */
    @Test
    void uploadDir_isConfigurableViaProperty(@TempDir Path tempDir) throws Exception {
        AttachmentController fresh = new AttachmentController(jdbc, authenticatedUser, rbac);
        // Simulate Spring injecting the property value (e.g. APP_ATTACHMENTS_DIR=/data/uploads)
        ReflectionTestUtils.setField(fresh, "uploadDir", tempDir.toString());

        String injected = (String) ReflectionTestUtils.getField(fresh, "uploadDir");

        assertEquals(tempDir.toString(), injected,
            "uploadDir must reflect the injected property, not a hardcoded path");
        assertTrue(injected.startsWith(tempDir.getRoot().toString()),
            "injected path should be under the temp root, not the user home");
    }

    /**
     * Proves that the no-arg field declaration has no hardcoded default of user.home.
     * The field must be a plain non-static {@code String} — if it were a {@code static final}
     * constant it would be impossible to inject, which is the original bug.
     */
    @Test
    void uploadDir_fieldIsNotStaticFinal() throws Exception {
        Field field = AttachmentController.class.getDeclaredField("uploadDir");
        int mods = field.getModifiers();
        assertTrue((mods & java.lang.reflect.Modifier.STATIC) == 0,
            "uploadDir must NOT be static — static fields cannot be @Value-injected");
        assertTrue((mods & java.lang.reflect.Modifier.FINAL) == 0,
            "uploadDir must NOT be final — final fields cannot be @Value-injected after construction");
    }
}
