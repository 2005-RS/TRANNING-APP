#!/usr/bin/env node
// npm run ai:status
//
// Pure inspection: no AI calls, no cost. Reads git + .ai/*.md and tells you
// the next command to run.
import {
  FIX_CYCLE_LIMIT,
  capture,
  changedPaths,
  fixCycle,
  gitStatusShort,
  reviewFinal,
  reviewStatus,
  section,
  taskStatus,
  taskTitle,
} from './lib.mjs';

function branch() {
  return capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
}

section('Repository');
console.log(`Branch: ${branch()}`);
const changed = changedPaths();
console.log(`Uncommitted changes: ${changed.length} file(s)`);
if (changed.length) {
  console.log(gitStatusShort().split('\n').slice(0, 10).join('\n'));
  if (changed.length > 10) console.log(`  … and ${changed.length - 10} more`);
}

section('Task');
const tStatus = taskStatus();
console.log(`Title:  ${taskTitle() ?? '(none)'}`);
console.log(`STATUS: ${tStatus ?? '(none)'}`);

section('Review');
const rStatus = reviewStatus();
const rFinal = reviewFinal();
const cycle = fixCycle();
console.log(`STATUS:    ${rStatus ?? '(none)'}`);
console.log(`FINAL:     ${rFinal ?? '(none)'}`);
console.log(`FIX CYCLE: ${cycle}/${FIX_CYCLE_LIMIT}`);

section('Next step');
if (tStatus === 'PLAN_FAILED') {
  console.log('Last ai:plan failed or did not finish. Re-run: npm run ai:plan -- "<task description>"');
} else if (!tStatus || tStatus === '(none)' || tStatus === 'PLANNING') {
  console.log('npm run ai:plan -- "<task description>"');
} else if (tStatus === 'READY') {
  console.log('npm run ai:implement');
} else if (rFinal === 'APPROVED') {
  console.log('Human review, then commit. (This system never commits for you.)');
} else if (rFinal === 'VALIDATION_REQUIRED') {
  console.log('Run the validation named in .ai/REVIEW.md (e.g. npm run ai:check:full), then npm run ai:review. No ai:fix needed.');
} else if (rFinal === 'CHANGES_REQUESTED') {
  if (cycle >= FIX_CYCLE_LIMIT) {
    console.log('STOP — fix-cycle limit reached. Human review needed before continuing.');
  } else {
    console.log(`npm run ai:fix   (cycle ${cycle}/${FIX_CYCLE_LIMIT} used so far)`);
  }
} else if (changed.length > 0) {
  console.log('npm run ai:review');
} else {
  console.log('npm run ai:implement');
}
