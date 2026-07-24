/**
 * The published surface of the shared module (EPIC-03 Phase 2 / W2, GH-537).
 *
 * <p>Types here are the only ones another module may depend on; everything else in
 * {@code com.bcits.works.shared} is internal to it, and
 * {@code ArchitectureTest.crossModuleAccessGoesThroughApi} enforces that.
 */
package com.bcits.works.shared.api;
