package com.bcits.works;

import java.util.List;

/**
 * The registry of named extension points (iteration 17, Cap R — Extension API). Code-level
 * extensions in the config document target one of these hooks. The catalog is intentionally a fixed,
 * server-owned allow-list: an extension may only bind to a known hook, so the surface is reviewable.
 *
 * <p><b>Execution is deliberately not implemented here.</b> Running customer-authored JavaScript is a
 * security-critical capability (RB-40 — stop-and-ask territory) that must run in an isolated,
 * resource-capped sandbox. This iteration ships the definition, validation, versioning and audit of
 * extensions; the sandboxed runtime is tracked as its own task (TECH-DEBT). Until then an extension
 * is stored and surfaced but never evaluated.
 */
final class ConfigExtensionPoints {

    private ConfigExtensionPoints() { }

    /** A hook an extension can bind to: a stable id, a label, and where it fires. */
    record ExtensionPoint(String id, String label, String description) { }

    static final List<ExtensionPoint> CATALOG = List.of(
            new ExtensionPoint("work_item.before_create",
                    "Before work item created",
                    "Validate or enrich a work item before it is persisted."),
            new ExtensionPoint("work_item.after_status_change",
                    "After status change",
                    "React to a work item moving between statuses."),
            new ExtensionPoint("form.validate",
                    "Custom form validation",
                    "Run additional validation when a custom form is submitted."),
            new ExtensionPoint("dashboard.compute_widget",
                    "Compute custom widget",
                    "Derive a value for a custom dashboard/page widget."),
            new ExtensionPoint("notification.format",
                    "Format notification",
                    "Customize the body of an outbound notification.")
    );
}
