package com.bcits.works.workitems;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Active-content hardening for attachments (roadmap ticket 18, RB-10 §8).
 *
 * <p>The stored {@code mime_type} is the browser-supplied multipart header, not a sniffed type, so
 * the download path must not treat it as trustworthy: anything that a browser can execute in the
 * API's own origin is either refused at upload or forced to download rather than render.
 */
@Tag("unit")
class AttachmentContentPolicyTest {

    @Test
    void blocksExecutableUploads() {
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/x-msdownload", "setup.exe")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/x-executable", "a.out")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/x-sh", "run.sh")).isTrue();
    }

    @Test
    void blocksActiveContentUploads() {
        assertThat(AttachmentContentPolicy.isUploadBlocked("text/html", "notes.html")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/xhtml+xml", "page.xhtml")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("image/svg+xml", "logo.svg")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("text/javascript", "app.js")).isTrue();
    }

    /** A lying Content-Type must not smuggle active content past the check. */
    @Test
    void blocksActiveContentByExtensionWhenTheDeclaredTypeLies() {
        assertThat(AttachmentContentPolicy.isUploadBlocked("image/png", "payload.html")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("text/plain", "payload.svg")).isTrue();
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/octet-stream", "payload.HTM")).isTrue();
    }

    @Test
    void allowsOrdinaryBusinessAttachments() {
        assertThat(AttachmentContentPolicy.isUploadBlocked("application/pdf", "spec.pdf")).isFalse();
        assertThat(AttachmentContentPolicy.isUploadBlocked("image/png", "screenshot.png")).isFalse();
        assertThat(AttachmentContentPolicy.isUploadBlocked("text/plain", "log.txt")).isFalse();
        assertThat(AttachmentContentPolicy.isUploadBlocked(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "brief.docx")).isFalse();
    }

    @Test
    void rendersOnlyPreviewSafeTypesInline() {
        assertThat(AttachmentContentPolicy.contentDisposition("image/png")).isEqualTo("inline");
        assertThat(AttachmentContentPolicy.contentDisposition("image/jpeg")).isEqualTo("inline");
        assertThat(AttachmentContentPolicy.contentDisposition("application/pdf")).isEqualTo("inline");
        assertThat(AttachmentContentPolicy.contentDisposition("text/plain")).isEqualTo("inline");
    }

    /** Anything outside the preview allow-list downloads instead of rendering in the API origin. */
    @Test
    void forcesDownloadForEverythingElse() {
        assertThat(AttachmentContentPolicy.contentDisposition("text/html")).isEqualTo("attachment");
        assertThat(AttachmentContentPolicy.contentDisposition("image/svg+xml")).isEqualTo("attachment");
        assertThat(AttachmentContentPolicy.contentDisposition("application/octet-stream")).isEqualTo("attachment");
        assertThat(AttachmentContentPolicy.contentDisposition(null)).isEqualTo("attachment");
    }

    /** Legacy rows uploaded before this policy existed still must not render as active content. */
    @Test
    void neutralisesStoredActiveContentTypesOnDownload() {
        assertThat(AttachmentContentPolicy.safeContentType("text/html")).isEqualTo("application/octet-stream");
        assertThat(AttachmentContentPolicy.safeContentType("image/svg+xml")).isEqualTo("application/octet-stream");
        assertThat(AttachmentContentPolicy.safeContentType(null)).isEqualTo("application/octet-stream");
        assertThat(AttachmentContentPolicy.safeContentType("image/png")).isEqualTo("image/png");
        assertThat(AttachmentContentPolicy.safeContentType("application/pdf")).isEqualTo("application/pdf");
    }

    /** A crafted filename must not be able to terminate the quoted header or append a directive. */
    @Test
    void sanitisesFilenameForTheContentDispositionHeader() {
        String sanitised = AttachmentContentPolicy.headerSafeFileName("re\"port\r\nX-Evil: 1.pdf");

        assertThat(sanitised).doesNotContain("\"").doesNotContain("\r").doesNotContain("\n");
        assertThat(sanitised).isEqualTo("re_port__X-Evil: 1.pdf");
    }

    @Test
    void fallsBackToAGenericNameWhenTheFilenameIsUnusable() {
        assertThat(AttachmentContentPolicy.headerSafeFileName(null)).isEqualTo("download");
        assertThat(AttachmentContentPolicy.headerSafeFileName("   ")).isEqualTo("download");
        // A name made only of control characters is blank, so it never reaches the header at all.
        assertThat(AttachmentContentPolicy.headerSafeFileName("\r\n")).isEqualTo("download");
    }
}
