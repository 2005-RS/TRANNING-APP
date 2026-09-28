// Shared helpers for scripts/ai/*.mjs. Zero third-party dependencies on
// purpose — these scripts are thin wrappers around `git`, `npm`, `claude`,
// and `codex`, not a framework.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, extname, join } from 'node:path';

const WIN32 = process.platform === 'win32';

/**
 * Resolves a bare command name to a real file (honouring PATHEXT on Windows).
 * `viaShell` is true only for .cmd/.bat wrappers (npm.cmd, codex.cmd), which
 * Windows cannot execute without cmd.exe. Real executables (git.exe,
 * claude.exe) are spawned directly: no shell, no quoting problems.
 */
export function resolveBin(cmd) {
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  const exts = WIN32 ? ['.exe', '.com', '.cmd', '.bat'] : [''];

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, cmd + ext);

      try {
        if (!statSync(candidate).isFile()) continue;
      } catch {
        continue;
      }

      const e = extname(candidate).toLowerCase();

      return {
        path: candidate,
        viaShell: WIN32 && (e === '.cmd' || e === '.bat'),
      };
    }
  }

  return null;
}

/**
 * File + shell option for a command.
 * shell is only enabled for .cmd/.bat wrappers.
 */
function bin(cmd) {
  const resolved = resolveBin(cmd);

  if (!resolved) {
    return {
      file: cmd,
      shell: false,
    };
  }

  // With shell:true Node concatenates args unquoted, so only pass simple args
  // (no spaces/newlines) to .cmd wrappers. Big prompts go through stdin.
  return {
    file: resolved.viaShell ? `"${resolved.path}"` : resolved.path,
    shell: resolved.viaShell,
  };
}

/**
 * Returns the repository root.
 */
export function repoRoot() {
  const b = bin('git');

  const result = spawnSync(
    b.file,
    ['rev-parse', '--show-toplevel'],
    {
      encoding: 'utf8',
      shell: b.shell,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      'Not inside a git repository (git rev-parse --show-toplevel failed).',
    );
  }

  return result.stdout.trim();
}

export const ROOT = repoRoot();

export const AI_DIR = join(ROOT, '.ai');
export const TASK_FILE = join(AI_DIR, 'CURRENT_TASK.md');
export const REVIEW_FILE = join(AI_DIR, 'REVIEW.md');
export const PROMPTS_DIR = join(AI_DIR, 'prompts');
export const CHECKS_FILE = join(AI_DIR, 'CHECKS.md');

/**
 * Runs a short, simple-args command with inherited output.
 * Returns the exit code.
 */
export function run(cmd, args, opts = {}) {
  const b = bin(cmd);

  const result = spawnSync(
    b.file,
    args,
    {
      stdio: 'inherit',
      shell: b.shell,
      cwd: ROOT,
      ...opts,
    },
  );

  if (result.error) {
    console.error(`Failed to run "${cmd}": ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

/**
 * Runs a command and captures stdout instead of streaming it.
 */
export function capture(cmd, args) {
  const b = bin(cmd);

  const result = spawnSync(
    b.file,
    args,
    {
      encoding: 'utf8',
      shell: b.shell,
      cwd: ROOT,
      timeout: 30_000,
    },
  );

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
  };
}

/**
 * True if the binary resolves on PATH AND `--version`
 * actually runs successfully.
 */
export function commandExists(cmd) {
  return (
    resolveBin(cmd) !== null &&
    capture(cmd, ['--version']).status === 0
  );
}

const stamp = () => new Date().toLocaleTimeString('en-GB');

const fmt = (ms) => {
  const s = Math.round(ms / 1000);

  return s >= 60
    ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
    : `${s}s`;
};

/**
 * Kills the complete child process tree.
 */
function killTree(child) {
  if (
    !child ||
    child.exitCode !== null ||
    child.pid === undefined
  ) {
    return;
  }

  try {
    if (WIN32) {
      spawnSync(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        {
          stdio: 'ignore',
        },
      );
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    // Process is already gone.
  }
}

/**
 * Runs a long-lived agent (Claude / Codex).
 *
 * The prompt goes through STDIN instead of argv. This avoids problems on
 * Windows with multiline prompts, quotes, spaces and large prompt sizes.
 *
 * It also:
 * - displays the agent/model
 * - displays elapsed time
 * - prints a heartbeat every 30 seconds
 * - enforces a timeout
 * - handles Ctrl+C
 * - kills the complete process tree when cancelled
 */
export function runAgent({
  label,
  cmd,
  args,
  input,
  model,
  timeoutMs,
}) {
  return new Promise((resolve) => {
    const b = bin(cmd);
    const started = Date.now();

    console.log(
      `[${stamp()}] ${label}: starting agent=${cmd} ` +
      `model=${model ?? '(cli default)'} ` +
      `timeout=${fmt(timeoutMs)}`,
    );

    const child = spawn(
      b.file,
      args,
      {
        cwd: ROOT,
        shell: b.shell,
        stdio: ['pipe', 'inherit', 'inherit'],
        windowsHide: true,
      },
    );

    let timedOut = false;
    let cancelled = false;
    let settled = false;

    // Child may exit before consuming stdin.
    child.stdin.on('error', () => {});

    child.stdin.end(input ?? '');

    const heartbeat = setInterval(() => {
      console.log(
        `[${stamp()}] ${label}: still working… ` +
        `${fmt(Date.now() - started)} elapsed ` +
        `(pid ${child.pid})`,
      );
    }, 30_000);

    const timer = setTimeout(() => {
      timedOut = true;

      console.error(
        `[${stamp()}] ${label}: TIMEOUT after ` +
        `${fmt(timeoutMs)} — killing agent.`,
      );

      killTree(child);
    }, timeoutMs);

    const onSigint = () => {
      if (cancelled) return;

      cancelled = true;

      console.error(
        `\n[${stamp()}] ${label}: Ctrl+C — cancelling agent.`,
      );

      killTree(child);
    };

    const onExit = () => {
      killTree(child);
    };

    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigint);
    process.on('exit', onExit);

    const finish = (code, error) => {
      if (settled) return;

      settled = true;

      clearInterval(heartbeat);
      clearTimeout(timer);

      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigint);
      process.off('exit', onExit);

      const ms = Date.now() - started;

      if (error) {
        console.error(
          `[${stamp()}] ${label}: failed to start "${cmd}": ` +
          `${error.message}`,
        );
      }

      console.log(
        `[${stamp()}] ${label}: finished ` +
        `exit=${code} elapsed=${fmt(ms)}` +
        `${timedOut ? ' (timed out)' : ''}` +
        `${cancelled ? ' (cancelled)' : ''}`,
      );

      resolve({
        code,
        timedOut,
        cancelled,
        ms,
      });
    };

    child.on('error', (error) => {
      finish(1, error);
    });

    child.on('close', (code) => {
      finish(code ?? 1);
    });
  });
}

/**
 * Minutes from:
 * --timeout flag
 * AI_TIMEOUT_MIN environment variable
 * or the provided default.
 */
export function timeoutMs(flags, defaultMin) {
  const min = Number(
    flags.timeout ?? process.env.AI_TIMEOUT_MIN,
  );

  return (
    Number.isFinite(min) && min > 0
      ? min
      : defaultMin
  ) * 60_000;
}

/**
 * Default Claude model used by planner/reviewer.
 */
export const CLAUDE_DEFAULT_MODEL = 'sonnet';

/**
 * Default Codex model used by implement/fix (single source of truth).
 * Passed explicitly because ~/.codex/config.toml may default to a model the
 * ChatGPT account rejects (gpt-5.4). Override per run with --model <model>.
 */
export const DEFAULT_CODEX_MODEL = 'gpt-5.6-terra';

/**
 * Codex reasoning effort (single source of truth). ~/.codex/config.toml sets
 * model_reasoning_effort = "xhigh" globally, so the scripts override it per
 * run with `-c model_reasoning_effort=<level>`. Override with --reasoning.
 */
export const REASONING_LEVELS = ['medium', 'high', 'xhigh'];
export const DEFAULT_REASONING = { implement: 'medium', fix: 'high' };

export function resolveReasoning(flags, kind) {
  const level = flags.reasoning ?? DEFAULT_REASONING[kind];

  if (!REASONING_LEVELS.includes(level)) {
    console.error(
      `Invalid --reasoning "${level}". Use one of: ${REASONING_LEVELS.join(', ')}.`,
    );
    process.exit(1);
  }

  return level;
}

/**
 * Codex CLI >= 0.158 invocation for implement/fix.
 *
 * IMPORTANT:
 *
 * --full-auto was removed from Codex CLI.
 *
 * --approve-for-me already routes approval requests through automatic
 * review using the workspace-write sandbox.
 *
 * Codex CLI 0.158 does NOT allow:
 *
 *   --sandbox workspace-write --approve-for-me
 *
 * at the same time.
 *
 * Therefore the automation uses only --approve-for-me.
 *
 * Never add:
 * - --dangerously-bypass-approvals-and-sandbox
 * - --dangerously-bypass-hook-trust
 * - danger-full-access
 */
export const CODEX_EXEC_BASE_ARGS = [
  'exec',
  '--approve-for-me',
];

/**
 * Returns current Git HEAD.
 */
export function currentHead() {
  return capture(
    'git',
    ['rev-parse', 'HEAD'],
  ).stdout;
}

/**
 * Warns loudly if HEAD moved during an agent invocation.
 *
 * These scripts never intentionally commit, so a changed HEAD means
 * something else created a commit.
 *
 * This is a tripwire, not a hard lock.
 */
export function warnIfHeadMoved(before, label) {
  const after = currentHead();

  if (after !== before) {
    console.warn(
      '\n⚠️  WARNING: HEAD changed during ' +
      label +
      '.',
    );

    console.warn(
      '   These scripts never call `git commit`. Something else did.',
    );

    console.warn(
      `   Before: ${before}\n` +
      `   After:  ${after}`,
    );

    console.warn(
      '   Inspect with `git log` before trusting the working tree.\n',
    );
  }
}

/**
 * Returns git status --short.
 */
export function gitStatusShort() {
  return capture(
    'git',
    ['status', '--short'],
  ).stdout;
}

/**
 * Changed paths:
 * working tree + staged changes.
 */
export function changedPaths() {
  const { stdout } = capture(
    'git',
    ['status', '--porcelain'],
  );

  if (!stdout) {
    return [];
  }

  return stdout
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

/**
 * Detects whether backend/frontend contain changes.
 */
export function changedSides() {
  const paths = changedPaths();

  return {
    backend: paths.some(
      (p) => p.startsWith('backend/'),
    ),

    frontend: paths.some(
      (p) => p.startsWith('frontend/'),
    ),
  };
}

/**
 * Reads UTF-8 text if the file exists.
 */
export function readText(path) {
  return existsSync(path)
    ? readFileSync(path, 'utf8')
    : '';
}

/**
 * Writes UTF-8 text.
 */
export function writeText(path, content) {
  writeFileSync(
    path,
    content,
    'utf8',
  );
}

/**
 * Reads the value after LABEL:
 *
 * Example:
 *
 * STATUS: READY
 *
 * returns:
 *
 * READY
 */
export function readField(text, label) {
  const match = new RegExp(
    `^${label}:\\s*(.*)$`,
    'm',
  ).exec(text);

  return match
    ? match[1].trim()
    : null;
}

/**
 * Replaces the value after LABEL:
 */
export function setField(text, label, value) {
  const pattern = new RegExp(
    `^${label}:.*$`,
    'm',
  );

  const line = `${label}: ${value}`;

  return pattern.test(text)
    ? text.replace(pattern, line)
    : text;
}

/**
 * Current task status.
 */
export function taskStatus() {
  return readField(
    readText(TASK_FILE),
    'STATUS',
  );
}

/**
 * Current task title.
 */
export function taskTitle() {
  const text = readText(TASK_FILE);

  const match = /^## Title\s*\n+(.+)$/m.exec(text);

  return match
    ? match[1].trim()
    : null;
}

/**
 * Current review status.
 */
export function reviewStatus() {
  return readField(
    readText(REVIEW_FILE),
    'STATUS',
  );
}

/**
 * Current review final result.
 */
export function reviewFinal() {
  return readField(
    readText(REVIEW_FILE),
    'FINAL',
  );
}

/**
 * Reads:
 *
 * FIX CYCLE: N/2
 *
 * and returns N.
 */
export function fixCycle() {
  const raw = readField(
    readText(REVIEW_FILE),
    'FIX CYCLE',
  );

  const match = raw
    ? /^(\d+)\s*\/\s*2$/.exec(raw)
    : null;

  return match
    ? Number(match[1])
    : 0;
}

/**
 * Maximum automatic fix cycles.
 */
export const FIX_CYCLE_LIMIT = 2;

/**
 * Fresh REVIEW.md contract.
 *
 * ai:plan writes this at the start of every new task so a stale APPROVED
 * verdict or fix-cycle count cannot leak into another task.
 */
export const REVIEW_TEMPLATE = `# Review

TASK: (pending — run npm run ai:review)
STATUS: (none)
FIX CYCLE: 0/2

## Blockers

## Important

## Minor

## Pre-existing / Out-of-scope

## Verification

- backend lint:
- backend tests:
- backend build:
- frontend lint:
- frontend tests:
- frontend build:

## Final

(none)
`;

/**
 * Compact PASS/FAIL record of the last check runs (no logs), so the
 * reviewer can read results instead of re-running them. Keyed by name;
 * a later run of the same check overwrites the earlier one.
 */
export function workTreeFingerprint() {
  const head = capture('git', ['rev-parse', 'HEAD']).stdout;
  const status = capture('git', ['status', '--porcelain', '-uall']).stdout;
  const h = createHash('sha1').update(head);
  for (const line of status.split('\n').filter(Boolean)) {
    const path = line.slice(3).trim();
    // Files the workflow itself rewrites between checks and review.
    if (path === '.ai/CHECKS.md' || path === '.ai/REVIEW.md') continue;
    let meta = 'gone';
    try {
      const st = statSync(join(ROOT, path));
      meta = `${st.size}:${Math.trunc(st.mtimeMs)}`;
    } catch { /* deleted */ }
    h.update(`\n${line.slice(0, 2)} ${path} ${meta}`);
  }
  return h.digest('hex').slice(0, 16);
}

/**
 * 'FRESH' | 'STALE' | 'MISSING' — does CHECKS.md describe the current
 * working tree (HEAD + changed files' size/mtime)?
 */
export function checksFreshness() {
  if (!existsSync(CHECKS_FILE)) return 'MISSING';
  const recorded = readField(readFileSync(CHECKS_FILE, 'utf8'), 'TREE');
  return recorded && recorded === workTreeFingerprint() ? 'FRESH' : 'STALE';
}

export function recordChecks(results) {
  const map = new Map();
  // Keep earlier entries only if they describe this same working tree.
  if (checksFreshness() === 'FRESH') {
    for (const line of readFileSync(CHECKS_FILE, 'utf8').split('\n')) {
      const m = /^- (.+?): (PASS|FAIL)$/.exec(line);
      if (m) map.set(m[1], m[2]);
    }
  }
  for (const [name, code] of results) map.set(name, code === 0 ? 'PASS' : 'FAIL');
  const body = [...map].map(([n, r]) => `- ${n}: ${r}`).join('\n');
  writeFileSync(CHECKS_FILE, `# Checks (written by ai:check:*; agents do not run these)\n\nTREE: ${workTreeFingerprint()}\nRAN: ${new Date().toISOString()}\n\n${body}\n`);
}

/**
 * Minimal CLI argument parser.
 */
export function parseArgs(
  argv,
  boolFlags = [],
) {
  const flags = {};
  const positional = [];

  for (
    let i = 0;
    i < argv.length;
    i++
  ) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const name = arg.slice(2);

      if (boolFlags.includes(name)) {
        flags[name] = true;
      } else {
        flags[name] = argv[i + 1];
        i++;
      }
    } else {
      positional.push(arg);
    }
  }

  return {
    flags,
    positional,
  };
}

/**
 * Prints a section title.
 */
export function section(title) {
  console.log(
    `\n— ${title} ` +
    `${'—'.repeat(
      Math.max(
        0,
        60 - title.length,
      ),
    )}`,
  );
}

/**
 * Sets STATUS in .ai/CURRENT_TASK.md.
 *
 * No-op if the STATUS field is missing.
 */
export function setTaskStatus(value) {
  writeText(
    TASK_FILE,
    setField(
      readText(TASK_FILE),
      'STATUS',
      value,
    ),
  );
}
