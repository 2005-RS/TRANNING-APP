#!/usr/bin/env node
// npm run ai:implement [-- --model <alias>] [-- --reasoning medium|high|xhigh] [-- --force] [-- --dry-run]
//
// Codex reads AGENTS.md and .ai/CURRENT_TASK.md and implements the approved
// scope. Codex runs sandboxed (--sandbox workspace-write --approve-for-me): it
// can read/write files and run commands inside this repo, but this script
// never asks it to commit or push, and it explicitly must not.
import { join } from 'node:path';
import {
  CODEX_EXEC_BASE_ARGS,
  DEFAULT_CODEX_MODEL,
  PROMPTS_DIR,
  commandExists,
  currentHead,
  gitStatusShort,
  parseArgs,
  resolveReasoning,
  readText,
  runAgent,
  timeoutMs,
  section,
  taskStatus,
  taskTitle,
  warnIfHeadMoved,
} from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['dry-run', 'force']);

const status = taskStatus();
if (status !== 'READY' && !flags.force) {
  console.error(`.ai/CURRENT_TASK.md STATUS is "${status ?? '(missing)'}", not READY.`);
  console.error('Run `npm run ai:plan -- "..."` first, or pass --force if you wrote the task by hand.');
  process.exit(1);
}

const implementerPrompt = readText(join(PROMPTS_DIR, 'implementer.md'));

// cwd is already the repo root (runAgent), so no -C. The prompt is read from
// stdin via the trailing `-`, which must stay the last argument.
const codexArgs = [...CODEX_EXEC_BASE_ARGS];
const model = flags.model ?? DEFAULT_CODEX_MODEL;
const reasoning = resolveReasoning(flags, 'implement');
codexArgs.push('--model', model);
codexArgs.push('-c', `model_reasoning_effort=${reasoning}`);
codexArgs.push('-');

section('ai:implement');
console.log(`Task: ${taskTitle() ?? '(untitled)'}`);
console.log(`model=${model} reasoning=${reasoning}`);

if (flags['dry-run']) {
  console.log('\n--dry-run: not invoking codex. Composed invocation:');
  console.log(`codex ${codexArgs.join(' ')}   < prompt on stdin (${implementerPrompt.length} chars)`);
  process.exit(0);
}

if (!commandExists('codex')) {
  console.error('`codex` CLI not found on PATH. Install/authenticate Codex CLI first.');
  process.exit(1);
}

const before = currentHead();
const result = await runAgent({
  label: 'ai:implement',
  cmd: 'codex',
  args: codexArgs,
  input: implementerPrompt,
  model,
  timeoutMs: timeoutMs(flags, 45),
});
const exitCode = result.code;
warnIfHeadMoved(before, 'ai:implement');

section('Result');
const diff = gitStatusShort();
console.log(diff ? diff : '(no working-tree changes - Codex may not have implemented anything)');
console.log(`\nNext: npm run ai:check:fast, then npm run ai:review`);
process.exit(exitCode);
