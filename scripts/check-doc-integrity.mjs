#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === '.md' ? [path] : [];
  });
}

const active = [
  ...markdownFiles(join(ROOT, 'ai-rules')).filter((path) => !path.endsWith('INSTALL-PROMPT.md')),
  join(ROOT, 'CONTRIBUTING.md'),
];
const failures = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of active) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].split('#')[0].trim().replace(/^<|>$/g, '');
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    const absolute = resolve(dirname(file), decodeURIComponent(target));
    if (!existsSync(absolute)) failures.push(`${relative(ROOT, file)} -> ${target}`);
  }
}
if (failures.length) {
  console.error(`BLOCK: active documentation has broken links:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK — ${active.length} active policy/contributor documents have no broken file links.`);
