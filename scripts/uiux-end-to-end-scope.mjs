import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

const checks = [
  {
    name: 'Visual source of truth',
    pass: exists('docs/VISUAL-SPEC.md') && read('docs/VISUAL-SPEC.md').includes('Typography') && read('docs/VISUAL-SPEC.md').includes('Premium Bar'),
    detail: 'docs/VISUAL-SPEC.md must define typography, iconography, imagery, motion, mobile, and Premium Bar rules',
  },
  {
    name: 'Premium coverage ledger',
    pass: exists('docs/PREMIUM-BAR-COVERAGE.md') && read('docs/PREMIUM-BAR-COVERAGE.md').includes('100%') && read('docs/PREMIUM-BAR-COVERAGE.md').includes('DoD Checklist'),
    detail: 'docs/PREMIUM-BAR-COVERAGE.md must declare coverage and PR DoD',
  },
  {
    name: 'Board swimlanes and bulk preview',
    pass: read('works-frontend/src/views/board-view.jsx').includes('groupItemsIntoLanes') &&
      read('works-frontend/src/components/works/organisms/bulk-edit-bar.jsx').includes('BulkPreviewModal'),
    detail: 'BoardView must group lanes and bulk edit must preview changes',
  },
  {
    name: 'Visual builders',
    pass: exists('works-frontend/src/components/works/organisms/widget-builder.jsx') &&
      exists('works-frontend/src/lib/bql-builder.js') &&
      read('works-frontend/src/views/settings3/workflow-settings.jsx').includes('transition') &&
      read('works-frontend/src/views/settings3/permissions-settings.jsx').includes('permission'),
    detail: 'Workflow, permission, chart/widget, and BQL visual builders must exist',
  },
  {
    name: 'Premium DataTable',
    pass: read('works-frontend/src/components/works/atoms/data-table.jsx').includes('onCellEdit') &&
      read('works-frontend/src/components/works/atoms/data-table.jsx').includes('moveColumn') &&
      read('works-frontend/src/components/works/atoms/data-table.jsx').includes('useVirtualList') &&
      read('works-frontend/src/components/works/atoms/data-table.test.jsx').includes('supports inline editable cells'),
    detail: 'DataTable must support virtualization, multi-sort/column ops, inline edit, and tests',
  },
  {
    name: 'Richer analytics',
    pass: read('works-frontend/src/components/works/organisms/pivot-chart.jsx').includes('heatmap') &&
      read('works-frontend/src/components/works/organisms/widget-builder.jsx').includes('preview') &&
      exists('works-frontend/src/components/works/organisms/pivot-chart.test.jsx'),
    detail: 'Analytics must include richer chart previews, heatmaps, and table fallback tests',
  },
  {
    name: 'Action layer and persisted surface state',
    pass: read('works-frontend/src/App.jsx').includes('paletteCommands') &&
      exists('works-frontend/src/lib/view-state.js') &&
      read('works-frontend/src/views/search-view.jsx').includes('Save search') &&
      read('works-frontend/src/lib/routes.js').includes('mergeRouteQueryState'),
    detail: 'Command palette action layer, breadcrumbs/query state, and view-state persistence must exist',
  },
  {
    name: 'Illustration, avatars, signature moments, help',
    pass: read('works-frontend/src/components/works/atoms/empty-state.jsx').includes('VARIANTS') &&
      read('works-frontend/src/components/works/atoms/avatar.jsx').includes('imageUrl') &&
      exists('works-frontend/src/components/works/atoms/success-check.jsx') &&
      exists('works-frontend/src/components/works/organisms/first-use-tour.jsx') &&
      exists('works-frontend/src/components/works/organisms/shortcuts-help.jsx'),
    detail: 'Imagery, avatar, success, shortcuts, and tour primitives must exist',
  },
  {
    name: 'Router, mobile baseline, and board virtualization',
    pass: read('works-frontend/src/App.jsx').includes('React.lazy') &&
      read('works-frontend/src/lib/routes.js').includes('VIEW_PATHS') &&
      read('works-frontend/src/views/board-view.jsx').includes('overflow-x-auto') &&
      read('works-frontend/src/components/works/organisms/virtual-card-stack.jsx').includes('useVirtualList'),
    detail: 'Deep-linkable route mapping, lazy views, responsive board scroll, and virtual card stack must exist',
  },
];

let failed = false;
for (const check of checks) {
  const marker = check.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${check.name}: ${check.detail}`);
  if (!check.pass) failed = true;
}

if (failed) {
  console.error('\nbSmart UIUX end-to-end scope validation failed.');
  process.exit(1);
}
