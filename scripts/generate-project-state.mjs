#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUTPUT = join(ROOT, 'ai-rules/current-state.generated.json');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const match = (text, regex, label) => {
  const result = text.match(regex);
  if (!result) throw new Error(`Unable to derive ${label}`);
  return result[1];
};

const pom = read('works-backend/pom.xml');
const frontend = JSON.parse(read('works-frontend/package.json'));
const javaRoot = join(ROOT, 'works-backend/src/main/java/com/bcits/works');
const migrationRoot = join(ROOT, 'works-backend/src/main/resources/db/migration');
const migrations = readdirSync(migrationRoot)
  .map((name) => name.match(/^V(\d+)__/))
  .filter(Boolean)
  .map((result) => Number(result[1]));
const flywayHighWater = Math.max(...migrations);
const domainPackages = readdirSync(javaRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const sourceDigest = createHash('sha256')
  .update(pom)
  .update(JSON.stringify(frontend))
  .update(domainPackages.join('\n'))
  .update(migrations.sort((a, b) => a - b).join('\n'))
  .digest('hex');

const state = {
  schemaVersion: 1,
  sourceDigest,
  backend: {
    java: match(pom, /<java\.version>([^<]+)<\/java\.version>/, 'Java version'),
    springBoot: match(
      pom,
      /<parent>[\s\S]*?<artifactId>spring-boot-starter-parent<\/artifactId>[\s\S]*?<version>([^<]+)<\/version>/,
      'Spring Boot version',
    ),
    buildTool: 'Maven',
    basePackage: 'com.bcits.works',
    domainPackages,
  },
  frontend: {
    react: frontend.dependencies?.react?.replace(/^[^0-9]*/, ''),
    vite: frontend.devDependencies?.vite?.replace(/^[^0-9]*/, ''),
    language: 'JavaScript/JSX',
  },
  database: {
    engine: 'PostgreSQL',
    migrationTool: 'Flyway',
    flywayHighWater,
    nextMigration: flywayHighWater + 1,
  },
  generatedFrom: [
    'works-backend/pom.xml',
    'works-frontend/package.json',
    'works-backend/src/main/java/com/bcits/works/',
    'works-backend/src/main/resources/db/migration/',
  ],
};

const expected = `${JSON.stringify(state, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  if (current !== expected) {
    console.error('STALE — run `node scripts/generate-project-state.mjs` and commit the result.');
    process.exit(1);
  }
  console.log('OK — generated project state matches executable repository facts.');
} else {
  writeFileSync(OUTPUT, expected);
  console.log('wrote ai-rules/current-state.generated.json');
}
