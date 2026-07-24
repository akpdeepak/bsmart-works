import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const results = [];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
}

function sameMembers(left, right) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const nav = await import(pathToFileURL(absolute('works-frontend/src/lib/nav-model.js')));
const routes = await import(pathToFileURL(absolute('works-frontend/src/lib/routes.js')));

const modeLabels = nav.MODES.map((mode) => mode.label);
const destinations = nav.navDestinations();
const destinationIds = destinations.map((destination) => destination.id);
const routeIds = Object.keys(routes.VIEW_PATHS);
const routeOutlet = read('works-frontend/src/app/routes/RouteOutlet.jsx');
const renderedViewIds = [...routeOutlet.matchAll(/view === '([^']+)'/g)].map((match) => match[1]);
const appShell = read('works-frontend/src/app/AppShell.jsx');
const sidebar = read('works-frontend/src/components/works/organisms/sidebar-nav.jsx');

check('Six-mode rail contract',
  JSON.stringify(modeLabels) === JSON.stringify(['Home', 'Deliver', 'Insight', 'Service', 'Know', 'Extend']) &&
    nav.MODES.length <= 8,
  `${nav.MODES.length} modes: ${modeLabels.join(', ')}`);

const unroutedDestinations = destinationIds.filter((id) => !routeIds.includes(id));
check('Every navigation destination has a deep link', unroutedDestinations.length === 0,
  unroutedDestinations.length ? `missing routes: ${unroutedDestinations.join(', ')}` : `${destinationIds.length} destinations route cleanly`);

const routeOutletMismatch = !sameMembers(renderedViewIds, routeIds);
check('Rendered views and route map stay synchronized', !routeOutletMismatch,
  routeOutletMismatch ? 'RouteOutlet view ids differ from VIEW_PATHS' : `${routeIds.length} rendered views round-trip through VIEW_PATHS`);

const unreachableViews = renderedViewIds.filter((id) => id !== 'search' && !destinationIds.includes(id));
check('Every rendered feature is reachable',
  unreachableViews.length === 0 && appShell.includes("id: 'act-search-all'") && appShell.includes("navigate('search')"),
  unreachableViews.length ? `not in navigation: ${unreachableViews.join(', ')}` : 'rail, More, or command palette reaches every rendered feature');

const backendSurfaceSource = read('works-backend/src/main/java/com/bcits/works/shared/NavSurfaces.java');
const backendSurfaceIds = [...backendSurfaceSource.matchAll(/MIN_TIER\.put\("([^"]+)"/g)].map((match) => match[1]);
check('Frontend and backend visibility catalogues match', sameMembers(destinationIds, backendSurfaceIds),
  `${destinationIds.length} frontend destinations match ${backendSurfaceIds.length} server-authoritative surfaces`);

const localeCodes = ['en', 'hi', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar', 'ko'];
const navigationKeys = [
  ...nav.MODES.map((mode) => mode.labelKey),
  ...destinations.map((destination) => destination.labelKey),
  'nav.more',
];
const missingLocaleKeys = [];
for (const code of localeCodes) {
  const messages = (await import(pathToFileURL(absolute(`works-frontend/src/lib/locales/${code}.js`)))).default;
  for (const key of navigationKeys) {
    if (!messages[key]) missingLocaleKeys.push(`${code}:${key}`);
  }
}
check('Navigation labels are localized', missingLocaleKeys.length === 0,
  missingLocaleKeys.length ? `missing: ${missingLocaleKeys.join(', ')}` : `${new Set(navigationKeys).size} keys present in all ${localeCodes.length} locales`);

check('More is a visible permission-aware path',
  appShell.includes('<MoreMenu') &&
    read('works-frontend/src/components/works/organisms/more-menu.jsx').includes('moreDestinations(visibility)') &&
    read('works-frontend/src/components/works/organisms/more-menu.test.jsx').includes('navigates in two clicks'),
  'production shell and behavior tests expose off-rail destinations in two clicks');

check('Role-aware mode landing is active',
  appShell.includes('roleLandingForMode(m, activeLens?.id, visibility)') &&
    read('works-frontend/src/lib/nav-model.test.js').includes('uses the active role lens'),
  'mode selection uses the active role lens and remains regression-tested');

check('Breadcrumb orientation is rendered',
  appShell.includes('<ShellBreadcrumbs') &&
    read('works-frontend/src/components/works/organisms/shell-breadcrumbs.jsx').includes('breadcrumbTrail(view, entityLabel)') &&
    read('works-frontend/src/components/works/organisms/shell-breadcrumbs.test.jsx').includes('orients a More destination'),
  'the shell renders localized mode/surface/entity orientation');

check('Navigation accessibility is executable',
  read('works-frontend/src/components/works/organisms/navigation-shell.a11y.test.jsx')
    .includes('expectNoA11yViolations'),
  'the visible More and breadcrumb shell is covered by the shared axe gate');

check('One frontend navigation catalogue',
  !sidebar.includes('const NAV_SECTIONS') &&
    sidebar.includes('MODES') && sidebar.includes('visibleSurfaces') && sidebar.includes('moreDestinations'),
  'the legacy sidebar derives from nav-model instead of duplicating destination ids');

let failed = false;
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] EPIC 6 - ${result.name}: ${result.detail}`);
  if (!result.pass) failed = true;
}

if (failed) {
  console.error('\nEPIC 6 code completion gate failed. Fix production evidence before updating roadmap status.');
  process.exit(1);
}
