package com.bcits.works;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

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
            "workspace",
            "workitem",
            "project",
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
    void modulePackagesAreFreeOfCycles() {
        // Forward-ready: as domains are carved into com.bcits.works.<module> packages (Identity
        // first — ADR-0001 §7), this fails the build on any cyclic dependency between modules.
        slices().matching("com.bcits.works.(*)..")
                .should().beFreeOfCycles()
                .because("modules must stay acyclic so they remain independently extractable (ADR-0001)")
                .check(appClasses);
    }
}
