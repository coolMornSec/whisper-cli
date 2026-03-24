import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scaffoldTaskWorkspace, transitionTaskState, validateTaskWorkspace } from '../scripts/task-docs.mjs';

const DEFAULT_TASK_ID = 'whisper-cli-ai-workflow';
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function makeWorkspace() {
  return mkdtemp(join(tmpdir(), 'whisper-cli-'));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('scaffoldTaskWorkspace creates the complete MAS task workspace and control files', async () => {
  const rootDir = await makeWorkspace();
  const result = await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'demo-task',
    title: 'Demo Task',
    goal: 'Validate the MAS V1 workspace scaffold'
  });

  assert.equal(result.created.includes('shared/templates/task-workspace.template.md'), true);
  assert.equal(result.created.includes('orchestrator/state-machine.md'), true);
  assert.equal(result.created.includes('tasks/demo-task/01-spec/spec.md'), true);
  assert.equal(result.created.includes('tasks/demo-task/04-design/api-contract.yaml'), true);

  const manifest = await readJson(join(rootDir, 'tasks/demo-task/manifest.json'));
  const state = await readJson(join(rootDir, 'tasks/demo-task/state.json'));

  assert.equal(manifest.task_id, 'demo-task');
  assert.equal(Boolean(manifest.departments.libu_task_breakdown.length), true);
  assert.equal(Boolean(manifest.departments.libu_prototype.length), true);
  assert.equal(state.current_state, 'INTAKE');
  assert.deepEqual(state.allowed_write_paths, ['00-intake/', '01-spec/']);
});

test('validateTaskWorkspace accepts a scaffolded workspace with valid state and manifest', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'demo-task',
    title: 'Demo Task',
    goal: 'Validate the MAS V1 workspace scaffold'
  });

  const report = await validateTaskWorkspace({ rootDir, taskId: 'demo-task' });
  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
});

test('validateTaskWorkspace reports invalid state transitions and write-scope mismatches', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'broken-task',
    title: 'Broken Task',
    goal: 'Validate invalid state and permission handling'
  });

  const statePath = join(rootDir, 'tasks/broken-task/state.json');
  const state = await readJson(statePath);
  state.previous_state = 'API_REVIEW';
  state.current_state = 'BUILD_IN_PROGRESS';
  state.active_agents = ['frontend-agent', 'backend-agent'];
  state.allowed_write_paths = ['02-review/'];
  await writeJson(statePath, state);

  const report = await validateTaskWorkspace({ rootDir, taskId: 'broken-task' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('Illegal state transition recorded')));
  assert.ok(report.errors.some(error => error.includes('state.allowed_write_paths')));
});

test('validateTaskWorkspace rejects manifest data that breaks department split or artifact paths', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'bad-manifest',
    title: 'Bad Manifest',
    goal: 'Validate manifest policy constraints'
  });

  const manifestPath = join(rootDir, 'tasks/bad-manifest/manifest.json');
  const manifest = await readJson(manifestPath);
  delete manifest.departments.libu_prototype;
  manifest.artifacts.spec = 'docs/specs/bad-manifest.spec.md';
  await writeJson(manifestPath, manifest);

  const report = await validateTaskWorkspace({ rootDir, taskId: 'bad-manifest' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('libu_prototype')));
  assert.ok(report.errors.some(error => error.includes('manifest.artifacts.spec')));
});

test('transitionTaskState advances the workflow and syncs execution ownership', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'transition-task',
    title: 'Transition Task',
    goal: 'Validate the transition controller'
  });

  const advancedState = await transitionTaskState({
    rootDir,
    taskId: 'transition-task',
    toState: 'SPEC_DRAFT'
  });

  assert.equal(advancedState.current_state, 'SPEC_DRAFT');
  assert.equal(advancedState.previous_state, 'INTAKE');
  assert.equal(advancedState.owner, 'spec-agent');
  assert.deepEqual(advancedState.allowed_write_paths, ['00-intake/', '01-spec/']);
});

test('transitionTaskState enforces entry gates before entering review states', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'gated-task',
    title: 'Gated Task',
    goal: 'Validate entry gate enforcement'
  });

  await transitionTaskState({ rootDir, taskId: 'gated-task', toState: 'SPEC_DRAFT' });
  await writeFile(join(rootDir, 'tasks/gated-task/01-spec/spec.md'), '# Specification\n', 'utf8');

  await assert.rejects(
    transitionTaskState({ rootDir, taskId: 'gated-task', toState: 'REQUIREMENT_REVIEW' }),
    /Task Goal|Acceptance Criteria|Non-Goals/
  );
});

test('transitionTaskState uses review decisions to route to pass and reject branches', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'review-task',
    title: 'Review Task',
    goal: 'Validate review-driven pass and reject routing'
  });

  await transitionTaskState({ rootDir, taskId: 'review-task', toState: 'SPEC_DRAFT' });
  await transitionTaskState({ rootDir, taskId: 'review-task', toState: 'REQUIREMENT_REVIEW' });

  const plannedState = await transitionTaskState({
    rootDir,
    taskId: 'review-task',
    toState: 'TASK_PLANNED'
  });
  assert.equal(plannedState.current_state, 'TASK_PLANNED');
  assert.equal(plannedState.owner, 'orchestrator-agent');

  let resetState = await readJson(join(rootDir, 'tasks/review-task/state.json'));
  resetState.current_state = 'REQUIREMENT_REVIEW';
  resetState.previous_state = 'SPEC_DRAFT';
  resetState.owner = 'requirement-reviewer';
  resetState.active_agents = ['requirement-reviewer', 'ui-reviewer', 'api-reviewer', 'test-reviewer'];
  resetState.allowed_write_paths = ['02-review/'];
  resetState.approved_artifacts.spec = false;
  await writeJson(join(rootDir, 'tasks/review-task/state.json'), resetState);

  let review = await readFile(join(rootDir, 'tasks/review-task/02-review/requirement-review.md'), 'utf8');
  review = review.replace('- pass', '- reject');
  await writeFile(join(rootDir, 'tasks/review-task/02-review/requirement-review.md'), review, 'utf8');

  const rejectedState = await transitionTaskState({
    rootDir,
    taskId: 'review-task',
    toState: 'REQUIREMENT_REJECTED'
  });

  assert.equal(rejectedState.current_state, 'REQUIREMENT_REJECTED');
  assert.equal(rejectedState.owner, 'spec-agent');
  assert.deepEqual(rejectedState.allowed_write_paths, ['00-intake/', '01-spec/']);
});

test('repository default workflow workspace stays valid end-to-end', async () => {
  const report = await validateTaskWorkspace({
    rootDir: process.cwd(),
    taskId: DEFAULT_TASK_ID
  });

  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
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
  console.log(`All ${tests.length} tests passed.`);
}
