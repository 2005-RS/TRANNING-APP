#!/usr/bin/env node
// npm run ai:check:full [-- --e2e] [-- --api-generate] [-- --side backend|frontend]
//
// Pre-approval gate: lint + test + build on both sides by default (matches
// the existing docs/frontend/quality-gates.md "global gate" convention — it
// is not diff-scoped). No AI calls.
//
// --e2e also runs each side's E2E suite. Slower; backend E2E needs Docker
// (Postgres/MinIO) already running (see backend/README.md); frontend E2E
// builds its own preview server.
//
// --api-generate runs `npm run api:generate` in frontend/ first. It requires
// the backend running locally on the port configured in frontend/.env
// (see docs/frontend/local-environment.md) and is guarded/verified by that
// script itself — this wrapper does not duplicate that guard.
import { parseArgs, recordChecks, run, section } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['e2e', 'api-generate']);

const sides = flags.side
  ? { backend: flags.side === 'backend', frontend: flags.side === 'frontend' }
  : { backend: true, frontend: true };

section('ai:check:full (lint + test + build)');
console.log(`backend:  ${sides.backend ? 'checking' : 'skipped'}`);
console.log(`frontend: ${sides.frontend ? 'checking' : 'skipped'}`);
if (flags.e2e) console.log('E2E: included (slower)');
if (flags['api-generate']) console.log('api:generate: included (needs backend running)');

const results = [];

function checkSide(name, steps) {
  for (const [stepName, cmd, args] of steps) {
    section(`${name} ${stepName}`);
    const code = run(cmd, args);
    results.push([`${name} ${stepName}`, code]);
    if (code !== 0) break; // no point running build after a failing test on the same side
  }
}

if (sides.frontend && flags['api-generate']) {
  section('frontend api:generate');
  results.push(['frontend api:generate', run('npm', ['--prefix', 'frontend', 'run', 'api:generate'])]);
}

if (sides.backend) {
  const steps = [
    ['lint', 'npm', ['--prefix', 'backend', 'run', 'lint']],
    ['test', 'npm', ['--prefix', 'backend', 'run', 'test']],
    ['build', 'npm', ['--prefix', 'backend', 'run', 'build']],
  ];
  if (flags.e2e) steps.push(['test:e2e', 'npm', ['--prefix', 'backend', 'run', 'test:e2e']]);
  checkSide('backend', steps);
}

if (sides.frontend) {
  const steps = [
    ['lint', 'npm', ['--prefix', 'frontend', 'run', 'lint']],
    ['test', 'npm', ['--prefix', 'frontend', 'run', 'test']],
    ['build', 'npm', ['--prefix', 'frontend', 'run', 'build']],
  ];
  if (flags.e2e) steps.push(['test:e2e', 'npm', ['--prefix', 'frontend', 'run', 'test:e2e']]);
  checkSide('frontend', steps);
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
