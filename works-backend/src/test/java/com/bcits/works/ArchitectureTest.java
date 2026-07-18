package com.bcits.works;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

/**
 * Architecture boundary gate.
 *
 * <p>This is the enforcement seam called for by RB-10 §2 and
 * {@code docs/architecture/ADR-0001-service-decomposition.md}: it keeps bSmart Works on the path to
 * extractable, independently-reusable services by failing CI when the agreed boundaries are broken.
 *
 * <p>Today it enforces the layering invariants that already hold across the codebase, plus a
 * forward-ready guard against cyclic coupling between module packages. As each domain is carved into
 * its own package — <b>Identity first</b> (ADR-0001 §7) — its package-boundary rule is added here.
 *
 * <p>Runs as a pure unit test: static bytecode analysis only, so it needs no Spring context and no
 * database. Tagged {@code "unit"} so it runs in the {@code backend-unit-test} CI job.
 */
@Tag("unit")
class ArchitectureTest {

    private static final Path MODULE_ROOT = Path.of("src/main/java/com/bcits/works");
    private static final List<String> MODULE_PACKAGES = List.of(
            "auth",
            "workspaces",
            "workitems",
            "projects",
            "messaging",
            "devsync",
            "ai",
            "knowledge",
            "service",
            "sla",
            "reporting",
            "automation",
            "security",
            "shared");

    private static JavaClasses appClasses;

    @BeforeAll
    static void importProductionClasses() {
        appClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.bcits.works");
    }

    @Test
    void canonicalModulePackageMarkersExist() {
        List<String> missing = MODULE_PACKAGES.stream()
                .filter(module -> !Files.exists(MODULE_ROOT.resolve(module).resolve("package-info.java")))
                .toList();
        assertThat(missing)
                .as("every roadmap module must have a package marker before code moves into it")
                .isEmpty();
    }

    @Test
    void domainCarveIsNonVacuousAndFlatRootCannotRegress() throws IOException {
        Map<String, Long> classesByModule = appClasses.stream()
                .filter(javaClass -> javaClass.getPackageName().startsWith("com.bcits.works."))
                .collect(Collectors.groupingBy(javaClass ->
                                javaClass.getPackageName().substring("com.bcits.works.".length()).split("\\.")[0],
                        Collectors.counting()));

        assertThat(MODULE_PACKAGES)
                .as("every declared module must own production classes so the cycle gate is non-vacuous")
                .allSatisfy(module -> assertThat(classesByModule.getOrDefault(module, 0L))
                        .as("production classes in module %s", module)
                        .isPositive());

        final long flatRootSourceFiles;
        try (var files = Files.list(MODULE_ROOT)) {
            flatRootSourceFiles = files
                    .filter(path -> path.getFileName().toString().endsWith(".java"))
                    .filter(path -> !path.getFileName().toString().equals("package-info.java"))
                    .count();
        }
        assertThat(flatRootSourceFiles)
                .as("the flat root is a temporary composition layer and must never grow again")
                .isLessThanOrEqualTo(72);
    }

    @Test
    void modulePackagesDoNotCaseCollideWithTopLevelClasses() throws IOException {
        // Regression guard (#243 boot failure): a sub-package whose name matches a top-level class
        // name case-insensitively (e.g. package `project` vs class `Project.java`) makes the JVM
        // resolve the package to that class on a case-insensitive filesystem (Windows/macOS) ->
        // "wrong name" ClassNotFoundException -> entityManagerFactory init aborts -> the whole app
        // fails to start, while staying green on case-sensitive Linux CI. Never reintroduce one.
        final List<String> subPackages;
        final List<String> topLevelClasses;
        try (var dirs = Files.list(MODULE_ROOT)) {
            subPackages = dirs.filter(Files::isDirectory)
                    .filter(d -> Files.exists(d.resolve("package-info.java")))
                    .map(d -> d.getFileName().toString())
                    .toList();
        }
        try (var files = Files.list(MODULE_ROOT)) {
            topLevelClasses = files
                    .map(p -> p.getFileName().toString())
                    .filter(n -> n.endsWith(".java") && !n.equals("package-info.java"))
                    .map(n -> n.substring(0, n.length() - ".java".length()))
                    .toList();
        }
        List<String> collisions = subPackages.stream()
                .filter(pkg -> topLevelClasses.stream().anyMatch(cls -> cls.equalsIgnoreCase(pkg)))
                .toList();
        assertThat(collisions)
                .as("no sub-package may case-collide with a top-level class (case-insensitive-FS boot failure, #243)")
                .isEmpty();
    }

    @Test
    void servicesDoNotDependOnControllers() {
        noClasses().that().haveSimpleNameEndingWith("Service")
                .should().dependOnClassesThat().haveSimpleNameEndingWith("Controller")
                .because("business logic must not depend on the HTTP layer (RB-10 §2 layering)")
                .check(appClasses);
    }

    @Test
    void repositoriesDoNotDependOnControllers() {
        noClasses().that().haveSimpleNameEndingWith("Repository")
                .should().dependOnClassesThat().haveSimpleNameEndingWith("Controller")
                .because("the data-access layer must not depend on the HTTP layer (RB-10 §2)")
                .check(appClasses);
    }

    @Test
    void repositoriesDoNotDependOnServices() {
        noClasses().that().haveSimpleNameEndingWith("Repository")
                .should().dependOnClassesThat().haveSimpleNameEndingWith("Service")
                .because("the data-access layer must not depend on the business layer (RB-10 §2)")
                .check(appClasses);
    }

    @Test
    void eventAndAuditLayerDoNotDependOnPiiEntities() {
        // RB-40 §3 rule 1 (EPIC-P1-pii-vault Slice 4d): the append-only event log and the immutable
        // audit chain must carry only opaque ids/tokens — never raw personal data, which crypto-shred
        // cannot reach once written. Structurally forbid the event/audit-writing layer from depending on
        // the PII-carrying identity entities, so a future change cannot serialize a name/email into an
        // immutable record without failing the build. The grep guardrail (scripts/guardrails.sh) backs
        // this at the call-site level; this is the structural backstop.
        noClasses().that().haveSimpleName("EventService")
                .or().haveSimpleName("AppEvent")
                .or().haveSimpleName("SecurityAuditLogService")
                .should().dependOnClassesThat().haveSimpleName("User")
                .orShould().dependOnClassesThat().haveSimpleName("CustomerUser")
                .orShould().dependOnClassesThat().haveSimpleName("Stakeholder")
                .because("the immutable event log + audit chain must carry only ids/tokens, never raw PII (RB-40 §3 rule 1)")
                .check(appClasses);
    }

    @Test
    void modulePackagesAreFreeOfCycles() {
        // Forward-ready: as domains are carved into com.bcits.works.<module> packages (Identity
        // first — ADR-0001 §7), this fails the build on any cyclic dependency between modules.
        slices().matching("com.bcits.works.(*)..")
                .should().beFreeOfCycles()
                .because("modules must stay acyclic so they remain independently extractable (ADR-0001)")
                .check(appClasses);
    }

    @Test
    void sharedKernelDoesNotDependOnDomainModules() {
        // The kernel may be depended on by every module but must never point back into one.
        // References to the flat root package are tolerated only until the domain carve empties it
        // (EPIC-03 Phase 2 §3) — this rule locks the direction against the carved modules.
        List<String> domainModules = MODULE_PACKAGES.stream()
                .filter(p -> !p.equals("shared"))
                .map(p -> "com.bcits.works." + p + "..")
                .toList();
        noClasses().that().resideInAPackage("com.bcits.works.shared..")
                .should().dependOnClassesThat().resideInAnyPackage(domainModules.toArray(String[]::new))
                .because("shared is the kernel: everything may depend on it; it depends on no domain module (EPIC-03 Phase 2 §2)")
                .check(appClasses);
    }
}
