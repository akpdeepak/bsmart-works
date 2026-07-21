#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const path = process.env.BSMART_ARTIFACT_PATH;
const expected = process.env.BSMART_ARTIFACT_SHA256;
if (!path || !expected) {
  console.error('BSMART_ARTIFACT_PATH and BSMART_ARTIFACT_SHA256 are required for release verification.');
  process.exit(1);
}
if (!existsSync(path)) {
  console.error(`Artifact does not exist: ${path}`);
  process.exit(1);
}
const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
if (actual !== expected.toLowerCase()) {
  console.error(`Artifact checksum mismatch: expected ${expected}, got ${actual}`);
  process.exit(1);
}
console.log(`OK — verified immutable artifact checksum ${actual}.`);
