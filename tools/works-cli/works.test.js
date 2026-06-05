import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, pad } from './works.js';

test('parseArgs splits positionals from --flag value', () => {
  const [pos, flags] = parseArgs(['WRK-1', '--kind', 'commit', '--ref', 'abc123']);
  assert.deepEqual(pos, ['WRK-1']);
  assert.equal(flags.kind, 'commit');
  assert.equal(flags.ref, 'abc123');
});

test('parseArgs supports --flag=value and -m alias', () => {
  const [pos, flags] = parseArgs(['WRK-2', '--kind=branch', '-m', 'a message'], { m: 'message' });
  assert.deepEqual(pos, ['WRK-2']);
  assert.equal(flags.kind, 'branch');
  assert.equal(flags.message, 'a message');
});

test('parseArgs treats a lone flag as boolean true', () => {
  const [, flags] = parseArgs(['start', '--no-p0']);
  assert.equal(flags['no-p0'], true);
});

test('pad right-pads to width', () => {
  assert.equal(pad('x', 3), 'x  ');
});
