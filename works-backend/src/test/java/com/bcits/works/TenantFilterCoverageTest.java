package com.bcits.works;
import com.bcits.works.security.AccessAnomaly;

import com.bcits.works.shared.WorkspaceFilterActivator;
import com.bcits.works.projects.Project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import org.hibernate.annotations.Filter;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The structural guarantee behind the central tenant filter (RB-40 §1, EPIC #243 §5–6): <b>every</b>
 * {@code @Entity} whose table carries a {@code workspace_id} column must either apply the central
 * {@code @Filter(name = "workspaceFilter")} <i>or</i> appear on an explicit, justified allow-list.
 * Anything else is a leak-capable entity that slipped through review — and this test fails the build
 * rather than relying on vigilance.
 *
 * <h2>How "has a workspace_id column" is detected (reflection)</h2>
 * An entity owns the tenant column iff one of its (inherited) fields maps to the column named exactly
 * {@code workspace_id}: a field literally named {@code workspaceId} (implicit camelCase→snake_case
 * mapping, as on {@link Project}) <b>or</b> a field annotated {@code @Column(name = "workspace_id")}
 * (as on {@link AccessAnomaly}). This deliberately excludes <i>ownership</i> columns like
 * {@code publisher_workspace_id} / {@code owner_workspace_id} (on the global catalog entities
 * {@code MarketplaceListing} / {@code ConfigTemplate}), which are not the tenant-scoping column.
 *
 * <h2>Two allow-lists</h2>
 * <ul>
 *   <li>{@link #GLOBAL_BY_DESIGN} — entities that are global by design and must <b>never</b> be
 *       filtered (the inventory's GLOBAL group: identity, the tenant root itself, user-scoped
 *       cross-workspace data, pre-auth tokens, and global catalogs). Permanent.</li>
 *   <li>{@link #PENDING_FILTER} — tenant-scoped entities that <i>will</i> carry {@code @Filter} but
 *       are not yet annotated, because #243 is rolled out in slices (this slice ships the
 *       infrastructure only; entities are annotated in slices 1–2). This list is expected to
 *       <b>shrink to empty</b>: each time an entity gains {@code @Filter} it must be removed from
 *       here, and {@link #pendingFilterEntriesAreStillUnfiltered_soTheListStaysHonest()} fails if a
 *       now-filtered entity is left on it. When this list is empty, the contract is fully enforced.</li>
 * </ul>
 *
 * <p>Pure unit test: static bytecode discovery of {@code @Entity} classes + reflection on the field
 * mappings. No Spring context, no database. Tagged {@code "unit"}.
 */
@Tag("unit")
class TenantFilterCoverageTest {

    private static final String WORKSPACE_COLUMN = "workspace_id";

    /**
     * Global-by-design entities — must never carry the central filter. Seeded verbatim from the
     * inventory's GLOBAL classification (EPIC #243 §4). Rationale per entity is in the EPIC; in short:
     * identity is a unification layer (a user spans workspaces); the workspace row is the tenant root
     * (filtering it on its own id is circular); preferences/push/reset-tokens/passkey challenges are
     * user- or auth-scoped and read before/across any workspace binding; marketplace
     * and config-template are global/shared catalogs whose visibility is enforced in their queries,
     * not by a {@code workspace_id = :ws} filter; role-permission is a global reference vocabulary.
     *
     * <p>None of these actually expose a {@code workspace_id} column by the detector above, so they
     * would not be flagged regardless — this list is the explicit, reviewed record of that decision
     * and a guard if the detector is ever broadened.
     */
    static final Set<String> GLOBAL_BY_DESIGN = Set.of(
            "User",
            "Workspace",
            "NotificationPreference",
            "PushSubscription",
            "PasswordResetToken",
            "WebAuthnChallenge",
            "MarketplaceListing",
            "ConfigTemplate",
            "RolePermission");

    /**
     * Tenant-scoped entities awaiting {@code @Filter}. Temporary and shrinking: #243 applied the
     * annotation in slices, and as of the direct-{@code workspace_id} slice <b>every</b> such entity
     * now carries {@code @Filter(name = "workspaceFilter")}, so this list is empty and the contract is
     * fully enforced for direct-column entities. Re-add an entry only if a new tenant-scoped entity is
     * introduced and cannot be annotated immediately — and remove it the moment it gains the filter.
     *
     * <p>Transitively-scoped entities (no {@code workspace_id} column of their own — e.g.
     * {@code WorkItem} via {@code project_id}) are <b>now</b> covered (Slices B+C): each carries a
     * subquery-condition {@code @Filter} and is enforced by
     * {@link #everyEntityIsFilteredOrGloballyAllowListed()} +
     * {@link #transitiveEntitiesScopeViaSubqueryNotDirectColumn()}, even though
     * {@link #hasWorkspaceColumn(Class)} cannot see their parent-FK scoping.
     */
    static final Set<String> PENDING_FILTER = Set.of();

    private static List<Class<?>> entityClasses;

    @BeforeAll
    static void loadEntities() {
        JavaClasses imported = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.bcits.works");
        entityClasses = imported.stream()
                .filter(jc -> jc.isAnnotatedWith(Entity.class))
                .map(JavaClass::reflect)
                .collect(Collectors.toList());
    }

    @Test
    void everyWorkspaceScopedEntityIsFilteredOrExplicitlyAllowListed() {
        Set<String> unaccounted = new TreeSet<>();
        for (Class<?> entity : entityClasses) {
            if (!hasWorkspaceColumn(entity)) {
                continue; // not tenant-scoped by the workspace_id column → not this rule's concern
            }
            String name = entity.getSimpleName();
            boolean filtered = isFiltered(entity);
            boolean allowListed = GLOBAL_BY_DESIGN.contains(name) || PENDING_FILTER.contains(name);
            if (!filtered && !allowListed) {
                unaccounted.add(name);
            }
        }
        assertThat(unaccounted)
                .as("Every @Entity with a workspace_id column must apply "
                        + "@Filter(name=\"%s\") or be on GLOBAL_BY_DESIGN / PENDING_FILTER. "
                        + "These slipped through and are cross-tenant-leak-capable — either annotate "
                        + "them with the central filter or, if global by design, add them to the "
                        + "allow-list with rationale.", WorkspaceFilterActivator.FILTER_NAME)
                .isEmpty();
    }

    @Test
    void globalByDesignEntitiesAreNeverFiltered() {
        // A global entity that somehow gained @Filter would be silently over-scoped to empty results.
        Set<String> wronglyFiltered = entityClasses.stream()
                .filter(e -> GLOBAL_BY_DESIGN.contains(e.getSimpleName()))
                .filter(TenantFilterCoverageTest::isFiltered)
                .map(Class::getSimpleName)
                .collect(Collectors.toCollection(TreeSet::new));
        assertThat(wronglyFiltered)
                .as("global-by-design entities must NOT carry the central tenant filter "
                        + "(it would over-filter them to empty); remove @Filter or reclassify")
                .isEmpty();
    }

    @Test
    void pendingFilterEntriesAreStillUnfiltered_soTheListStaysHonest() {
        // The moment an entity is annotated it must leave PENDING_FILTER, or the list rots into a
        // rubber-stamp. This fails if a now-filtered entity is still parked on the pending list.
        Set<String> filteredButStillPending = entityClasses.stream()
                .filter(e -> PENDING_FILTER.contains(e.getSimpleName()))
                .filter(TenantFilterCoverageTest::isFiltered)
                .map(Class::getSimpleName)
                .collect(Collectors.toCollection(TreeSet::new));
        assertThat(filteredButStillPending)
                .as("these entities now carry @Filter — remove them from PENDING_FILTER so the "
                        + "allow-list keeps shrinking toward empty (full enforcement)")
                .isEmpty();
    }

    @Test
    void projectProofOfConceptIsFiltered() {
        // Sanity anchor: the PoC entity is detected as workspace-scoped AND filtered, proving the
        // detector and the @Filter recognition both work end to end.
        assertThat(hasWorkspaceColumn(Project.class)).isTrue();
        assertThat(isFiltered(Project.class)).isTrue();
        assertThat(GLOBAL_BY_DESIGN).doesNotContain("Project");
        assertThat(PENDING_FILTER).doesNotContain("Project");
    }

    /**
     * The complete closure (Slices B+C): <b>every</b> {@code @Entity} — whether it scopes directly via a
     * {@code workspace_id} column or transitively via a subquery condition — must carry the central
     * {@code @Filter} or be explicitly {@link #GLOBAL_BY_DESIGN}. This subsumes
     * {@link #everyWorkspaceScopedEntityIsFilteredOrExplicitlyAllowListed()} and additionally catches
     * the transitive entities (no {@code workspace_id} column of their own) that the column detector
     * cannot see — so a new tenant-scoped child table cannot be added without either a filter or a
     * reviewed global-by-design decision.
     */
    @Test
    void everyEntityIsFilteredOrGloballyAllowListed() {
        Set<String> unaccounted = new TreeSet<>();
        for (Class<?> entity : entityClasses) {
            String name = entity.getSimpleName();
            if (isFiltered(entity) || GLOBAL_BY_DESIGN.contains(name) || PENDING_FILTER.contains(name)) {
                continue;
            }
            unaccounted.add(name);
        }
        assertThat(unaccounted)
                .as("Every @Entity must apply @Filter(name=\"%s\") — directly (workspace_id = :workspaceId) "
                        + "or transitively (a SELECT ... :workspaceId subquery on a parent FK) — or be on "
                        + "GLOBAL_BY_DESIGN with rationale. These are unaccounted and cross-tenant-leak-"
                        + "capable once the binding flag is enabled.", WorkspaceFilterActivator.FILTER_NAME)
                .isEmpty();
    }

    /**
     * A transitive entity (no {@code workspace_id} column) must scope through a {@code SELECT ... :workspaceId}
     * subquery — a bare {@code workspace_id = :workspaceId} condition would reference a non-existent column
     * and fail at query time the moment the filter is enabled. This pins the subquery shape established in
     * Slices B+C.
     */
    @Test
    void transitiveEntitiesScopeViaSubqueryNotDirectColumn() {
        Set<String> wrong = new TreeSet<>();
        for (Class<?> entity : entityClasses) {
            if (!isFiltered(entity) || hasWorkspaceColumn(entity)) {
                continue; // only filtered entities WITHOUT their own workspace_id column
            }
            String cond = filterCondition(entity);
            boolean ok = cond != null
                    && cond.toLowerCase().contains("select")
                    && cond.contains(":workspaceId");
            if (!ok) {
                wrong.add(entity.getSimpleName() + " -> " + cond);
            }
        }
        assertThat(wrong)
                .as("transitive (no workspace_id column) entities must scope via a SELECT ... :workspaceId "
                        + "subquery in @Filter.condition; a bare workspace_id predicate would fail at runtime")
                .isEmpty();
    }

    /** True iff the entity (or a superclass) maps a field to the column named exactly {@code workspace_id}. */
    private static boolean hasWorkspaceColumn(Class<?> entity) {
        for (Class<?> c = entity; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                Column col = f.getAnnotation(Column.class);
                if (col != null && WORKSPACE_COLUMN.equalsIgnoreCase(col.name())) {
                    return true;
                }
                // Implicit mapping: a field named workspaceId with no overriding @Column(name=...).
                if ("workspaceId".equals(f.getName())
                        && (col == null || col.name() == null || col.name().isBlank())) {
                    return true;
                }
            }
        }
        return false;
    }

    /** True iff the entity applies the central {@code workspaceFilter} via {@code @Filter}. */
    private static boolean isFiltered(Class<?> entity) {
        return filterCondition(entity) != null;
    }

    /** The central {@code workspaceFilter} condition string for the entity (or a superclass), else null. */
    private static String filterCondition(Class<?> entity) {
        for (Class<?> c = entity; c != null && c != Object.class; c = c.getSuperclass()) {
            Filter filter = c.getAnnotation(Filter.class);
            if (filter != null && WorkspaceFilterActivator.FILTER_NAME.equals(filter.name())) {
                return filter.condition();
            }
        }
        return null;
    }
}
