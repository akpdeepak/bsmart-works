import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendRoot = path.join(root, 'works-backend', 'src', 'main', 'java', 'com', 'bcits', 'works');
const frontendRoot = path.join(root, 'works-frontend', 'src');

const failures = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', 'storybook-static'].includes(entry.name)) {
        walk(absolute, predicate, acc);
      }
    } else if (!predicate || predicate(absolute)) {
      acc.push(absolute);
    }
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function extractMappingArgs(args) {
  if (!args || !args.trim()) return [''];
  const matches = [...args.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  return matches.length > 0 ? matches : [''];
}

function normalizeRoute(route) {
  let normalized = route
    .replace(/\\/g, '/')
    .replace(/^\/api\/v1/, '')
    .replace(/\$\{[^}]+}/g, ':param')
    .replace(/\{[^}/]+}/g, ':param')
    .replace(/:param(?![/?#])/g, ':param')
    .replace(/([^/]):param$/g, '$1')
    .replace(/[?#].*$/, '')
    .replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (normalized.length > 1) normalized = normalized.replace(/\/$/, '');
  return normalized;
}

function routeMatches(frontendRoute, backendRoute) {
  const fp = normalizeRoute(frontendRoute).split('/').filter(Boolean);
  const bp = normalizeRoute(backendRoute).split('/').filter(Boolean);
  if (fp.length !== bp.length) return false;
  return fp.every((part, index) => part === bp[index] || part === ':param' || bp[index] === ':param');
}

function extractBackendRoutes() {
  const routes = new Set();
  const files = walk(backendRoot, (file) => file.endsWith('Controller.java'));
  for (const file of files) {
    const source = read(file);
    const classMatch = source.match(/@RequestMapping\s*\(([^)]*)\)\s*(?:public\s+)?class\s+\w+/s);
    const classPaths = extractMappingArgs(classMatch?.[1] || '');
    const methodRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*(?:\(([^)]*)\))?/g;
    for (const methodMatch of source.matchAll(methodRegex)) {
      for (const base of classPaths) {
        for (const suffix of extractMappingArgs(methodMatch[2] || '')) {
          routes.add(normalizeRoute(`${base}/${suffix}`));
        }
      }
    }
  }
  return routes;
}

function extractFrontendApiCalls() {
  const calls = [];
  const files = walk(frontendRoot, (file) =>
    /\.(js|jsx)$/.test(file) && !/(\.test|\.stories|\.a11y\.test)\.(js|jsx)$/.test(file)
  );
  const callRegex = /\bapi\.(?:raw|send)\s*\(\s*([`'"])([\s\S]*?)\1/g;
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(callRegex)) {
      const literal = match[2];
      if (!literal.startsWith('/')) continue;
      if (literal.startsWith('/${')) continue;
      if (literal.includes('${') && !literal.includes('/${')) continue;
      const before = source.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      calls.push({ file: rel(file), line, route: normalizeRoute(literal) });
    }
  }
  return calls;
}

function checkApiContract() {
  const backendRoutes = extractBackendRoutes();
  const frontendCalls = extractFrontendApiCalls();
  const missing = frontendCalls.filter((call) =>
    ![...backendRoutes].some((backendRoute) => routeMatches(call.route, backendRoute))
  );
  if (missing.length > 0) {
    failures.push([
      'Frontend API contract drift',
      'Every static api.raw/api.send route must match a backend controller mapping.',
      missing.map((call) => `${call.file}:${call.line} ${call.route}`).join('\n'),
    ]);
  }
}

function checkAiFallbackVisibility() {
  const required = [
    {
      file: 'works-frontend/src/views/admin-ops-view.jsx',
      tokens: ['fallbacks', 'fallback', 'AiCostTab'],
    },
    {
      file: 'works-frontend/src/components/works/organisms/ai-settings-panel.jsx',
      tokens: ['fallbackUsed', 'AI usage audit', 'What runs when AI is off'],
    },
    {
      file: 'works-frontend/src/lib/adminOps.js',
      tokens: ['/admin/ai-cost'],
    },
    {
      file: 'works-frontend/src/lib/ai.js',
      tokens: ['/ai/invocations'],
    },
  ];
  const missing = [];
  for (const item of required) {
    const absolute = path.join(root, item.file);
    const source = fs.existsSync(absolute) ? read(absolute) : '';
    for (const token of item.tokens) {
      if (!source.includes(token)) missing.push(`${item.file} missing "${token}"`);
    }
  }
  if (missing.length > 0) {
    failures.push([
      'AI fallback telemetry visibility',
      'Admin-facing surfaces must keep fallback rate and per-invocation fallback state visible.',
      missing.join('\n'),
    ]);
  }
}

function checkA11yHarness() {
  const a11yHelper = path.join(root, 'works-frontend', 'src', 'test', 'a11y.js');
  const a11yTests = walk(frontendRoot, (file) => /\.a11y\.test\.jsx$/.test(file));
  const helperSource = fs.existsSync(a11yHelper) ? read(a11yHelper) : '';
  const missing = [];
  if (!helperSource.includes('axe.run')) missing.push('works-frontend/src/test/a11y.js must run axe-core');
  if (a11yTests.length < 20) missing.push(`Expected at least 20 a11y test files, found ${a11yTests.length}`);
  if (missing.length > 0) {
    failures.push([
      'Automated accessibility harness',
      'Core screens need axe-backed a11y coverage before feature expansion.',
      missing.join('\n'),
    ]);
  }
}

checkApiContract();
checkAiFallbackVisibility();
checkA11yHarness();

if (failures.length > 0) {
  for (const [title, detail, evidence] of failures) {
    console.error(`\n[FAIL] ${title}\n${detail}\n${evidence}`);
  }
  process.exit(1);
}

console.log('[PASS] Frontend API routes match backend controller mappings.');
console.log('[PASS] AI fallback telemetry remains visible in admin surfaces.');
console.log('[PASS] Axe accessibility harness and coverage floor are present.');
