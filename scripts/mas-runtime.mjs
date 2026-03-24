import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditTaskWorkspace } from './mas-audit.mjs';
import { transitionTaskState } from './mas-controller.mjs';
import { STATE_TRANSITIONS } from './mas-policy.mjs';
import { buildExecutionIntent, humanActionsForState, nextTransitions, stageGoalForState } from './mas-runtime-intent.mjs';
import { invokeCommandDriver, invokeModuleDriver, normalizeDriver } from './mas-runtime-driver.mjs';
import {
  appendTaskEvent,
  ensureRuntimeFiles,
  isLeaseActive,
  listTaskIds,
  makeLease,
  readRuntimeControl,
  readTaskEvents,
  updateRuntimeControl,
  writeRuntimeControl
} from './mas-runtime-store.mjs';
import { departmentForAgent, resolveTaskFile } from './mas-utils.mjs';
import { scaffoldTaskWorkspace, validateTaskWorkspace } from './task-docs.mjs';

const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const DEFAULT_LOOP_INTERVAL_MS = 2000;
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const REVIEW_CONFIG = {
  REQUIREMENT_REVIEW: ['02-review/requirement-review.md', '需求评审', 'requirement-reviewer', 'TASK_PLANNED', 'REQUIREMENT_REJECTED'],
  UI_REVIEW: ['02-review/ui-review.md', 'UI 评审', 'ui-reviewer', 'API_DESIGNED', 'UI_REJECTED'],
  API_REVIEW: ['02-review/api-review.md', 'API 评审', 'api-reviewer', 'RULES_FROZEN', 'API_REJECTED'],
  TEST_REVIEW: ['02-review/test-review.md', '测试评审', 'test-reviewer', 'BUILD_IN_PROGRESS', 'TEST_REJECTED'],
  AUDIT_REVIEW: ['09-audit/review.md', '审计评审', 'audit-agent', 'DONE', 'AUDIT_FAILED']
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms));
}

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

function stripMarkdown(markdown) {
  return markdown
    .split(/\r?\n/u)
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.replace(/^- /u, '').trim())
    .join('\n')
    .trim();
}

async function loadTask(rootDir, taskId) {
  const manifest = await readJson(resolveTaskFile(rootDir, taskId, 'manifest.json'));
  const state = await readJson(resolveTaskFile(rootDir, taskId, 'state.json'));
  const control = await readRuntimeControl({ rootDir, taskId });
  const request = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/request.md')));
  const context = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/context.md')));
  const constraints = stripMarkdown(await readText(resolveTaskFile(rootDir, taskId, '00-intake/constraints.md')));
  return { taskId, manifest, state, control, request, context, constraints };
}

async function loadTaskSurface(rootDir, taskId) {
  const manifest = await readJson(resolveTaskFile(rootDir, taskId, 'manifest.json'));
  const state = await readJson(resolveTaskFile(rootDir, taskId, 'state.json'));
  const control = await readRuntimeControl({ rootDir, taskId });
  return { taskId, manifest, state, control };
}

function checklist(items) {
  return `## 完成检查清单\n${items.map(item => `- [x] ${item}`).join('\n')}`;
}

function reviewDoc(title, decision, findings, followUps) {
  return `# ${title}

## 评审范围
- 自动评审当前阶段产物与门禁条件。

## 发现
- ${findings}

## 结论
- ${decision === 'pass' ? '通过' : '驳回'}

## 后续动作
- ${followUps}
`;
}

function filesForState(task) {
  const { manifest, request, context, constraints } = task;
  const base = {
    spec: {
      '01-spec/spec.md': `# 任务规格

## 任务目标
- ${manifest.goal}

## 业务背景
- ${context || '皇帝已下达任务，要求系统按 MAS V1 自动推进。'}

## 范围
### In Scope
- 全阶段制度化推进
- 任务看板、事件流与人工介入
### Out Of Scope
- 部署和运维自动化

## 输入输出
- 输入：${request || manifest.goal}
- 输出：满足 MAS V1 约束的阶段文档、状态、事件和审计证据

## 验收标准
- 状态流转、评审、审计和人工介入都能被记录
- 看板能直接展示进度与阻塞
- 执行器不绕过制度真相源

${checklist(['规格可被下游部门直接消费', '约束与验收标准明确', '系统可继续自动推进'])}
`,
      '01-spec/acceptance.md': `# 验收标准

## 验收检查清单
- 任务可自动入队并推进。
- 阻塞和人工动作会写回事件流。
- 审计结果能触发回退。
`,
      '01-spec/non-goals.md': `# 非目标

## 暂缓项
- 不实现部署和运维。
- 不引入仓库外制度真相源。
`
    },
    plan: {
      '03-plan/task-breakdown.md': `# 任务拆分

## 工作流拆分
- zhongshu 固化规格
- menxia 完成四类评审
- libu_task_breakdown 负责规划
- libu_prototype 负责原型
- gongbu 负责 API 与构建
- xingbu 负责规则、测试与验证
- yushitai 负责审计

## 交付物映射
- 01-spec/ -> 规格
- 02-review/ -> 评审
- 03-plan/ -> 规划
- 04-design/ -> 设计
- 05-rules/ 06-tests/ -> 规则与测试
- 07-build/ 08-verify/ -> 构建与验证
- 09-audit/ -> 审计

${checklist(['责任清晰', '依赖明确', '回退路径已定义'])}
`,
      '03-plan/dependency-map.md': `# 依赖关系图

## 关键路径
- SPEC_DRAFT -> REQUIREMENT_REVIEW -> TASK_PLANNED -> PROTOTYPE_DRAFT -> UI_REVIEW -> API_DESIGNED -> API_REVIEW -> RULES_FROZEN -> TESTS_DRAFTED -> TEST_REVIEW -> BUILD_IN_PROGRESS -> INTEGRATION_VERIFY -> AUDIT_REVIEW -> DONE

## 并行说明
- BUILD_IN_PROGRESS 和 INTEGRATION_VERIFY 允许并行角色协作。
`,
      '03-plan/ownership.md': `# 责任归属

## 部门归属
- shangshu 是唯一总控
- 生产与评审分离
- 审计独立于生产与评审

## 交接规则
- 所有推进必须留下文档和事件证据。
- 评审只给结论，不直接代写生产产物。
`
    },
    prototype: {
      '04-design/prototype.md': `# 原型设计

## 页面结构
- 皇帝需求入口
- 任务看板
- 阶段/阻塞详情
- 最近事件流
- 人工介入记录

## 交互规则
- 默认自动推进
- 评审与审计节点允许人工介入

${checklist(['总览可见', '阻塞可解释', '可驱动 API 设计'])}
`
    },
    api: {
      '04-design/api-contract.yaml': `openapi: 3.1.0
info:
  title: ${manifest.title} Runtime Contract
  version: 1.0.0
paths:
  /tasks/{taskId}/state:
    get:
      summary: 获取任务状态
  /tasks/{taskId}/board:
    get:
      summary: 获取任务看板摘要
  /tasks/{taskId}/events:
    get:
      summary: 获取任务事件流
  /tasks/{taskId}/interventions:
    post:
      summary: 提交人工介入动作
`,
      '04-design/data-model.md': `# 数据模型

## 实体
- manifest.json：制度定义
- state.json：运行时状态
- runtime/control.json：租约、阻塞、暂停与人工动作
- runtime/events.jsonl：机器可读事件流

## 状态记录
- review / audit 文档为证据层
- agent-log.md 为人类可读执行日志
`,
      '04-design/migration-plan.md': `# 迁移计划

## 迁移步骤
- 引入 runtime/ 目录
- 保持 state/manifest 为真相源
- 增加仓库外执行器和任务看板

## 回滚说明
- 外部执行器失效时仍可手动运行原有命令恢复
`
    },
    rules: {
      '05-rules/rules.md': `# 规则清单

## 生效规则

### RULE-RUNTIME-001
- 约束内容: 同一任务同一时刻只允许一个有效租约

### RULE-RUNTIME-002
- 约束内容: 人工动作必须写入事件流并回写状态层

${checklist(['租约可校验', '人工介入有记录', '规则与状态机一致'])}
`,
      '05-rules/allowed-files.md': `# 允许文件

## 部门路径
- shangshu -> 03-plan/, runtime/
- 其余部门继续遵守原有写入范围
`,
      '05-rules/dependency-policy.md': `# 依赖策略

## 允许依赖
- 仅使用 Node.js 内置模块

## 禁止变更
- 不引入外部数据库和前端框架
`,
      '05-rules/quality-gates.md': `# 质量门禁

## 门禁矩阵
- REQUIREMENT_REVIEW -> TASK_PLANNED
- UI_REVIEW -> API_DESIGNED
- API_REVIEW -> RULES_FROZEN
- TEST_REVIEW -> BUILD_IN_PROGRESS
- AUDIT_REVIEW -> DONE
`,
      '06-tests/test-cases.md': `# 测试用例

## 用例列表

### CASE-RUNTIME-001
- 输入: 皇帝提交任务
- 预期输出: 任务被脚手架化并写入入队事件

### CASE-RUNTIME-002
- 输入: 调度器持续运行
- 预期输出: 任务从 INTAKE 自动推进到 DONE

### CASE-RUNTIME-003
- 输入: 人工暂停或驳回
- 预期输出: 流程停止或走回退分支

## 覆盖范围
- 调度、租约、人工介入、审计、看板与事件流
`
    },
    build: {
      '07-build/generated-summary.md': `# 构建总结

## 生成产物
- 已生成看板可消费的状态与事件
- 已补齐运行时文档与验证文档

${checklist(['构建结果可验证', '输出位于授权目录', '可进入验证阶段'])}
`
    },
    verify: {
      '08-verify/test-results.md': `# 测试结果

## 验证摘要
- 运行时调度、看板和人工介入能力已具备。
`,
      '08-verify/contract-results.md': `# 契约结果

## 验证摘要
- manifest、state、runtime/control 和 runtime/events 已保持一致。
`,
      '08-verify/build-results.md': `# 构建结果

## 验证摘要
- 所有要求的阶段文件已可被 validate 和 audit 消费。
`,
      '08-verify/integration-results.md': `# 集成结果

## 验证摘要
- 制度层、执行层与看板摘要已作为一个整体工作。
`
    }
  };

  return base;
}

async function writeFileMap(rootDir, taskId, fileMap) {
  for (const [relativePath, content] of Object.entries(fileMap)) {
    await writeText(resolveTaskFile(rootDir, taskId, relativePath), content);
  }
}

async function appendAgentLog(rootDir, taskId, stage, agentId, summary) {
  const filePath = resolveTaskFile(rootDir, taskId, 'agent-log.md');
  let current = '';
  try {
    current = await readText(filePath);
  } catch {
    current = '# Agent 执行日志\n\n## 阶段记录\n';
  }
  await writeText(filePath, `${current.trimEnd()}\n\n### ${stage} - ${agentId}\n- 时间: ${nowIso()}\n- 摘要: ${summary}\n`);
}

async function transitionWithEvent(rootDir, taskId, fromState, toState, actorId) {
  const next = await transitionTaskState({ rootDir, taskId, toState });
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'STATE_TRANSITIONED',
    actor: { kind: 'agent', id: actorId },
    summary: `状态从 ${fromState} 进入 ${toState}`,
    detail: {},
    state: { from: fromState, to: toState },
    stage: toState,
    department: departmentForAgent(actorId)
  });
  return next;
}

async function clearRuntimeFlags(rootDir, taskId) {
  await updateRuntimeControl({
    rootDir,
    taskId,
    mutate: control => {
      control.current_blocker = null;
      control.pending_human_actions = [];
      if (!control.paused && control.status !== 'completed' && control.status !== 'failed') {
        control.status = 'queued';
      }
    }
  });
}

async function blockTask(rootDir, taskId, status, kind, code, message) {
  await updateRuntimeControl({
    rootDir,
    taskId,
    mutate: control => {
      control.status = status;
      control.current_blocker = { kind, code, message, at: nowIso() };
    }
  });
}

async function leaseTask(rootDir, taskId, owner, leaseMs) {
  const control = await readRuntimeControl({ rootDir, taskId });
  if (control.paused || isLeaseActive(control)) {
    return null;
  }
  const lease = makeLease({ owner, leaseMs });
  await writeRuntimeControl({
    rootDir,
    taskId,
    control: {
      ...control,
      status: 'running',
      lease,
      retry_policy: {
        ...control.retry_policy,
        total_attempts: control.retry_policy.total_attempts + 1
      },
      updated_at: nowIso()
    }
  });
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'TASK_LEASED',
    actor: { kind: 'system', id: owner },
    summary: `${taskId} 已被执行器领取`,
    detail: { lease_token: lease.token }
  });
  return lease;
}

async function releaseLease(rootDir, taskId, leaseToken) {
  await updateRuntimeControl({
    rootDir,
    taskId,
    mutate: control => {
      if (control.lease?.token === leaseToken) {
        control.lease = null;
        if (!control.paused && control.status !== 'completed' && control.status !== 'failed') {
          control.status = control.current_blocker ? 'blocked' : 'queued';
        }
      }
    }
  });
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'LEASE_RELEASED',
    actor: { kind: 'system', id: 'shangshu-runtime' },
    summary: '执行租约已释放',
    detail: { lease_token: leaseToken }
  });
}

function defaultTargetForState(task) {
  const { state, control } = task;
  const map = {
    INTAKE: 'SPEC_DRAFT',
    SPEC_DRAFT: 'REQUIREMENT_REVIEW',
    TASK_PLANNED: 'PROTOTYPE_DRAFT',
    PROTOTYPE_DRAFT: 'UI_REVIEW',
    API_DESIGNED: 'API_REVIEW',
    RULES_FROZEN: 'TESTS_DRAFTED',
    TESTS_DRAFTED: 'TEST_REVIEW',
    BUILD_IN_PROGRESS: 'INTEGRATION_VERIFY',
    INTEGRATION_VERIFY: 'AUDIT_REVIEW',
    REQUIREMENT_REJECTED: 'SPEC_DRAFT',
    UI_REJECTED: 'PROTOTYPE_DRAFT',
    API_REJECTED: 'API_DESIGNED',
    TEST_REJECTED: 'TESTS_DRAFTED',
    VERIFY_FAILED: 'BUILD_IN_PROGRESS',
    AUDIT_FAILED: control.current_blocker?.code ?? 'BUILD_IN_PROGRESS'
  };

  return map[state.current_state] ?? null;
}

async function validateWorkspaceAfterDriverAction(rootDir, taskId) {
  const report = await validateTaskWorkspace({ rootDir, taskId });
  if (!report.valid) {
    throw new Error(`Workspace validation failed after driver action:\n- ${report.errors.join('\n- ')}`);
  }
}

async function applyReviewDecision(rootDir, task, decision, reason = '') {
  const { taskId, state } = task;
  const [file, title, actorId, passTo, rejectTo] = REVIEW_CONFIG[state.current_state];
  const nextState = decision === 'pass' ? passTo : rejectTo;

  await writeText(
    resolveTaskFile(rootDir, taskId, file),
    reviewDoc(title, decision, reason || '外部执行器给出了明确结论。', `${decision === 'pass' ? '通过' : '驳回'}后进入 ${nextState}。`)
  );
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'REVIEW_DECISION_CHANGED',
    actor: { kind: 'agent', id: actorId },
    summary: `${title}已${decisionLabel(decision)}`,
    detail: { decision, reason },
    stage: state.current_state,
    department: departmentForAgent(actorId)
  });
  await transitionWithEvent(rootDir, taskId, state.current_state, nextState, actorId);
  await clearRuntimeFlags(rootDir, taskId);
}

async function applyAuditDecision(rootDir, task, decision, reason = '', recommendedRollbackState = null) {
  const { taskId } = task;
  const [file, title, actorId] = REVIEW_CONFIG.AUDIT_REVIEW;
  const rollbackState = recommendedRollbackState ?? 'BUILD_IN_PROGRESS';

  await writeText(
    resolveTaskFile(rootDir, taskId, file),
    `${reviewDoc(title, decision, reason || '外部执行器给出了审计结论。', decision === 'reject' ? `建议回退到 ${rollbackState}。` : '允许进入 DONE。').trimEnd()}\n\n## 升级处理\n- ${decision === 'reject' ? `建议 shangshu 组织回退到 ${rollbackState}` : '无需升级处理'}\n`
  );

  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'AUDIT_DECISION_CHANGED',
    actor: { kind: 'agent', id: actorId },
    summary: `${title}已${decisionLabel(decision)}`,
    detail: { decision, reason, recommended_rollback: decision === 'reject' ? rollbackState : null },
    stage: 'AUDIT_REVIEW',
    department: departmentForAgent(actorId)
  });

  if (decision === 'reject') {
    await blockTask(rootDir, taskId, 'blocked', 'audit_reject', rollbackState, reason || `审计建议回退到 ${rollbackState}`);
    await appendTaskEvent({
      rootDir,
      taskId,
      type: 'GATE_BLOCKED',
      actor: { kind: 'agent', id: actorId },
      summary: `审计驳回阻塞了任务，建议回退到 ${rollbackState}`,
      detail: { recommended_rollback: rollbackState, reason },
      stage: 'AUDIT_REVIEW',
      department: departmentForAgent(actorId)
    });
    await transitionWithEvent(rootDir, taskId, 'AUDIT_REVIEW', 'AUDIT_FAILED', actorId);
    return;
  }

  await transitionWithEvent(rootDir, taskId, 'AUDIT_REVIEW', 'DONE', actorId);
  await updateRuntimeControl({
    rootDir,
    taskId,
    mutate: control => {
      control.status = 'completed';
      control.current_blocker = null;
      control.pending_human_actions = [];
    }
  });
}

async function executeStateWithExternalDriver(rootDir, task, { driver, driverCommand, driverModule, driverTimeoutMs }) {
  const actorId = task.state.owner;
  const department = departmentForAgent(actorId, task.manifest.departments);
  const intent = await buildExecutionIntent({ rootDir, taskId: task.taskId });

  await appendTaskEvent({
    rootDir,
    taskId: task.taskId,
    type: 'AGENT_STARTED',
    actor: { kind: 'agent', id: actorId },
    summary: `${actorId} 已通过 ${driver} 驱动接收 ${task.state.current_state}`,
    detail: { driver, command: driverCommand, module: driverModule },
    stage: task.state.current_state,
    department
  });

  const payload = {
    task_id: task.taskId,
    driver,
    department,
    actor_id: actorId,
    intent
  };
  const result = driver === 'command'
    ? await invokeCommandDriver({ rootDir, command: driverCommand, payload, timeoutMs: driverTimeoutMs })
    : await invokeModuleDriver({ modulePath: driverModule, payload });

  const summary = typeof result.summary === 'string' && result.summary.length > 0
    ? result.summary
    : `${actorId} 已完成 ${task.state.current_state}`;

  if (REVIEW_CONFIG[task.state.current_state]) {
    if (task.state.current_state === 'AUDIT_REVIEW') {
      if (!['pass', 'reject'].includes(result.audit_decision)) {
        throw new Error('command driver must return audit_decision=pass|reject for AUDIT_REVIEW');
      }
      await applyAuditDecision(rootDir, task, result.audit_decision, result.reason ?? '', result.recommended_rollback_state ?? null);
    } else {
      if (!['pass', 'reject'].includes(result.review_decision)) {
        throw new Error(`command driver must return review_decision=pass|reject for ${task.state.current_state}`);
      }
      await applyReviewDecision(rootDir, task, result.review_decision, result.reason ?? '');
    }
  } else {
    const nextState = result.next_state ?? defaultTargetForState(task);
    if (!nextState) {
      throw new Error(`command driver did not provide next_state for ${task.state.current_state}`);
    }
    await appendAgentLog(rootDir, task.taskId, task.state.current_state, actorId, summary);
    await transitionWithEvent(rootDir, task.taskId, task.state.current_state, nextState, actorId);
    await clearRuntimeFlags(rootDir, task.taskId);
  }

  await validateWorkspaceAfterDriverAction(rootDir, task.taskId);
  const nextTask = await loadTask(rootDir, task.taskId);
  await appendTaskEvent({
    rootDir,
    taskId: task.taskId,
    type: nextTask.state.current_state === 'DONE' ? 'TASK_COMPLETED' : 'AGENT_COMPLETED',
    actor: { kind: 'agent', id: actorId },
    summary,
    detail: { driver, result },
    stage: nextTask.state.current_state,
    department
  });
}

async function executeWorkState(rootDir, task) {
  const { taskId, state, manifest } = task;
  const actorId = state.owner;
  const family = filesForState(task);

  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'AGENT_STARTED',
    actor: { kind: 'agent', id: actorId },
    summary: `${actorId} 开始处理 ${state.current_state}`,
    detail: {},
    stage: state.current_state,
    department: departmentForAgent(actorId, manifest.departments)
  });

  let target = null;
  if (state.current_state === 'INTAKE') target = 'SPEC_DRAFT';
  if (state.current_state === 'SPEC_DRAFT') {
    await writeFileMap(rootDir, taskId, family.spec);
    target = 'REQUIREMENT_REVIEW';
  }
  if (state.current_state === 'TASK_PLANNED') {
    await writeFileMap(rootDir, taskId, family.plan);
    target = 'PROTOTYPE_DRAFT';
  }
  if (state.current_state === 'PROTOTYPE_DRAFT') {
    await writeFileMap(rootDir, taskId, family.prototype);
    target = 'UI_REVIEW';
  }
  if (state.current_state === 'API_DESIGNED') {
    await writeFileMap(rootDir, taskId, family.api);
    target = 'API_REVIEW';
  }
  if (state.current_state === 'RULES_FROZEN') {
    target = 'TESTS_DRAFTED';
  }
  if (state.current_state === 'TESTS_DRAFTED') {
    await writeFileMap(rootDir, taskId, family.rules);
    target = 'TEST_REVIEW';
  }
  if (state.current_state === 'BUILD_IN_PROGRESS') {
    await writeFileMap(rootDir, taskId, family.build);
    target = 'INTEGRATION_VERIFY';
  }
  if (state.current_state === 'INTEGRATION_VERIFY') {
    await writeFileMap(rootDir, taskId, family.verify);
    target = 'AUDIT_REVIEW';
  }
  if (state.current_state === 'REQUIREMENT_REJECTED') target = 'SPEC_DRAFT';
  if (state.current_state === 'UI_REJECTED') target = 'PROTOTYPE_DRAFT';
  if (state.current_state === 'API_REJECTED') target = 'API_DESIGNED';
  if (state.current_state === 'TEST_REJECTED') target = 'TESTS_DRAFTED';
  if (state.current_state === 'VERIFY_FAILED') target = 'BUILD_IN_PROGRESS';
  if (state.current_state === 'AUDIT_FAILED') target = task.control.current_blocker?.code ?? 'BUILD_IN_PROGRESS';

  if (!target) {
    throw new Error(`No work-state handler for ${state.current_state}`);
  }

  await appendAgentLog(rootDir, taskId, state.current_state, actorId, `已完成 ${state.current_state} 阶段处理。`);
  const nextState = await transitionWithEvent(rootDir, taskId, state.current_state, target, actorId);
  await clearRuntimeFlags(rootDir, taskId);

  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'AGENT_COMPLETED',
    actor: { kind: 'agent', id: actorId },
    summary: `${actorId} 已完成 ${state.current_state}`,
    detail: {},
    stage: nextState.current_state,
    department: departmentForAgent(actorId, manifest.departments)
  });
}

async function executeReviewState(rootDir, task) {
  const { taskId, state } = task;
  const [file, title, actorId, passTo] = REVIEW_CONFIG[state.current_state];

  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'AGENT_STARTED',
    actor: { kind: 'agent', id: actorId },
    summary: `${title}开始`,
    detail: {},
    stage: state.current_state,
    department: departmentForAgent(actorId)
  });

  if (state.current_state === 'AUDIT_REVIEW') {
    const report = await auditTaskWorkspace({ rootDir, taskId });
    await appendTaskEvent({
      rootDir,
      taskId,
      type: 'AUDIT_DECISION_CHANGED',
      actor: { kind: 'agent', id: actorId },
      summary: `审计结论已更新为${report.decision === 'reject' ? '驳回' : '通过'}`,
      detail: { decision: report.decision, recommended_rollback: report.recommendedRollbackState },
      stage: state.current_state,
      department: departmentForAgent(actorId)
    });
    if (report.decision === 'reject') {
      await blockTask(rootDir, taskId, 'blocked', 'audit_reject', report.recommendedRollbackState ?? 'BUILD_IN_PROGRESS', `审计建议回退到 ${report.recommendedRollbackState ?? 'BUILD_IN_PROGRESS'}`);
      await appendTaskEvent({
        rootDir,
        taskId,
        type: 'GATE_BLOCKED',
        actor: { kind: 'agent', id: actorId },
        summary: `审计驳回阻塞了任务，建议回退到 ${report.recommendedRollbackState ?? 'BUILD_IN_PROGRESS'}`,
        detail: { recommended_rollback: report.recommendedRollbackState ?? 'BUILD_IN_PROGRESS' },
        stage: state.current_state,
        department: departmentForAgent(actorId)
      });
      await transitionWithEvent(rootDir, taskId, 'AUDIT_REVIEW', 'AUDIT_FAILED', actorId);
    } else {
      await transitionWithEvent(rootDir, taskId, 'AUDIT_REVIEW', 'DONE', actorId);
      await updateRuntimeControl({
        rootDir,
        taskId,
        mutate: control => {
          control.status = 'completed';
          control.current_blocker = null;
          control.pending_human_actions = [];
        }
      });
    }
  } else {
    await writeText(resolveTaskFile(rootDir, taskId, file), reviewDoc(title, 'pass', '自动评审确认当前阶段产物完整。', `通过后进入 ${passTo}。`));
    await appendTaskEvent({
      rootDir,
      taskId,
      type: 'REVIEW_DECISION_CHANGED',
      actor: { kind: 'agent', id: actorId },
      summary: `${title}已通过`,
      detail: { decision: 'pass' },
      stage: state.current_state,
      department: departmentForAgent(actorId)
    });
    await transitionWithEvent(rootDir, taskId, state.current_state, passTo, actorId);
    await clearRuntimeFlags(rootDir, taskId);
  }

  await appendAgentLog(rootDir, taskId, state.current_state, actorId, `${title}已完成。`);
  await appendTaskEvent({
    rootDir,
    taskId,
    type: state.current_state === 'AUDIT_REVIEW' ? 'TASK_COMPLETED' : 'AGENT_COMPLETED',
    actor: { kind: 'agent', id: actorId },
    summary: `${title}完成`,
    detail: {},
    stage: state.current_state,
    department: departmentForAgent(actorId)
  });
}

async function markFailure(rootDir, taskId, actorId, error) {
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'AGENT_FAILED',
    actor: { kind: 'agent', id: actorId ?? 'shangshu-runtime' },
    summary: `执行失败：${error.message}`,
    detail: { error: error.stack ?? error.message }
  });
  await updateRuntimeControl({
    rootDir,
    taskId,
    mutate: control => {
      control.status = 'failed';
      control.current_blocker = { kind: 'execution_failure', code: error.name ?? 'Error', message: error.message, at: nowIso() };
      control.retry_policy = {
        ...control.retry_policy,
        consecutive_failures: control.retry_policy.consecutive_failures + 1,
        last_error: error.message,
        last_failure_at: nowIso()
      };
      control.lease = null;
    }
  });
}

function chooseTask(tasks) {
  return tasks.sort((left, right) => {
    const lp = PRIORITY_ORDER[left.manifest.priority] ?? 99;
    const rp = PRIORITY_ORDER[right.manifest.priority] ?? 99;
    if (lp !== rp) return lp - rp;
    return Date.parse(left.state.updated_at) - Date.parse(right.state.updated_at);
  })[0] ?? null;
}

export async function submitTaskRequest({ rootDir, taskId, title, goal, request, context = '', constraints = '' }) {
  if (!taskId || !title || !goal || !request) {
    throw new Error('submit requires taskId, title, goal, and request');
  }
  await scaffoldTaskWorkspace({ rootDir, taskId, title, goal });
  await ensureRuntimeFiles({ rootDir, taskId });
  await writeText(resolveTaskFile(rootDir, taskId, '00-intake/request.md'), `# 用户请求\n\n- 任务 ID: \`${taskId}\`\n- 标题: ${title}\n- 目标: ${goal}\n- 皇帝需求: ${request}\n`);
  if (context) {
    await writeText(resolveTaskFile(rootDir, taskId, '00-intake/context.md'), `# 业务背景\n\n- ${context}\n`);
  }
  if (constraints) {
    const lines = constraints.split(/\r?\n/u).filter(Boolean).map(line => `- ${line}`).join('\n');
    await writeText(resolveTaskFile(rootDir, taskId, '00-intake/constraints.md'), `# 约束条件\n\n${lines}\n`);
  }
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'TASK_ENQUEUED',
    actor: { kind: 'human', id: 'emperor' },
    summary: '皇帝需求已入队',
    detail: { title, goal, request },
    stage: 'INTAKE',
    department: 'zhongshu'
  });
  return loadTask(rootDir, taskId);
}

export async function runSchedulerTick({
  rootDir,
  taskId,
  leaseOwner = 'shangshu-runtime',
  leaseMs = DEFAULT_LEASE_MS,
  driver = 'internal',
  driverCommand = null,
  driverModule = null,
  driverTimeoutMs = 60_000
}) {
  const runtimeDriver = normalizeDriver(driver);
  const ids = taskId ? [taskId] : await listTaskIds(rootDir);
  const tasks = [];
  for (const id of ids) {
    const task = await loadTask(rootDir, id);
    if (task.state.current_state === 'DONE') {
      await updateRuntimeControl({
        rootDir,
        taskId: id,
        mutate: control => {
          control.status = 'completed';
          control.current_blocker = null;
          control.lease = null;
        }
      });
      continue;
    }
    if (!task.control.paused && !isLeaseActive(task.control)) {
      tasks.push(task);
    }
  }

  const task = taskId ? tasks[0] ?? await loadTask(rootDir, taskId) : chooseTask(tasks);
  if (!task) {
    return { status: 'idle', reason: 'no-runnable-task' };
  }
  if (task.control.paused) {
    await blockTask(rootDir, task.taskId, 'paused', 'human_pause', 'PAUSED', task.control.pause_reason ?? '任务已暂停');
    await appendTaskEvent({
      rootDir,
      taskId: task.taskId,
      type: 'GATE_BLOCKED',
      actor: { kind: 'system', id: leaseOwner },
      summary: `任务 ${task.taskId} 因人工暂停而阻塞`,
      detail: { reason: task.control.pause_reason ?? '任务已暂停' }
    });
    return { status: 'paused', taskId: task.taskId };
  }

  const lease = await leaseTask(rootDir, task.taskId, leaseOwner, leaseMs);
  if (!lease) {
    return { status: 'skipped', taskId: task.taskId, reason: 'lease-active-or-paused' };
  }

  try {
    const liveTask = await loadTask(rootDir, task.taskId);
    await updateRuntimeControl({
      rootDir,
      taskId: liveTask.taskId,
      mutate: control => {
        control.pending_human_actions = REVIEW_CONFIG[liveTask.state.current_state] ? ['approve', 'reject', 'pause'] : ['pause'];
      }
    });

    if (runtimeDriver === 'command' || runtimeDriver === 'module') {
      await executeStateWithExternalDriver(rootDir, liveTask, {
        driver: runtimeDriver,
        driverCommand,
        driverModule,
        driverTimeoutMs
      });
    } else if (REVIEW_CONFIG[liveTask.state.current_state]) {
      await executeReviewState(rootDir, liveTask);
    } else {
      await executeWorkState(rootDir, liveTask);
    }

    await releaseLease(rootDir, liveTask.taskId, lease.token);
    const nextTask = await loadTask(rootDir, liveTask.taskId);
    return { status: 'processed', taskId: liveTask.taskId, currentState: nextTask.state.current_state };
  } catch (error) {
    await markFailure(rootDir, task.taskId, task.state.owner, error);
    throw error;
  }
}

export async function runSchedulerLoop({
  rootDir,
  taskId,
  leaseOwner = 'shangshu-runtime',
  leaseMs = DEFAULT_LEASE_MS,
  intervalMs = DEFAULT_LOOP_INTERVAL_MS,
  maxIterations = Infinity,
  driver = 'internal',
  driverCommand = null,
  driverModule = null,
  driverTimeoutMs = 60_000
}) {
  const results = [];
  let count = 0;
  while (count < maxIterations) {
    count += 1;
    const result = await runSchedulerTick({ rootDir, taskId, leaseOwner, leaseMs, driver, driverCommand, driverModule, driverTimeoutMs });
    results.push(result);
    if (result.status === 'idle' || (taskId && result.currentState === 'DONE')) {
      break;
    }
    await sleep(intervalMs);
  }
  return results;
}

function decisionLabel(decision) {
  if (decision === 'pass') return '通过';
  if (decision === 'reject') return '驳回';
  return '待定';
}

function summarizeDecisionEvents(events) {
  const latestReviewDecisions = {};
  let latestAuditDecision = null;
  let latestAuditSummary = null;

  for (const event of events) {
    if (event.type === 'REVIEW_DECISION_CHANGED' && typeof event.stage === 'string') {
      latestReviewDecisions[event.stage] = decisionLabel(event.detail?.decision ?? null);
    }
    if (event.type === 'AUDIT_DECISION_CHANGED') {
      latestAuditDecision = decisionLabel(event.detail?.decision ?? null);
      latestAuditSummary = event.summary ?? null;
    }
  }

  return {
    latest_review_decisions: latestReviewDecisions,
    latest_audit_decision: latestAuditDecision,
    latest_audit_summary: latestAuditSummary
  };
}

function nextActionLabel({ paused, blocker, humanActions, transitions }) {
  if (paused) {
    return '等待皇帝恢复';
  }
  if (blocker?.kind === 'audit_reject') {
    return `等待皇帝回退到 ${blocker.code}`;
  }
  if (blocker?.kind === 'execution_failure') {
    return '等待修复执行失败或人工干预';
  }
  if (humanActions.includes('approve') || humanActions.includes('reject')) {
    return `等待评审结论：${humanActions.join('/')}`;
  }

  const autoTarget = transitions.auto;
  return autoTarget ? `等待自动推进到 ${autoTarget}` : '无后续动作';
}

export async function buildTaskBoard({ rootDir, taskId } = {}) {
  const ids = taskId ? [taskId] : await listTaskIds(rootDir);
  const board = [];
  for (const id of ids) {
    const [task, events] = await Promise.all([
      loadTaskSurface(rootDir, id),
      readTaskEvents({ rootDir, taskId: id })
    ]);
    const eventSummary = summarizeDecisionEvents(events);
    const latestEvents = events.slice(-5);
    const transitions = nextTransitions(task.state.current_state);
    const humanActions = humanActionsForState(task.state.current_state);
    board.push({
      task_id: id,
      title: task.manifest.title,
      priority: task.manifest.priority,
      status: task.control.status,
      current_state: task.state.current_state,
      current_department: departmentForAgent(task.state.owner, task.manifest.departments),
      owner: task.state.owner,
      active_agents: task.state.active_agents,
      blocked_by: task.state.blocked_by,
      blocker: task.control.current_blocker,
      paused: task.control.paused,
      stage_goal: stageGoalForState(task.state.current_state, task.manifest.goal),
      next_transitions: transitions,
      available_human_actions: humanActions,
      next_action: nextActionLabel({
        paused: task.control.paused,
        blocker: task.control.current_blocker,
        humanActions,
        transitions
      }),
      latest_event: latestEvents.at(-1)?.summary ?? null,
      recent_actions: latestEvents.map(event => ({
        type: event.type,
        summary: event.summary,
        ts: event.ts
      })),
      latest_review_decisions: eventSummary.latest_review_decisions,
      latest_audit_decision: eventSummary.latest_audit_decision,
      latest_audit_summary: eventSummary.latest_audit_summary
    });
  }
  return board.sort((left, right) => (PRIORITY_ORDER[left.priority] ?? 99) - (PRIORITY_ORDER[right.priority] ?? 99));
}

function pad(value, width) {
  return String(value ?? '').padEnd(width, ' ');
}

function renderBoard(board) {
  const lines = [`${pad('task_id', 28)} ${pad('state', 20)} ${pad('dept', 18)} ${pad('status', 10)} ${pad('blocked', 18)} ${pad('next_action', 28)} latest_event`];
  for (const item of board) {
    lines.push(`${pad(item.task_id, 28)} ${pad(item.current_state, 20)} ${pad(item.current_department, 18)} ${pad(item.status, 10)} ${pad(item.blocker?.kind ?? '-', 18)} ${pad(item.next_action, 28)} ${item.latest_event ?? '-'}`);
  }
  return lines.join('\n');
}

async function applyHumanReview(rootDir, taskId, reviewState, decision, reason = '') {
  const task = await loadTask(rootDir, taskId);
  if (task.state.current_state !== reviewState) {
    throw new Error(`Task ${taskId} is not in ${reviewState}`);
  }
  const [file, title, , passTo, rejectTo] = REVIEW_CONFIG[reviewState];
  await writeText(resolveTaskFile(rootDir, taskId, file), reviewDoc(title, decision, reason || '皇帝给出了显式结论。', reason || `等待进入 ${decision === 'pass' ? passTo : rejectTo}。`));
  await appendTaskEvent({
    rootDir,
    taskId,
    type: reviewState === 'AUDIT_REVIEW' ? 'AUDIT_DECISION_CHANGED' : 'REVIEW_DECISION_CHANGED',
    actor: { kind: 'human', id: 'emperor' },
    summary: `皇帝将 ${title} 设为${decisionLabel(decision)}`,
    detail: { decision, reason },
    stage: reviewState
  });
  await appendTaskEvent({
    rootDir,
    taskId,
    type: 'HUMAN_INTERVENTION',
    actor: { kind: 'human', id: 'emperor' },
    summary: `皇帝介入 ${title}`,
    detail: { decision, reason }
  });
  await transitionWithEvent(rootDir, taskId, reviewState, decision === 'pass' ? passTo : rejectTo, 'emperor');
  await clearRuntimeFlags(rootDir, taskId);
}

export async function interveneOnTask({ rootDir, taskId, action, reviewState, reason = '', toState = null }) {
  if (action === 'pause') {
    const control = await updateRuntimeControl({
      rootDir,
      taskId,
      mutate: next => {
        next.paused = true;
        next.pause_reason = reason || '皇帝手动暂停';
        next.status = 'paused';
        next.current_blocker = { kind: 'human_pause', code: 'PAUSED', message: next.pause_reason, at: nowIso() };
      }
    });
    await appendTaskEvent({ rootDir, taskId, type: 'HUMAN_INTERVENTION', actor: { kind: 'human', id: 'emperor' }, summary: `皇帝暂停了任务 ${taskId}`, detail: { action, reason: control.pause_reason } });
    return control;
  }
  if (action === 'resume') {
    const control = await updateRuntimeControl({
      rootDir,
      taskId,
      mutate: next => {
        next.paused = false;
        next.pause_reason = null;
        next.status = 'queued';
        next.current_blocker = null;
      }
    });
    await appendTaskEvent({ rootDir, taskId, type: 'HUMAN_INTERVENTION', actor: { kind: 'human', id: 'emperor' }, summary: `皇帝恢复了任务 ${taskId}`, detail: { action } });
    return control;
  }
  if (action === 'approve' || action === 'reject') {
    if (!reviewState) throw new Error('approve/reject requires --review-state');
    await applyHumanReview(rootDir, taskId, reviewState, action === 'approve' ? 'pass' : 'reject', reason);
    return loadTask(rootDir, taskId);
  }
  if (action === 'rollback') {
    if (!toState) throw new Error('rollback requires --to-state');
    const task = await loadTask(rootDir, taskId);
    const allowed = STATE_TRANSITIONS[task.state.current_state] ?? [];
    if (!allowed.includes(toState)) {
      throw new Error(`Illegal rollback transition: ${task.state.current_state} -> ${toState}`);
    }
    await appendTaskEvent({ rootDir, taskId, type: 'HUMAN_INTERVENTION', actor: { kind: 'human', id: 'emperor' }, summary: `皇帝要求回退到 ${toState}`, detail: { action, to_state: toState, reason } });
    await transitionWithEvent(rootDir, taskId, task.state.current_state, toState, 'emperor');
    await clearRuntimeFlags(rootDir, taskId);
    return loadTask(rootDir, taskId);
  }
  throw new Error(`Unknown intervention action: ${action}`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    const value = rest[index + 1];
    if (key === '--task-id') { options.taskId = value; index += 1; }
    else if (key === '--title') { options.title = value; index += 1; }
    else if (key === '--goal') { options.goal = value; index += 1; }
    else if (key === '--request') { options.request = value; index += 1; }
    else if (key === '--context') { options.context = value; index += 1; }
    else if (key === '--constraints') { options.constraints = value; index += 1; }
    else if (key === '--lease-owner') { options.leaseOwner = value; index += 1; }
    else if (key === '--lease-ms') { options.leaseMs = Number(value); index += 1; }
    else if (key === '--interval-ms') { options.intervalMs = Number(value); index += 1; }
    else if (key === '--max-iterations') { options.maxIterations = Number(value); index += 1; }
    else if (key === '--driver') { options.driver = value; index += 1; }
    else if (key === '--driver-command') { options.driverCommand = value; index += 1; }
    else if (key === '--driver-module') { options.driverModule = value; index += 1; }
    else if (key === '--driver-timeout-ms') { options.driverTimeoutMs = Number(value); index += 1; }
    else if (key === '--limit') { options.limit = Number(value); index += 1; }
    else if (key === '--review-state') { options.reviewState = value; index += 1; }
    else if (key === '--action') { options.action = value; index += 1; }
    else if (key === '--reason') { options.reason = value; index += 1; }
    else if (key === '--to-state') { options.toState = value; index += 1; }
    else if (key === '--json') { options.json = true; }
  }
  return { command, options };
}

async function runCli() {
  const rootDir = process.cwd();
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command) {
    console.error('Usage: node scripts/mas-runtime.mjs <submit|run-once|run-loop|board|events|intervene> [options]');
    process.exitCode = 1;
    return;
  }
  if ((command === 'run-once' || command === 'run-loop') && options.driver === 'command' && !options.driverCommand) {
    throw new Error('command driver requires --driver-command');
  }
  if ((command === 'run-once' || command === 'run-loop') && options.driver === 'module' && !options.driverModule) {
    throw new Error('module driver requires --driver-module');
  }
  if (command === 'submit') return void console.log(JSON.stringify(await submitTaskRequest({ rootDir, ...options }), null, 2));
  if (command === 'run-once') return void console.log(JSON.stringify(await runSchedulerTick({ rootDir, ...options }), null, 2));
  if (command === 'run-loop') return void console.log(JSON.stringify(await runSchedulerLoop({ rootDir, ...options }), null, 2));
  if (command === 'board') {
    const board = await buildTaskBoard({ rootDir, taskId: options.taskId });
    return void console.log(options.json ? JSON.stringify(board, null, 2) : renderBoard(board));
  }
  if (command === 'events') {
    if (!options.taskId) throw new Error('events requires --task-id');
    return void console.log(JSON.stringify(await readTaskEvents({ rootDir, taskId: options.taskId, limit: options.limit }), null, 2));
  }
  if (command === 'intervene') {
    return void console.log(JSON.stringify(await interveneOnTask({ rootDir, taskId: options.taskId, action: options.action, reviewState: options.reviewState, reason: options.reason, toState: options.toState }), null, 2));
  }
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await runCli();
}
