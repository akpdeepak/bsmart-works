/**
 * The published surface of the knowledge module (EPIC-03 Phase 2 / W2, GH-537).
 *
 * <p>Types here are the only ones another module may depend on; everything else in
 * {@code com.bcits.works.knowledge} is internal to it, and
 * {@code ArchitectureTest.crossModuleAccessGoesThroughApi} enforces that. Adding a type here
 * widens the module's contract — do it deliberately.
 */
package com.bcits.works.knowledge.api;
