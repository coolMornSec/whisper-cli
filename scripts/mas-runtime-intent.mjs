import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDecision } from './mas-gates.mjs';
import { readRuntimeControl } from './mas-runtime-store.mjs';
import { departmentForAgent, resolveTaskFile } from './mas-utils.mjs';

const REVIEW_STATES = {
  REQUIREMENT_REVIEW: {
    document: '02-review/requirement-review.md',
    title: '需求评审',
    pass_to: 'TASK_PLANNED',
    reject_to: 'REQUIREMENT_REJECTED'
  },
  UI_REVIEW: {
    document: '02-review/ui-review.md',
    title: 'UI 评审',
    pass_to: 'API_DESIGNED',
    reject_to: 'UI_REJECTED'
  },
  API_REVIEW: {
    document: '02-review/api-review.md',
    title: 'API 评审',
    pass_to: 'RULES_FROZEN',
    reject_to: 'API_REJECTED'
  },
  TEST_REVIEW: {
    document: '02-review/test-review.md',
    title: '测试评审',
    pass_to: 'BUILD_IN_PROGRESS',
    reject_to: 'TEST_REJECTED'
  },
  AUDIT_REVIEW: {
    document: '09-audit/review.md',
    title: '审计评审',
    pass_to: 'DONE',
    reject_to: 'AUDIT_FAILED'
  }
};

const WORK_STATE_OUTPUTS = {
  INTAKE: [],
  SPEC_DRAFT: ['01-spec/spec.md', '01-spec/acceptance.md', '01-spec/non-goals.md'],
  TASK_PLANNED: ['03-plan/task-breakdown.md', '03-plan/dependency-map.md', '03-plan/ownership.md'],
  PROTOTYPE_DRAFT: ['04-design/prototype.md'],
  API_DESIGNED: ['04-design/api-contract.yaml', '04-design/data-model.md', '04-design/migration-plan.md'],
  RULES_FROZEN: [],
  TESTS_DRAFTED: ['05-rules/rules.md', '05-rules/allowed-files.md', '05-rules/dependency-policy.md', '05-rules/quality-gates.md', '06-tests/test-cases.md'],
  BUILD_IN_PROGRESS: ['07-build/generated-summary.md'],
  INTEGRATION_VERIFY: ['08-verify/test-results.md', '08-verify/contract-results.md', '08-verify/build-results.md', '08-verify/integration-results.md'],
  REQUIREMENT_REJECTED: [],
  UI_REJECTED: [],
  API_REJECTED: [],
  TEST_REJECTED: [],
  VERIFY_FAILED: [],
  AUDIT_FAILED: []
};

const UPSTREAM_INPUTS = {
  INTAKE: ['00-intake/request.md', '00-intake/context.md', '00-intake/constraints.md', 'manifest.json', 'state.json', 'runtime/control.json'],
  SPEC_DRAFT: ['00-intake/request.md', '00-intake/context.md', '00-intake/constraints.md', 'manifest.json', 'state.json', 'AGENT.md'],
  REQUIREMENT_REVIEW: ['01-spec/spec.md', '01-spec/acceptance.md', '01-spec/non-goals.md', 'manifest.json', 'state.json'],
  TASK_PLANNED: ['01-spec/spec.md', '02-review/requirement-review.md', 'manifest.json', 'state.json'],
  PROTOTYPE_DRAFT: ['03-plan/task-breakdown.md', '03-plan/dependency-map.md', '03-plan/ownership.md', 'manifest.json', 'state.json'],
  UI_REVIEW: ['04-design/prototype.md', 'manifest.json', 'state.json'],
  API_DESIGNED: ['04-design/prototype.md', '02-review/ui-review.md', 'manifest.json', 'state.json'],
  API_REVIEW: ['04-design/api-contract.yaml', '04-design/data-model.md', '04-design/migration-plan.md', 'manifest.json', 'state.json'],
  RULES_FROZEN: ['02-review/api-review.md', 'manifest.json', 'state.json'],
  TESTS_DRAFTED: ['05-rules/rules.md', '05-rules/allowed-files.md', '05-rules/dependency-policy.md', '05-rules/quality-gates.md', 'manifest.json', 'state.json'],
  TEST_REVIEW: ['06-tests/test-cases.md', 'manifest.json', 'state.json'],
  BUILD_IN_PROGRESS: ['02-review/test-review.md', 'manifest.json', 'state.json'],
  INTEGRATION_VERIFY: ['07-build/generated-summary.md', 'manifest.json', 'state.json'],
  AUDIT_REVIEW: ['08-verify/test-results.md', '08-verify/contract-results.md', '08-verify/build-results.md', '08-verify/integration-results.md', 'manifest.json', 'state.json', 'runtime/events.jsonl'],
  REQUIREMENT_REJECTED: ['02-review/requirement-review.md', 'manifest.json', 'state.json'],
  UI_REJECTED: ['02-review/ui-review.md', 'manifest.json', 'state.json'],
  API_REJECTED: ['02-review/api-review.md', 'manifest.json', 'state.json'],
  TEST_REJECTED: ['02-review/test-review.md', 'manifest.json', 'state.json'],
  VERIFY_FAILED: ['08-verify/test-results.md', 'manifest.json', 'state.json'],
  AUDIT_FAILED: ['09-audit/review.md', '09-audit/findings.md', '09-audit/risk-register.md', '09-audit/compliance.md', 'manifest.json', 'state.json', 'runtime/events.jsonl'],
  DONE: ['manifest.json', 'state.json', 'runtime/events.jsonl']
};

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function stripMarkdown(markdown) {
  return markdown
    .split(/\r?\n/u)
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.replace(/^- /u, '').trim())
    .join('\n')
    .trim();
}

async function loadTaskContext(rootDir, taskId) {
  const manifest = await readJson(resolveTaskFile(rootDir, taskId, 'manifest.json'));
  const state = await readJson(resolveTaskFile(rootDir, taskId, 'state.json'));
  const control = await readRuntimeControl({ rootDir, taskId });
  const request = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/request.md')));
  const context = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/context.md')));
  const constraints = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/constraints.md')));

  return { taskId, manifest, state, control, request, context, constraints };
}

export function humanActionsForState(stateName) {
  if (REVIEW_STATES[stateName]) {
    return ['approve', 'reject', 'pause'];
  }
  if (stateName === 'DONE') {
    return [];
  }
  return ['pause', 'rollback'];
}

export function nextTransitions(stateName) {
  if (REVIEW_STATES[stateName]) {
    return {
      approve: REVIEW_STATES[stateName].pass_to,
      reject: REVIEW_STATES[stateName].reject_to
    };
  }

  const map = {
    INTAKE: { auto: 'SPEC_DRAFT' },
    SPEC_DRAFT: { auto: 'REQUIREMENT_REVIEW' },
    TASK_PLANNED: { auto: 'PROTOTYPE_DRAFT' },
    PROTOTYPE_DRAFT: { auto: 'UI_REVIEW' },
    API_DESIGNED: { auto: 'API_REVIEW' },
    RULES_FROZEN: { auto: 'TESTS_DRAFTED' },
    TESTS_DRAFTED: { auto: 'TEST_REVIEW' },
    BUILD_IN_PROGRESS: { auto: 'INTEGRATION_VERIFY' },
    INTEGRATION_VERIFY: { auto: 'AUDIT_REVIEW' },
    REQUIREMENT_REJECTED: { auto: 'SPEC_DRAFT' },
    UI_REJECTED: { auto: 'PROTOTYPE_DRAFT' },
    API_REJECTED: { auto: 'API_DESIGNED' },
    TEST_REJECTED: { auto: 'TESTS_DRAFTED' },
    VERIFY_FAILED: { auto: 'BUILD_IN_PROGRESS' },
    AUDIT_FAILED: { auto: 'TASK_PLANNED or BUILD_IN_PROGRESS' },
    DONE: {}
  };

  return map[stateName] ?? {};
}

export function stageGoalForState(stateName, fallbackGoal = '') {
  const defaults = {
    INTAKE: '确认皇帝需求并准备进入规格起草。',
    SPEC_DRAFT: '把皇帝需求整理成可执行规格、验收标准和非目标。',
    REQUIREMENT_REVIEW: '只做评审并给出通过或驳回结论，不代写规格。',
    TASK_PLANNED: '完成任务拆分、依赖关系和责任归属。',
    PROTOTYPE_DRAFT: '输出原型结构和关键交互。',
    UI_REVIEW: '只评审原型是否足以支撑后续 API 设计。',
    API_DESIGNED: '输出 API 契约、数据模型和迁移方案。',
    API_REVIEW: '只评审 API 是否可以冻结。',
    RULES_FROZEN: '冻结规则并准备进入测试设计。',
    TESTS_DRAFTED: '输出规则、门禁和测试用例。',
    TEST_REVIEW: '只评审测试覆盖与门禁是否充分。',
    BUILD_IN_PROGRESS: '生成构建阶段总结并推进实现收敛。',
    INTEGRATION_VERIFY: '产出测试、契约、构建和集成验证结果。',
    AUDIT_REVIEW: '独立审计治理与执行偏差。',
    REQUIREMENT_REJECTED: '根据驳回结论回到规格补写。',
    UI_REJECTED: '根据驳回结论回到原型补写。',
    API_REJECTED: '根据驳回结论回到 API 补写。',
    TEST_REJECTED: '根据驳回结论回到测试补写。',
    VERIFY_FAILED: '根据验证失败结果回到构建修复。',
    AUDIT_FAILED: '根据审计建议回退到正确阶段。',
    DONE: '任务已经完成，当前不需要执行。'
  };

  return defaults[stateName] ?? fallbackGoal;
}

function buildPrompt(task, department, stateName) {
  const review = REVIEW_STATES[stateName];
  const scopeLine = review
    ? `你当前只负责 ${review.title}，禁止代替生产部门修改其交付物。`
    : `你当前负责 ${stateName} 阶段的生产工作，必须只在授权路径内写入。`;

  const transitionLine = review
    ? `本阶段只能给出“通过”或“驳回”结论；通过后进入 ${review.pass_to}，驳回后进入 ${review.reject_to}。`
    : `完成当前阶段后，按状态机推进到 ${nextTransitions(stateName).auto ?? '下一个合法阶段'}。`;

  return [
    `你是 ${department} 部门的执行 Agent，服务于任务 ${task.manifest.task_id}。`,
    `任务标题：${task.manifest.title}`,
    `任务目标：${task.manifest.goal}`,
    `当前状态：${stateName}`,
    `当前 owner：${task.state.owner}`,
    scopeLine,
    transitionLine,
    `必须先读取：${UPSTREAM_INPUTS[stateName].join(', ')}`,
    `允许写入：${task.state.allowed_write_paths.join(', ') || '无'}`,
    `期望输出：${(REVIEW_STATES[stateName] ? [REVIEW_STATES[stateName].document] : WORK_STATE_OUTPUTS[stateName] ?? []).join(', ') || '无新增文件'}`,
    `皇帝需求摘要：${task.request}`,
    `上下文摘要：${task.context || '无附加背景'}`,
    `约束摘要：${task.constraints || '无附加约束'}`,
    '写完后必须留下清晰证据，使 shangshu、menxia 和 yushitai 可以继续推进。'
  ].join('\n');
}

export async function buildExecutionIntent({ rootDir, taskId }) {
  const task = await loadTaskContext(rootDir, taskId);
  const stateName = task.state.current_state;
  const department = departmentForAgent(task.state.owner, task.manifest.departments);
  const review = REVIEW_STATES[stateName] ?? null;
  const reviewDecision = review ? parseDecision(await readText(resolveTaskFile(rootDir, taskId, review.document))) : null;

  return {
    task_id: taskId,
    title: task.manifest.title,
    priority: task.manifest.priority,
    goal: task.manifest.goal,
    current_state: stateName,
    owner: task.state.owner,
    active_agents: task.state.active_agents,
    blocked_by: task.state.blocked_by,
    department,
    paused: task.control.paused,
    runtime_status: task.control.status,
    blocker: task.control.current_blocker,
    allowed_write_paths: task.state.allowed_write_paths,
    required_inputs: UPSTREAM_INPUTS[stateName] ?? ['manifest.json', 'state.json'],
    expected_outputs: review ? [review.document] : (WORK_STATE_OUTPUTS[stateName] ?? []),
    next_transitions: nextTransitions(stateName),
    human_actions: humanActionsForState(stateName),
    review_document: review?.document ?? null,
    current_review_decision: reviewDecision,
    stage_goal: stageGoalForState(stateName, task.manifest.goal),
    emperor_request: task.request,
    business_context: task.context,
    constraints: task.constraints,
    prompt: buildPrompt(task, department, stateName)
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--task-id') {
      options.taskId = value;
      index += 1;
    } else if (key === '--markdown') {
      options.markdown = true;
    }
  }
  return options;
}

function renderIntentMarkdown(intent) {
  return `# ${intent.task_id}

- 当前状态: ${intent.current_state}
- 当前部门: ${intent.department}
- 当前 owner: ${intent.owner}
- 运行时状态: ${intent.runtime_status}
- 阶段目标: ${intent.stage_goal}
- 允许写入: ${intent.allowed_write_paths.join(', ') || '无'}
- 必读输入: ${intent.required_inputs.join(', ')}
- 预期输出: ${intent.expected_outputs.join(', ') || '无新增文件'}
- 下一步: ${Object.entries(intent.next_transitions).map(([key, value]) => `${key} -> ${value}`).join(' | ') || '无'}
- 人工动作: ${intent.human_actions.join(', ') || '无'}

## Prompt
${intent.prompt}
`;
}

async function runCli() {
  const rootDir = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  if (!options.taskId) {
    console.error('Usage: node scripts/mas-runtime-intent.mjs --task-id <task-id> [--markdown]');
    process.exitCode = 1;
    return;
  }

  const intent = await buildExecutionIntent({ rootDir, taskId: options.taskId });
  console.log(options.markdown ? renderIntentMarkdown(intent) : JSON.stringify(intent, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await runCli();
}
