/**
 * The published surface of the workspaces module (EPIC-03 Phase 2 / W2, GH-537).
 *
 * <p>Types here are the only ones another module may depend on; everything else in
 * {@code com.bcits.works.workspaces} is internal to it, and
 * {@code ArchitectureTest.crossModuleAccessGoesThroughApi} enforces that. Adding a type here
 * widens the module's contract — do it deliberately.
 */
package com.bcits.works.workspaces.api;
