#!/usr/bin/env node
// npm run ai:fix [-- --model <alias>] [-- --reasoning medium|high|xhigh] [-- --dry-run]
//
// Codex reads .ai/CURRENT_TASK.md and .ai/REVIEW.md and fixes BLOCKER /
// IMPORTANT findings. Hard-capped at 2 automatic cycles per task — after
// that this script refuses to run and asks for a human.
import { join } from 'node:path';
import {
  CODEX_EXEC_BASE_ARGS,
  DEFAULT_CODEX_MODEL,
  PROMPTS_DIR,
  FIX_CYCLE_LIMIT,
  commandExists,
  currentHead,
  fixCycle,
  gitStatusShort,
  parseArgs,
  resolveReasoning,
  readText,
  runAgent,
  timeoutMs,
  section,
  setField,
  warnIfHeadMoved,
  writeText,
  REVIEW_FILE,
} from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['dry-run']);

const cycle = fixCycle();
if (cycle >= FIX_CYCLE_LIMIT) {
  console.error(`STOP — .ai/REVIEW.md already recorded ${cycle}/${FIX_CYCLE_LIMIT} automatic fix cycles.`);
  console.error('This is the hard cap for this task. Request human review instead of running ai:fix again.');
  process.exit(1);
}

const fixerPrompt = readText(join(PROMPTS_DIR, 'fixer.md'));
// cwd is already the repo root (runAgent), so no -C. The prompt is read from
// stdin via the trailing `-`, which must stay the last argument.
const codexArgs = [...CODEX_EXEC_BASE_ARGS];
const model = flags.model ?? DEFAULT_CODEX_MODEL;
const reasoning = resolveReasoning(flags, 'fix');
codexArgs.push('--model', model);
codexArgs.push('-c', `model_reasoning_effort=${reasoning}`);
codexArgs.push('-');

section('ai:fix');
console.log(`Fix cycle ${cycle + 1}/${FIX_CYCLE_LIMIT}`);
console.log(`model=${model} reasoning=${reasoning}`);

if (flags['dry-run']) {
  console.log('\n--dry-run: not invoking codex. Composed invocation:');
  console.log(`codex ${codexArgs.join(' ')}   < prompt on stdin (${fixerPrompt.length} chars)`);
  process.exit(0);
}

if (!commandExists('codex')) {
  console.error('`codex` CLI not found on PATH. Install/authenticate Codex CLI first.');
  process.exit(1);
}

const before = currentHead();
const result = await runAgent({
  label: 'ai:fix',
  cmd: 'codex',
  args: codexArgs,
  input: fixerPrompt,
  model,
  timeoutMs: timeoutMs(flags, 30),
});
const exitCode = result.code;
warnIfHeadMoved(before, 'ai:fix');

// Deterministic bookkeeping: increment the cycle counter and mark the review
// pending again (the fix changed code; it hasn't been re-reviewed yet).
let review = readText(REVIEW_FILE);
review = setField(review, 'FIX CYCLE', `${cycle + 1}/${FIX_CYCLE_LIMIT}`);
review = setField(review, 'STATUS', 'REVIEW');
writeText(REVIEW_FILE, review);

section('Result');
console.log(gitStatusShort() || '(no working-tree changes)');
console.log(`\nFix cycle used: ${cycle + 1}/${FIX_CYCLE_LIMIT}`);
console.log('Next: npm run ai:review');
process.exit(exitCode);
