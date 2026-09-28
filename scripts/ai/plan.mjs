#!/usr/bin/env node
// npm run ai:plan -- "<task description>" [--model <alias>] [--dry-run]
//
// Claude reads .ai/prompts/architect.md and writes .ai/CURRENT_TASK.md.
// Claude does not implement here - see scripts/ai/implement.mjs for that.
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHECKS_FILE,
  PROMPTS_DIR,
  REVIEW_FILE,
  REVIEW_TEMPLATE,
  TASK_FILE,
  commandExistsAsync,
  startHeartbeat,
  parseArgs,
  readText,
  CLAUDE_DEFAULT_MODEL,
  runAgent,
  setTaskStatus,
  timeoutMs,
  section,
  taskStatus,
  taskTitle,
  writeText,
} from './lib.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2), ['dry-run']);
const taskText = (flags.task ?? positional.join(' ')).trim();

if (!taskText) {
  console.error('Usage: npm run ai:plan -- "<task description>" [--model <alias>] [--dry-run]');
  process.exit(1);
}

const architectPrompt = readText(join(PROMPTS_DIR, 'architect.md'));
const prompt = `${architectPrompt}\n\n---\n\nTask description:\n\n${taskText}\n`;

const model = flags.model ?? CLAUDE_DEFAULT_MODEL;
// The prompt is NOT an argv element: it is piped on stdin (see runAgent).
const claudeArgs = [
  '-p',
  '--model',
  model,
  '--permission-mode',
  'acceptEdits',
  // Tool allowlist as defense-in-depth: the architect can read/write, and can
  // only inspect git history/diff/status - it cannot commit, push, or reset.
  '--allowedTools',
  'Read Glob Grep Write Edit Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*)',
];

section('ai:plan');
console.log(`Task: ${taskText}`);

if (flags['dry-run']) {
  console.log('\n--dry-run: not invoking claude. Composed invocation:');
  console.log(`claude ${claudeArgs.join(' ')}   < prompt on stdin (${prompt.length} chars)`);
  console.log(`model=${model}`);
  process.exit(0);
}

// Progress must be visible BEFORE anything that can block: announce and start
// the Node-only heartbeat first, then run the (async) CLI preflight.
const planTimeout = timeoutMs(flags, 10);
console.log(
  `[${new Date().toLocaleTimeString('en-GB')}] ai:plan: starting Claude... ` +
  `agent=claude model=${model} timeout=${Math.round(planTimeout / 60_000)}m`,
);
const heartbeat = startHeartbeat('ai:plan');

if (!(await commandExistsAsync('claude'))) {
  heartbeat.stop();
  console.error('`claude` CLI not found on PATH (or `claude --version` failed). Install/authenticate Claude Code first.');
  process.exit(1);
}

// Reset the review contract before planning: a new task means any previous
// APPROVED verdict or fix-cycle count no longer applies.
writeText(REVIEW_FILE, REVIEW_TEMPLATE);
rmSync(CHECKS_FILE, { force: true }); // stale results belong to the previous task

// Mark the task as in-flight; if the agent fails we flip it to PLAN_FAILED so
// CURRENT_TASK.md never looks like it is still being planned.
setTaskStatus('PLANNING');
const result = await runAgent({
  label: 'ai:plan',
  cmd: 'claude',
  args: claudeArgs,
  input: prompt,
  model,
  timeoutMs: planTimeout,
  heartbeat,
});
if (result.code !== 0) {
  setTaskStatus('PLAN_FAILED');
  const why = result.timedOut ? 'timed out' : result.cancelled ? 'was cancelled' : `exited with status ${result.code}`;
  console.error(`claude ${why}. .ai/CURRENT_TASK.md STATUS set to PLAN_FAILED. Re-run ai:plan.`);
  process.exit(result.code || 1);
}

section('Result');
console.log(`.ai/CURRENT_TASK.md - Title: ${taskTitle() ?? '(unchanged)'}  STATUS: ${taskStatus() ?? '(unknown)'}`);
if (taskStatus() === 'READY') {
  console.log('Next: npm run ai:implement');
} else {
  console.log('Next: review .ai/CURRENT_TASK.md - it is not READY yet (open questions or still PLANNING).');
  if (taskStatus() === 'PLANNING') setTaskStatus('PLAN_FAILED');
}
