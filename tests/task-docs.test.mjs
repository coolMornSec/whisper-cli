import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { auditTaskWorkspace, scaffoldTaskWorkspace, transitionTaskState, validateTaskWorkspace } from '../scripts/task-docs.mjs';

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

async function setReviewDecision(filePath, decision) {
  const review = await readFile(filePath, 'utf8');
  const nextReview = review.replace(/## (?:Decision|结论)\s*\r?\n-\s*[^\r\n]+/u, `## 结论\n- ${decision}`);
  await writeFile(filePath, nextReview, 'utf8');
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

test('scaffoldTaskWorkspace initializes reviews as pending and keeps approvals closed at intake', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'pending-task',
    title: 'Pending Task',
    goal: 'Validate review initialization'
  });

  const requirementReview = await readFile(join(rootDir, 'tasks/pending-task/02-review/requirement-review.md'), 'utf8');
  const state = await readJson(join(rootDir, 'tasks/pending-task/state.json'));

  assert.match(requirementReview, /## 结论\s*\r?\n-\s*待定/);
  assert.deepEqual(state.approved_artifacts, {
    spec: false,
    prototype: false,
    api_contract: false,
    rules: false,
    tests: false,
    build: false,
    verification: false,
    audit: false
  });
});

test('scaffoldTaskWorkspace generates a standard AGENT contract for each task', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'agent-task',
    title: 'Agent Task',
    goal: 'Validate AGENT document scaffold'
  });

  const agentDoc = await readFile(join(rootDir, 'tasks/agent-task/AGENT.md'), 'utf8');

  assert.match(agentDoc, /# Agent 执行约定/);
  assert.match(agentDoc, /## 权限优先级/);
  assert.match(agentDoc, /## 部门角色映射/);
  assert.match(agentDoc, /`yushitai`/);
  assert.match(agentDoc, /`state\.json`/);
  assert.match(agentDoc, /## 完成交接协议/);
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

test('validateTaskWorkspace rejects department deliverables that miss required completion sections', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'bad-contract',
    title: 'Bad Contract',
    goal: 'Validate department deliverable contracts'
  });

  await writeFile(join(rootDir, 'tasks/bad-contract/03-plan/task-breakdown.md'), '# Task Breakdown\n', 'utf8');

  const report = await validateTaskWorkspace({ rootDir, taskId: 'bad-contract' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('03-plan/task-breakdown.md')));
  assert.ok(report.errors.some(error => error.includes('交付物映射') || error.includes('完成检查清单')));
});

test('validateTaskWorkspace rejects AGENT documents that break the standard contract', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'bad-agent',
    title: 'Bad Agent',
    goal: 'Validate AGENT standard enforcement'
  });

  await writeFile(join(rootDir, 'tasks/bad-agent/AGENT.md'), '# Agent Execution Contract\n\n## Mission\n- Incomplete.\n', 'utf8');

  const report = await validateTaskWorkspace({ rootDir, taskId: 'bad-agent' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('AGENT.md')));
  assert.ok(report.errors.some(error => error.includes('权限优先级') || error.includes('部门角色映射')));
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
    /任务目标|验收标准|非目标/
  );
});

test('transitionTaskState binds approved artifacts to passing review decisions', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'approval-task',
    title: 'Approval Task',
    goal: 'Validate review-driven approvals'
  });

  await transitionTaskState({ rootDir, taskId: 'approval-task', toState: 'SPEC_DRAFT' });
  const reviewState = await transitionTaskState({ rootDir, taskId: 'approval-task', toState: 'REQUIREMENT_REVIEW' });

  assert.equal(reviewState.approved_artifacts.spec, false);

  await setReviewDecision(join(rootDir, 'tasks/approval-task/02-review/requirement-review.md'), '通过');

  const plannedState = await transitionTaskState({
    rootDir,
    taskId: 'approval-task',
    toState: 'TASK_PLANNED'
  });

  assert.equal(plannedState.current_state, 'TASK_PLANNED');
  assert.equal(plannedState.approved_artifacts.spec, true);
  assert.equal(plannedState.approved_artifacts.prototype, false);
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
  await setReviewDecision(join(rootDir, 'tasks/review-task/02-review/requirement-review.md'), '通过');

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

  await setReviewDecision(join(rootDir, 'tasks/review-task/02-review/requirement-review.md'), '驳回');

  const rejectedState = await transitionTaskState({
    rootDir,
    taskId: 'review-task',
    toState: 'REQUIREMENT_REJECTED'
  });

  assert.equal(rejectedState.current_state, 'REQUIREMENT_REJECTED');
  assert.equal(rejectedState.owner, 'spec-agent');
  assert.deepEqual(rejectedState.allowed_write_paths, ['00-intake/', '01-spec/']);
});

test('validateTaskWorkspace rejects approval state that disagrees with review decisions', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'approval-mismatch',
    title: 'Approval Mismatch',
    goal: 'Validate approval binding'
  });

  const statePath = join(rootDir, 'tasks/approval-mismatch/state.json');
  const state = await readJson(statePath);
  state.current_state = 'REQUIREMENT_REVIEW';
  state.previous_state = 'SPEC_DRAFT';
  state.owner = 'requirement-reviewer';
  state.active_agents = ['requirement-reviewer', 'ui-reviewer', 'api-reviewer', 'test-reviewer'];
  state.allowed_write_paths = ['02-review/'];
  state.approved_artifacts.spec = true;
  await writeJson(statePath, state);

  const report = await validateTaskWorkspace({ rootDir, taskId: 'approval-mismatch' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('state.approved_artifacts.spec')));
});

test('auditTaskWorkspace escalates governance drift back to TASK_PLANNED', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'audit-governance',
    title: 'Audit Governance',
    goal: 'Validate governance escalation'
  });

  await writeFile(join(rootDir, 'tasks/audit-governance/03-plan/task-breakdown.md'), '# Task Breakdown\n', 'utf8');

  const report = await auditTaskWorkspace({
    rootDir,
    taskId: 'audit-governance'
  });

  assert.equal(report.decision, 'reject');
  assert.equal(report.recommendedRollbackState, 'TASK_PLANNED');
  assert.equal(report.escalation.target, 'shangshu');
  assert.ok(report.findings.some(finding => finding.category === 'governance'));

  const state = await readJson(join(rootDir, 'tasks/audit-governance/state.json'));
  const review = await readFile(join(rootDir, 'tasks/audit-governance/09-audit/review.md'), 'utf8');
  const findings = await readFile(join(rootDir, 'tasks/audit-governance/09-audit/findings.md'), 'utf8');

  assert.ok(state.blocked_by.some(entry => entry.includes('TASK_PLANNED')));
  assert.ok(state.risks.some(risk => risk.owner === 'audit-agent'));
  assert.match(review, /## 结论\s*\r?\n-\s*驳回/);
  assert.match(review, /## 升级处理/);
  assert.match(findings, /## 通知/);
});

test('auditTaskWorkspace escalates execution drift back to BUILD_IN_PROGRESS', async () => {
  const rootDir = await makeWorkspace();
  await scaffoldTaskWorkspace({
    rootDir,
    taskId: 'audit-execution',
    title: 'Audit Execution',
    goal: 'Validate execution escalation'
  });

  const statePath = join(rootDir, 'tasks/audit-execution/state.json');
  const state = await readJson(statePath);
  state.current_state = 'INTEGRATION_VERIFY';
  state.previous_state = 'BUILD_IN_PROGRESS';
  state.owner = 'frontend-agent';
  state.active_agents = ['frontend-agent', 'backend-agent', 'database-agent', 'rules-agent', 'test-agent', 'verify-agent'];
  state.allowed_write_paths = ['02-review/'];
  await writeJson(statePath, state);

  const report = await auditTaskWorkspace({
    rootDir,
    taskId: 'audit-execution'
  });

  assert.equal(report.decision, 'reject');
  assert.equal(report.recommendedRollbackState, 'BUILD_IN_PROGRESS');
  assert.ok(report.findings.some(finding => finding.category === 'execution'));

  const compliance = await readFile(join(rootDir, 'tasks/audit-execution/09-audit/compliance.md'), 'utf8');
  assert.match(compliance, /## 建议动作/);
  assert.match(compliance, /BUILD_IN_PROGRESS/);
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
