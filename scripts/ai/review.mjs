#!/usr/bin/env node
// npm run ai:review [-- --model <alias>] [-- --dry-run]
//
// Claude reads .ai/prompts/reviewer.md, inspects `git diff` itself, and
// writes .ai/REVIEW.md. Claude does not fix code here.
import { join } from 'node:path';
import {
  PROMPTS_DIR,
  REVIEW_FILE,
  commandExists,
  fixCycle,
  parseArgs,
  readText,
  reviewFinal,
  CLAUDE_DEFAULT_MODEL,
  checksFreshness,
  runAgent,
  timeoutMs,
  section,
  setField,
  writeText,
} from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['dry-run']);

const checks = checksFreshness();
const reviewerPrompt =
  readText(join(PROMPTS_DIR, 'reviewer.md')) +
  `
CHECKS_STATUS: ${checks} (computed by the script; STALE = code changed after the checks ran)
`;

const model = flags.model ?? CLAUDE_DEFAULT_MODEL;
// Prompt goes on stdin, not argv (see runAgent).
const claudeArgs = [
  '-p',
  '--model',
  model,
  '--permission-mode',
  'acceptEdits',
  '--allowedTools',
  'Read Glob Grep Write Edit Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*)',
];

section('ai:review');

if (flags['dry-run']) {
  console.log('--dry-run: not invoking claude. Composed invocation:');
  console.log(`claude ${claudeArgs.join(' ')}   < prompt on stdin (${reviewerPrompt.length} chars)`);
  console.log(`model=${model}`);
  process.exit(0);
}

if (!commandExists('claude')) {
  console.error('`claude` CLI not found on PATH. Install/authenticate Claude Code first.');
  process.exit(1);
}

// Deterministically preserve the fix-cycle counter: ai:fix owns incrementing
// it, the reviewer prompt is only *told* not to touch it. Belt and suspenders.
const cycleBefore = fixCycle();

const result = await runAgent({
  label: 'ai:review',
  cmd: 'claude',
  args: claudeArgs,
  input: reviewerPrompt,
  model,
  timeoutMs: timeoutMs(flags, 15),
});
if (result.code !== 0) {
  console.error(`claude review failed (exit ${result.code}${result.timedOut ? ', timed out' : ''}). .ai/REVIEW.md may be incomplete.`);
  process.exit(result.code || 1);
}

const reviewed = readText(REVIEW_FILE);
writeText(REVIEW_FILE, setField(reviewed, 'FIX CYCLE', `${cycleBefore}/2`));

section('Result');
let final = reviewFinal();
// Deterministic guard: never approve on results that predate the current code.
if (final === 'APPROVED' && checks === 'STALE') {
  writeText(REVIEW_FILE, setField(readText(REVIEW_FILE), 'FINAL', 'VALIDATION_REQUIRED'));
  final = 'VALIDATION_REQUIRED';
  console.log('CHECKS.md is STALE (code changed after the checks ran): downgraded APPROVED -> VALIDATION_REQUIRED.');
}
console.log(`.ai/REVIEW.md FINAL: ${final ?? '(unknown)'}`);
if (final === 'APPROVED') {
  console.log('Next: human review, then commit.');
} else if (final === 'VALIDATION_REQUIRED') {
  console.log('Next: no code defect found — run the missing validation named in .ai/REVIEW.md (e.g. npm run ai:check:full), then npm run ai:review. Do NOT run ai:fix.');
} else if (cycleBefore >= 2) {
  console.log('Fix-cycle limit already reached — do not run ai:fix again. Human review needed.');
} else {
  console.log(`Next: npm run ai:fix (cycle ${cycleBefore}/2 used so far)`);
}
