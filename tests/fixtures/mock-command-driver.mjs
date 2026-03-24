import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function readStdin() {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    buffer += chunk;
  }
  return JSON.parse(buffer);
}

async function writeTaskFile(taskId, relativePath, content) {
  const filePath = join(process.cwd(), 'tasks', taskId, ...relativePath.split('/'));
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function readTaskJson(taskId, relativePath) {
  const filePath = join(process.cwd(), 'tasks', taskId, ...relativePath.split('/'));
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function checklist(items) {
  return `## 完成检查清单\n${items.map(item => `- [x] ${item}`).join('\n')}\n`;
}

async function writeOutputsForState(taskId, intent) {
  const { current_state: stateName, goal, emperor_request: request, business_context: context, constraints } = intent;

  if (stateName === 'SPEC_DRAFT') {
    await writeTaskFile(taskId, '01-spec/spec.md', `# 任务规格

## 任务目标
- ${goal}

## 业务背景
- ${context || '外部执行器根据皇帝需求生成规格。'}

## 范围
- 让三省六部运行时在 Codex 环境中自动推进。

## 输入输出
- 输入：${request}
- 输出：可供后续部门消费的规格与约束。

## 验收标准
- 规格、门禁和人工介入路径清晰。

${checklist(['规格完整', '范围明确', '约束已记录'])}`);
    await writeTaskFile(taskId, '01-spec/acceptance.md', `# 验收标准

## 验收检查清单
- 自动执行器可读取规格。
- 评审环节可做通过或驳回。
`);
    await writeTaskFile(taskId, '01-spec/non-goals.md', `# 非目标

## 暂缓项
- 不在此阶段实现部署自动化。
`);
    return { summary: '外部驱动已完成规格起草。' };
  }

  if (stateName === 'TASK_PLANNED') {
    await writeTaskFile(taskId, '03-plan/task-breakdown.md', `# 任务拆分

## 工作流拆分
- zhongshu 起草规格
- menxia 执行评审
- 各部按状态机生产交付物

## 交付物映射
- 03-plan/ 负责计划与归属

${checklist(['拆分已完成', '路径已明确'])}`);
    await writeTaskFile(taskId, '03-plan/dependency-map.md', `# 依赖关系图

## 关键路径
- SPEC_DRAFT -> REQUIREMENT_REVIEW -> TASK_PLANNED -> DONE

## 并行说明
- 当前样例以顺序推进为主。
`);
    await writeTaskFile(taskId, '03-plan/ownership.md', `# 责任归属

## 部门归属
- shangshu 负责调度
- 生产与评审分离

## 交接规则
- 所有阶段都要留下事件和文档证据。
`);
    return { summary: '外部驱动已完成任务拆分。' };
  }

  if (stateName === 'PROTOTYPE_DRAFT') {
    await writeTaskFile(taskId, '04-design/prototype.md', `# 原型设计

## 页面结构
- 需求入口
- 任务看板
- 最近动作流

## 交互规则
- 默认自动推进
- 支持皇帝显式介入

${checklist(['原型可评审', '交互已定义'])}`);
    return { summary: '外部驱动已完成原型设计。' };
  }

  if (stateName === 'API_DESIGNED') {
    await writeTaskFile(taskId, '04-design/api-contract.yaml', `openapi: 3.1.0
info:
  title: External Driver Contract
  version: 1.0.0
paths:
  /tasks/{taskId}/board:
    get:
      summary: 获取任务看板
`);
    await writeTaskFile(taskId, '04-design/data-model.md', `# 数据模型

## 实体
- manifest.json
- state.json
- runtime/control.json

## 状态记录
- 通过事件流记录关键动作。
`);
    await writeTaskFile(taskId, '04-design/migration-plan.md', `# 迁移计划

## 迁移步骤
- 保持仓库内制度定义
- 通过外部驱动执行具体阶段

## 回滚说明
- 驱动失败时回退到上一个合法阶段。
`);
    return { summary: '外部驱动已完成 API 设计。' };
  }

  if (stateName === 'TESTS_DRAFTED') {
    await writeTaskFile(taskId, '05-rules/rules.md', `# 规则清单

## 生效规则
- 只允许单任务单租约执行。

${checklist(['规则已冻结', '与状态机一致'])}`);
    await writeTaskFile(taskId, '05-rules/allowed-files.md', `# 允许文件

## 部门路径
- 各部门只写入授权目录。
`);
    await writeTaskFile(taskId, '05-rules/dependency-policy.md', `# 依赖策略

## 允许依赖
- Node.js 内置模块

## 禁止变更
- 不引入平行真相源
`);
    await writeTaskFile(taskId, '05-rules/quality-gates.md', `# 质量门禁

## 门禁矩阵
- TEST_REVIEW -> BUILD_IN_PROGRESS
`);
    await writeTaskFile(taskId, '06-tests/test-cases.md', `# 测试用例

## 用例列表
- 自动推进主流程
- 人工暂停与恢复

## 覆盖范围
- 调度、看板、事件流、人工介入
`);
    return { summary: '外部驱动已完成规则与测试设计。' };
  }

  if (stateName === 'BUILD_IN_PROGRESS') {
    await writeTaskFile(taskId, '07-build/generated-summary.md', `# 构建总结

## 生成产物
- 已生成运行时需要的阶段文档。

${checklist(['构建阶段已完成'])}`);
    return { summary: '外部驱动已完成构建阶段交付。' };
  }

  if (stateName === 'INTEGRATION_VERIFY') {
    await writeTaskFile(taskId, '08-verify/test-results.md', `# 测试结果

## 验证摘要
- 测试验证通过。
`);
    await writeTaskFile(taskId, '08-verify/contract-results.md', `# 契约结果

## 验证摘要
- 契约验证通过。
`);
    await writeTaskFile(taskId, '08-verify/build-results.md', `# 构建结果

## 验证摘要
- 构建验证通过。
`);
    await writeTaskFile(taskId, '08-verify/integration-results.md', `# 集成结果

## 验证摘要
- 集成验证通过。
`);
    return { summary: '外部驱动已完成集成验证。' };
  }

  if (stateName === 'AUDIT_FAILED') {
    const state = await readTaskJson(taskId, 'state.json');
    return {
      summary: '外部驱动接受审计回退结果。',
      next_state: state.blocked_by?.[0] ?? intent.next_transitions.auto ?? 'BUILD_IN_PROGRESS'
    };
  }

  return { summary: `外部驱动已完成 ${stateName}。` };
}

export async function runDriver(payload) {
  const { task_id: taskId, intent } = payload;
  const stateName = intent.current_state;

  if (stateName === 'REQUIREMENT_REVIEW' || stateName === 'UI_REVIEW' || stateName === 'API_REVIEW' || stateName === 'TEST_REVIEW') {
    return {
      review_decision: 'pass',
      reason: `外部驱动确认 ${stateName} 通过。`,
      summary: `外部驱动已完成 ${stateName}。`
    };
  }

  if (stateName === 'AUDIT_REVIEW') {
    return {
      audit_decision: 'pass',
      reason: '外部驱动确认审计通过。',
      summary: '外部驱动已完成审计评审。'
    };
  }

  return writeOutputsForState(taskId, intent);
}

async function main() {
  const payload = await readStdin();
  const result = await runDriver(payload);
  process.stdout.write(JSON.stringify(result));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
