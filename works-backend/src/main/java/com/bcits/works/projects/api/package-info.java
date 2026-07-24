/**
 * The published surface of the projects module (EPIC-03 Phase 2 / W2, GH-537).
 *
 * <p>Types here are the only ones another module may depend on; everything else in
 * {@code com.bcits.works.projects} is internal to it, and
 * {@code ArchitectureTest.crossModuleAccessGoesThroughApi} enforces that. Adding a type here
 * widens the module's contract — do it deliberately.
 */
package com.bcits.works.projects.api;
