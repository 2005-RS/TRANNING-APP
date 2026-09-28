#!/usr/bin/env node
// npm run ai:check:fast [-- --all] [-- --side backend|frontend]
//
// Cheap, iterative check: lint only, scoped to whichever side(s) have
// uncommitted changes (or both, with --all). No AI calls.
import { changedSides, parseArgs, recordChecks, run, section } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['all']);

let sides;
if (flags.side) {
  sides = { backend: flags.side === 'backend', frontend: flags.side === 'frontend' };
} else {
  const changed = changedSides();
  const nothingChanged = !changed.backend && !changed.frontend;
  sides = flags.all || nothingChanged ? { backend: true, frontend: true } : changed;
}

section('ai:check:fast (lint only)');
console.log(`backend:  ${sides.backend ? 'checking' : 'skipped (no changes)'}`);
console.log(`frontend: ${sides.frontend ? 'checking' : 'skipped (no changes)'}`);

const results = [];
if (sides.backend) {
  section('backend lint');
  results.push(['backend lint', run('npm', ['--prefix', 'backend', 'run', 'lint'])]);
}
if (sides.frontend) {
  section('frontend lint');
  results.push(['frontend lint', run('npm', ['--prefix', 'frontend', 'run', 'lint'])]);
}

recordChecks(results);
section('Summary');
let failed = false;
for (const [name, code] of results) {
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
  if (code !== 0) failed = true;
}
if (!results.length) console.log('(nothing to check)');
process.exit(failed ? 1 : 0);
