import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const frontendSrc = path.join(root, 'works-frontend', 'src');

const budgets = {
  minPageLayoutViews: 17,
  maxRawButtonsInViews: 183,
  maxRawTablesInViews: 14,
  minStoryFiles: 31,
  minComponentTestFiles: 97,
};

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage'].includes(entry.name)) walk(absolute, acc);
    } else {
      acc.push(absolute);
    }
  }
  return acc;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const allSrcFiles = walk(frontendSrc);
const viewFiles = allSrcFiles.filter((file) =>
  file.includes(`${path.sep}views${path.sep}`) &&
  /\.jsx$/.test(file) &&
  !/\.test\.jsx$/.test(file) &&
  !/\.stories\.jsx$/.test(file)
);
const componentFiles = allSrcFiles.filter((file) =>
  file.includes(`${path.sep}components${path.sep}`) &&
  /\.(js|jsx)$/.test(file)
);
const storyFiles = componentFiles.filter((file) => /\.stories\.jsx$/.test(file));
const componentTestFiles = componentFiles.filter((file) => /\.test\.jsx$/.test(file));

const viewContents = viewFiles.map((file) => read(rel(file)));
const pageLayoutViews = viewContents.filter((content) => content.includes('PageLayout')).length;
const rawButtonsInViews = viewContents.reduce((sum, content) => sum + countMatches(content, /<button\b/g), 0);
const rawTablesInViews = viewContents.reduce((sum, content) => sum + countMatches(content, /<table\b/g), 0);

const checks = [
  {
    name: 'PageLayout adoption',
    pass: pageLayoutViews >= budgets.minPageLayoutViews,
    detail: `${pageLayoutViews}/${viewFiles.length} view files use PageLayout; floor is ${budgets.minPageLayoutViews}`,
  },
  {
    name: 'Raw view buttons budget',
    pass: rawButtonsInViews <= budgets.maxRawButtonsInViews,
    detail: `${rawButtonsInViews} raw <button> tags in views; ceiling is ${budgets.maxRawButtonsInViews}`,
  },
  {
    name: 'Raw view tables budget',
    pass: rawTablesInViews <= budgets.maxRawTablesInViews,
    detail: `${rawTablesInViews} raw <table> tags in views; ceiling is ${budgets.maxRawTablesInViews}`,
  },
  {
    name: 'Story coverage floor',
    pass: storyFiles.length >= budgets.minStoryFiles,
    detail: `${storyFiles.length} component story files; floor is ${budgets.minStoryFiles}`,
  },
  {
    name: 'Component test floor',
    pass: componentTestFiles.length >= budgets.minComponentTestFiles,
    detail: `${componentTestFiles.length} component test files; floor is ${budgets.minComponentTestFiles}`,
  },
  {
    name: 'Board virtualization',
    pass:
      fs.existsSync(path.join(frontendSrc, 'components', 'works', 'organisms', 'virtual-card-stack.jsx')) &&
      read('works-frontend/src/views/board-view.jsx').includes('VirtualCardStack') &&
      read('works-frontend/src/components/works/organisms/sprint-board.jsx').includes('VirtualCardStack'),
    detail: 'VirtualCardStack must exist and be used by board and sprint board surfaces',
  },
  {
    name: 'Semantic typography tokens',
    pass:
      read('works-frontend/tailwind.config.js').includes('display:') &&
      read('works-frontend/tailwind.config.js').includes("'3xs'") &&
      read('works-frontend/src/index.css').includes('@utility text-display') &&
      read('works-frontend/src/index.css').includes('@utility text-3xs'),
    detail: 'Tailwind config and CSS utilities must expose semantic typography and text-3xs',
  },
];

let failed = false;
for (const check of checks) {
  const marker = check.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${check.name}: ${check.detail}`);
  if (!check.pass) failed = true;
}

if (failed) {
  console.error('\nUI/UX Premium Bar failed. Improve the implementation or update budgets only with an intentional migration note.');
  process.exit(1);
}
