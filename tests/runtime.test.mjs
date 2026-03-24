import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExecutionIntent } from '../scripts/mas-runtime-intent.mjs';
import { buildTaskBoard, interveneOnTask, runSchedulerLoop, runSchedulerTick, submitTaskRequest } from '../scripts/mas-runtime.mjs';
import { readTaskEvents } from '../scripts/mas-runtime-store.mjs';
import { validateTaskWorkspace } from '../scripts/task-docs.mjs';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function makeWorkspace() {
  return mkdtemp(join(tmpdir(), 'whisper-runtime-'));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

const mockCommandDriver = fileURLToPath(new URL('./fixtures/mock-command-driver.mjs', import.meta.url));

test('submitTaskRequest scaffolds a task and records the emperor enqueue event', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-demo',
    title: 'Runtime Demo',
    goal: 'Verify the mixed-mode runtime',
    request: 'Build a visible Codex execution workflow',
    context: 'Need a task board and event stream',
    constraints: 'Keep manifest and state as the source of truth'
  });

  const report = await validateTaskWorkspace({ rootDir, taskId: 'runtime-demo' });
  const control = await readJson(join(rootDir, 'tasks/runtime-demo/runtime/control.json'));
  const events = await readTaskEvents({ rootDir, taskId: 'runtime-demo' });

  assert.equal(report.valid, true);
  assert.equal(control.last_event_id, 1);
  assert.equal(events[0].type, 'TASK_ENQUEUED');
  assert.equal(events[0].actor.id, 'emperor');
});

test('runSchedulerLoop drives a submitted task from intake to done', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-loop',
    title: 'Runtime Loop',
    goal: 'Drive the full MAS loop automatically',
    request: 'Complete the full workflow with events and board visibility'
  });

  const results = await runSchedulerLoop({
    rootDir,
    taskId: 'runtime-loop',
    intervalMs: 0,
    maxIterations: 20
  });

  const state = await readJson(join(rootDir, 'tasks/runtime-loop/state.json'));
  const control = await readJson(join(rootDir, 'tasks/runtime-loop/runtime/control.json'));
  const events = await readTaskEvents({ rootDir, taskId: 'runtime-loop' });

  assert.ok(results.some(result => result.currentState === 'DONE'));
  assert.equal(state.current_state, 'DONE');
  assert.equal(control.status, 'completed');
  assert.ok(events.some(event => event.type === 'TASK_LEASED'));
  assert.ok(events.some(event => event.type === 'STATE_TRANSITIONED' && event.state?.to === 'DONE'));
});

test('human pause and resume are reflected in control state and board output', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-pause',
    title: 'Runtime Pause',
    goal: 'Pause and resume a task',
    request: 'Allow the emperor to pause the pipeline'
  });

  await interveneOnTask({
    rootDir,
    taskId: 'runtime-pause',
    action: 'pause',
    reason: 'Need to inspect the current task'
  });

  const pausedTick = await runSchedulerTick({ rootDir, taskId: 'runtime-pause' });
  const board = await buildTaskBoard({ rootDir, taskId: 'runtime-pause' });

  assert.equal(pausedTick.status, 'paused');
  assert.equal(board[0].status, 'paused');
  assert.equal(board[0].blocker.kind, 'human_pause');
  assert.equal(board[0].next_action, '等待皇帝恢复');
  assert.deepEqual(board[0].active_agents, ['spec-agent']);

  await interveneOnTask({
    rootDir,
    taskId: 'runtime-pause',
    action: 'resume'
  });

  const resumed = await runSchedulerTick({ rootDir, taskId: 'runtime-pause' });
  assert.equal(resumed.status, 'processed');
});

test('buildExecutionIntent exposes the current Codex handoff contract', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-intent',
    title: 'Runtime Intent',
    goal: 'Produce a Codex-ready execution intent',
    request: 'Describe the current stage contract for the assigned agent',
    context: 'Need machine-readable handoff data for the external executor',
    constraints: 'Only write inside allowed paths'
  });

  await runSchedulerTick({ rootDir, taskId: 'runtime-intent' });
  await runSchedulerTick({ rootDir, taskId: 'runtime-intent' });

  const intent = await buildExecutionIntent({ rootDir, taskId: 'runtime-intent' });

  assert.equal(intent.current_state, 'REQUIREMENT_REVIEW');
  assert.equal(intent.department, 'menxia');
  assert.deepEqual(intent.expected_outputs, ['02-review/requirement-review.md']);
  assert.deepEqual(intent.human_actions, ['approve', 'reject', 'pause']);
  assert.equal(intent.next_transitions.approve, 'TASK_PLANNED');
  assert.equal(intent.next_transitions.reject, 'REQUIREMENT_REJECTED');
  assert.equal(intent.current_review_decision, 'pending');
  assert.match(intent.prompt, /需求评审/u);
  assert.match(intent.prompt, /只负责/u);
});

test('human reject on requirement review sends the task to the reject branch', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-reject',
    title: 'Runtime Reject',
    goal: 'Allow the emperor to reject a review',
    request: 'Reject at requirement review and route correctly'
  });

  await runSchedulerTick({ rootDir, taskId: 'runtime-reject' });
  await runSchedulerTick({ rootDir, taskId: 'runtime-reject' });

  let state = await readJson(join(rootDir, 'tasks/runtime-reject/state.json'));
  assert.equal(state.current_state, 'REQUIREMENT_REVIEW');

  await interveneOnTask({
    rootDir,
    taskId: 'runtime-reject',
    action: 'reject',
    reviewState: 'REQUIREMENT_REVIEW',
    reason: 'Spec still needs refinement'
  });

  state = await readJson(join(rootDir, 'tasks/runtime-reject/state.json'));
  assert.equal(state.current_state, 'REQUIREMENT_REJECTED');

  await runSchedulerTick({ rootDir, taskId: 'runtime-reject' });
  state = await readJson(join(rootDir, 'tasks/runtime-reject/state.json'));
  assert.equal(state.current_state, 'SPEC_DRAFT');
});

test('board derives review and audit summaries from runtime events instead of parsing documents', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-board',
    title: 'Runtime Board',
    goal: 'Show the latest workflow evidence on the board',
    request: 'Drive the task to completion and summarize review and audit evidence'
  });

  await runSchedulerLoop({
    rootDir,
    taskId: 'runtime-board',
    intervalMs: 0,
    maxIterations: 20
  });

  await writeFile(
    join(rootDir, 'tasks/runtime-board/02-review/requirement-review.md'),
    '# 损坏的评审文档\n\n- 这个文件已经不再包含合法结论。\n',
    'utf8'
  );

  const board = await buildTaskBoard({ rootDir, taskId: 'runtime-board' });

  assert.equal(board[0].current_state, 'DONE');
  assert.equal(board[0].latest_review_decisions.REQUIREMENT_REVIEW, '通过');
  assert.equal(board[0].latest_review_decisions.UI_REVIEW, '通过');
  assert.equal(board[0].latest_review_decisions.API_REVIEW, '通过');
  assert.equal(board[0].latest_review_decisions.TEST_REVIEW, '通过');
  assert.equal(board[0].latest_audit_decision, '通过');
  assert.ok(board[0].recent_actions.length > 0);
  assert.equal(board[0].recent_actions.at(-1).summary, board[0].latest_event);
});

test('module driver can execute the workflow through the external driver contract', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-module',
    title: 'Runtime Module',
    goal: 'Drive the workflow through an external driver',
    request: 'Use the external driver contract instead of the built-in simulator'
  });

  const results = await runSchedulerLoop({
    rootDir,
    taskId: 'runtime-module',
    intervalMs: 0,
    maxIterations: 20,
    driver: 'module',
    driverModule: mockCommandDriver
  });

  const state = await readJson(join(rootDir, 'tasks/runtime-module/state.json'));
  const board = await buildTaskBoard({ rootDir, taskId: 'runtime-module' });
  const report = await validateTaskWorkspace({ rootDir, taskId: 'runtime-module' });
  const events = await readTaskEvents({ rootDir, taskId: 'runtime-module' });

  assert.ok(results.some(result => result.currentState === 'DONE'));
  assert.equal(state.current_state, 'DONE');
  assert.equal(report.valid, true);
  assert.equal(board[0].latest_audit_decision, '通过');
  assert.ok(events.some(event => event.detail?.driver === 'module'));
});

test('active leases prevent concurrent progression of the same task', async () => {
  const rootDir = await makeWorkspace();
  await submitTaskRequest({
    rootDir,
    taskId: 'runtime-lease',
    title: 'Runtime Lease',
    goal: 'Protect a task from concurrent schedulers',
    request: 'Only one orchestrator may hold the task at a time'
  });

  const controlPath = join(rootDir, 'tasks/runtime-lease/runtime/control.json');
  const control = await readJson(controlPath);
  control.status = 'running';
  control.lease = {
    owner: 'other-runtime',
    token: 'lease-token',
    acquired_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString()
  };
  await writeFile(controlPath, `${JSON.stringify(control, null, 2)}\n`, 'utf8');

  const result = await runSchedulerTick({ rootDir, taskId: 'runtime-lease' });
  const state = await readJson(join(rootDir, 'tasks/runtime-lease/state.json'));

  assert.equal(result.status, 'skipped');
  assert.equal(state.current_state, 'INTAKE');
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} runtime tests passed.`);
}
