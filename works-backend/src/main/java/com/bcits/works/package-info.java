/**
 * Root package for bSmart Works.
 *
 * <h2>The one canonical central tenant filter (RB-40 §1, #243)</h2>
 * This package declares the single, canonical {@link org.hibernate.annotations.FilterDef} for the
 * central Hibernate tenant filter <b>once</b>, here at package scope, rather than repeating it on an
 * entity. A {@code @FilterDef} is global to the persistence unit regardless of which class carries
 * it, so declaring it in {@code package-info} (a) makes it obviously a cross-cutting, app-wide
 * definition rather than a property of any one table, and (b) removes the duplication risk of every
 * filtered entity re-declaring it (only the first would win and the rest are silent no-ops).
 *
 * <p>Workspace-owned entities then apply the filter with just the lightweight
 * {@link org.hibernate.annotations.Filter} annotation — the <i>name</i> and <i>parameter</i> come
 * from this single definition. The name/param constants live on
 * {@link com.bcits.works.WorkspaceFilterActivator} so the activator, the {@code @Filter}
 * annotations, and the {@code @FilterDef} can never drift apart.
 *
 * <p><b>Condition is SQL, not JPQL:</b> the filter condition uses the raw column name
 * {@code workspace_id} because Hibernate evaluates filter conditions as SQL fragments against the
 * mapped table. Every tenant-scoped table exposes that column directly (see the entity inventory in
 * {@code docs/implementation/epics/EPIC-P1-243-central-tenant-filter.md}); transitively-scoped tables
 * (e.g. {@code work_items} via {@code project_id}) use a subquery condition on their own
 * {@code @Filter} and are out of scope for this infrastructure-only slice.
 *
 * <p>When the filter is enabled (by {@link com.bcits.works.WorkspaceFilterActivator}, driven by
 * {@link com.bcits.works.TenantContext}) it adds {@code AND workspace_id = :workspaceId} to reads of
 * any entity carrying {@code @Filter(name = "workspaceFilter")}; when disabled (no workspace bound,
 * or inside the {@link com.bcits.works.TenantScope} system escape hatch) behaviour is byte-for-byte
 * identical to before this layer existed.
 */
@org.hibernate.annotations.FilterDef(
        name = com.bcits.works.shared.WorkspaceFilterActivator.FILTER_NAME,
        parameters = @org.hibernate.annotations.ParamDef(
                name = com.bcits.works.shared.WorkspaceFilterActivator.PARAM_NAME,
                type = String.class))
package com.bcits.works;
