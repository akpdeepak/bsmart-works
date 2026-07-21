package com.bcits.works.workitems;

import java.util.Locale;
import java.util.Set;

/**
 * Decides what an attachment is allowed to be and how it may be served (roadmap ticket 18, RB-10 §8).
 *
 * <p>The {@code mime_type} persisted with an attachment is the browser-supplied multipart header — it
 * is declared by the uploader, never sniffed from the bytes. Serving that value back with
 * {@code Content-Disposition: inline} let a member upload an HTML or SVG document and then hand a
 * colleague a link that executes script in the API's own origin, reading the session from there.
 *
 * <p>Two independent layers close that:
 * <ol>
 *   <li><b>Upload</b> refuses executables and browser-active documents, matching on the declared type
 *       <em>and</em> the file extension, so a lying {@code Content-Type} does not smuggle one past.</li>
 *   <li><b>Download</b> renders inline only for a small preview allow-list and neutralises the stored
 *       type for anything else, so rows written before this policy existed are also covered.</li>
 * </ol>
 */
public final class AttachmentContentPolicy {

    /** Types a browser will execute, or that carry script, in the origin that serves them. */
    private static final Set<String> ACTIVE_CONTENT_TYPES = Set.of(
            "text/html",
            "application/xhtml+xml",
            "image/svg+xml",
            "text/javascript",
            "application/javascript",
            "application/x-javascript",
            "application/xml",
            "text/xml",
            "application/wasm");

    private static final Set<String> EXECUTABLE_TYPES = Set.of(
            "application/x-msdownload",
            "application/x-executable",
            "application/x-sh",
            "application/x-msdos-program",
            "application/vnd.microsoft.portable-executable");

    /** Extensions matching the sets above; checked independently of the declared type. */
    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "html", "htm", "xhtml", "shtml", "svg", "js", "mjs", "xml", "wasm",
            "exe", "dll", "com", "bat", "cmd", "sh", "msi", "scr", "jar");

    /** The only types served for in-browser preview. Everything else downloads. */
    private static final Set<String> INLINE_SAFE_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/bmp",
            "application/pdf",
            "text/plain");

    private AttachmentContentPolicy() {
    }

    /** True when the upload must be refused, judged on the declared type or the file extension. */
    public static boolean isUploadBlocked(String mimeType, String fileName) {
        String type = normalize(mimeType);
        if (ACTIVE_CONTENT_TYPES.contains(type) || EXECUTABLE_TYPES.contains(type)) {
            return true;
        }
        return BLOCKED_EXTENSIONS.contains(extensionOf(fileName));
    }

    /** {@code inline} only for preview-safe types; {@code attachment} for everything else. */
    public static String contentDisposition(String mimeType) {
        return INLINE_SAFE_TYPES.contains(normalize(mimeType)) ? "inline" : "attachment";
    }

    /**
     * The Content-Type actually sent. Preview-safe types pass through; anything else — including
     * legacy active-content rows stored before this policy — becomes an opaque byte stream.
     */
    public static String safeContentType(String storedMimeType) {
        String type = normalize(storedMimeType);
        return INLINE_SAFE_TYPES.contains(type) ? type : "application/octet-stream";
    }

    /**
     * Strips quotes, CR and LF from a filename before it is interpolated into the quoted
     * {@code Content-Disposition} value, so a crafted name cannot terminate the header early or
     * append a directive of its own.
     */
    public static String headerSafeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "download";
        }
        String cleaned = fileName.replaceAll("[\"\\\\\r\n]", "_").trim();
        return cleaned.isEmpty() ? "download" : cleaned;
    }

    private static String normalize(String mimeType) {
        if (mimeType == null) {
            return "";
        }
        int parameterStart = mimeType.indexOf(';');
        String bare = parameterStart >= 0 ? mimeType.substring(0, parameterStart) : mimeType;
        return bare.trim().toLowerCase(Locale.ROOT);
    }

    private static String extensionOf(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).trim().toLowerCase(Locale.ROOT);
    }
}
