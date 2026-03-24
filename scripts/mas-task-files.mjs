import { emptyApprovedArtifacts } from './mas-approvals.mjs';
import { DEFAULT_CONSTRAINTS, DEFAULT_ROUTING_POLICY } from './mas-policy.mjs';
import {
  activeAgentsForState,
  allowedWritePathsForState,
  artifactPaths,
  defaultDepartments,
  ownerForState
} from './mas-utils.mjs';

export function defaultManifest(taskId, title, goal) {
  return {
    task_id: taskId,
    title,
    priority: 'high',
    goal,
    human_approvals_required: ['REQUIREMENT_REVIEW', 'UI_REVIEW', 'API_REVIEW', 'TEST_REVIEW', 'AUDIT_REVIEW'],
    departments: defaultDepartments(),
    artifacts: artifactPaths(taskId),
    routing_policy: DEFAULT_ROUTING_POLICY,
    constraints: DEFAULT_CONSTRAINTS
  };
}

export function defaultState(taskId, departments = defaultDepartments()) {
  const currentState = 'INTAKE';
  return {
    task_id: taskId,
    current_state: currentState,
    previous_state: null,
    owner: ownerForState(currentState, departments),
    approved_artifacts: emptyApprovedArtifacts(),
    blocked_by: [],
    active_agents: activeAgentsForState(currentState, departments),
    allowed_write_paths: allowedWritePathsForState(currentState),
    risks: [],
    updated_at: '2026-03-24T10:30:00+08:00'
  };
}

function md(title, sections) {
  return `# ${title}\n\n${sections.join('\n\n')}\n`;
}

function checklist(items) {
  return `## 完成检查清单\n${items.map(item => `- [ ] ${item}`).join('\n')}`;
}

function reviewDoc(title, scope, findings, followUps) {
  return md(title, [
    `## 评审范围\n- ${scope}`,
    `## 发现\n- ${findings}`,
    '## 结论\n- 待定',
    `## 后续动作\n- ${followUps}`
  ]);
}

function verifyDoc(title, summary) {
  return md(title, [`## 验证摘要\n- ${summary}`]);
}

export function renderTaskFiles(taskId, title, goal) {
  const manifest = defaultManifest(taskId, title, goal);
  const state = defaultState(taskId, manifest.departments);

  return {
    'AGENT.md': md('Agent 执行约定', [
      `## 任务使命
- 在不破坏固定 MAS 工作流约定的前提下，完成 \`${taskId}\` 的任务目标。
- 当前任务目标：${goal}`,
      '## 权限优先级\n- 用户请求\n- 已批准的任务规格\n- 已通过的评审结论\n- manifest.json\n- state.json\n- AGENT.md\n- 本地执行记录',
      '## 部门角色映射\n- `zhongshu`：澄清意图、范围、验收标准和非目标。\n- `menxia`：只负责评审并给出通过或驳回结论。\n- `shangshu`：协调状态推进、回退和约定维护。\n- `libu_task_breakdown`：定义工作流拆分、依赖关系和责任归属。\n- `libu_prototype`：定义原型结构和交互状态。\n- `gongbu`：产出 API、数据和构建结果。\n- `xingbu`：产出规则、测试和验证证据。\n- `yushitai`：独立审计，并在工作流偏移时通知 shangshu。',
      '## 读取输入\n- 写入前先读取 `manifest.json`、`state.json`、`AGENT.md` 和已批准的上游交付物。',
      '## 允许输出\n- 只允许在 `state.json.allowed_write_paths` 内写入。\n- 未经路由回流，不要修改其他部门的交付物。',
      '## 阶段执行规则\n- 上游评审结论仍为待定时，不要跨越当前门禁。\n- 将 `approved_artifacts` 视为推导结果，而不是手工强改字段。\n- 在预期交付物和 `agent-log.md` 中保留证据。',
      '## 升级规则\n- 当指令冲突、责任不清或缺少所需写入路径时，升级给 shangshu。\n- 当必需评审或审计未决时，停止而不是猜测推进。',
      '## 审计钩子\n- 在预期交付物中为 `yushitai` 留下清晰、可核查的证据。\n- 除非当前状态明确授权，否则不要编辑 `09-audit/`。',
      '## 任务覆盖项\n- 无任务覆盖项。',
      '## 完成交接协议\n- 交接前记录使用过的输入、变更过的输出、未解决风险，以及对下一道门禁的建议。'
    ]),
    '00-intake/request.md': md('用户请求', [
      `- Task ID: \`${taskId}\``,
      `- 标题: ${title}`,
      `- 目标: ${goal}`
    ]),
    '00-intake/context.md': md('业务背景', [
      '- 本任务用于搭建一个可复用的 MAS V1 工作区，并为其配上可执行的工作流规则。',
      '- 该工作区旨在成为后续项目交付的稳定机制。'
    ]),
    '00-intake/constraints.md': md('约束条件', [
      '- 原型必须先通过评审，API 设计才能最终定稿。',
      '- API 评审通过后，规则才能冻结，构建才能推进。',
      '- 实现开始前，测试必须先设计并完成评审。'
    ]),
    '01-spec/spec.md': md('任务规格', [
      '## 任务目标\n- 构建一个完整的 MAS 任务工作区，使其能够按策略校验并推进状态。',
      '## 业务背景\n- 这个仓库正在从架构说明演进为可执行的交付机制。',
      '## 范围\n### In Scope\n- 固定工作区结构\n- 状态校验\n- 状态流转控制\n### Out Of Scope\n- 部署自动化',
      '## 输入输出\n- 输入：架构设计、工作流策略、任务元数据\n- 输出：脚手架化任务工作区、已校验状态、状态流转控制器',
      '## 验收标准\n- 脚手架生成的工作区能够通过校验\n- 状态流转会执行入口门禁\n- 评审结论能够控制通过与驳回路由',
      checklist([
        '目标、范围和验收标准已明确。',
        '业务背景和非目标已记录。',
        '下一个部门无需补问缺失定义即可消费该规格。'
      ])
    ]),
    '01-spec/acceptance.md': md('验收标准', [
      '## 验收检查清单\n- 所有必需的工作区文件都已存在。\n- manifest.json 与 state.json 与工作流策略保持一致。\n- 工作流校验和测试全部通过。'
    ]),
    '01-spec/non-goals.md': md('非目标', [
      '## 暂缓项\n- 本阶段不实现运行时 Agent 调度器。\n- 本阶段不覆盖部署或外部集成。'
    ]),
    '02-review/requirement-review.md': reviewDoc(
      '需求评审',
      '检查需求清晰度、范围边界和验收标准。',
      '记录当前规格是否足以进入规划阶段。',
      '若驳回，返回 SPEC_DRAFT，并明确说明待补齐缺口。'
    ),
    '02-review/ui-review.md': reviewDoc(
      'UI 评审',
      '检查原型结构、信息架构和交互覆盖情况。',
      '记录原型是否足够清晰，可以支撑 API 设计。',
      '若驳回，返回 PROTOTYPE_DRAFT，并补齐缺失交互状态。'
    ),
    '02-review/api-review.md': reviewDoc(
      'API 评审',
      '检查契约结构、数据归属和迁移影响。',
      '记录 API 契约是否已稳定到可以冻结。',
      '若驳回，返回 API_DESIGNED，并指出冲突契约细节。'
    ),
    '02-review/test-review.md': reviewDoc(
      '测试评审',
      '检查规则覆盖、测试用例完整性和验证范围。',
      '记录测试包是否足以解锁构建执行。',
      '若驳回，返回 TESTS_DRAFTED，并补齐缺失用例和质量门禁。'
    ),
    '03-plan/task-breakdown.md': md('任务拆分', [
      '## 工作流拆分\n- 搭建工作流工作区脚手架\n- 定义 manifest 与 state 策略\n- 执行状态流转与入口门禁\n- 端到端校验示例任务',
      '## 交付物映射\n- zhongshu -> intake 与任务规格\n- menxia -> 评审记录\n- gongbu -> 设计契约与构建总结\n- xingbu -> 规则、测试、验证\n- yushitai -> 审计证据',
      checklist([
        '每个工作流都有明确负责人。',
        '每个工作流都映射到固定交付物。',
        '在明确上游门禁前，不会启动构建工作。'
      ])
    ]),
    '03-plan/dependency-map.md': md('依赖关系图', [
      '## 关键路径\n- 需求评审 -> 规划 -> 原型 -> API 评审 -> 规则与测试 -> 构建 -> 验证 -> 审计',
      '## 并行说明\n- 只有在 TEST_REVIEW 通过且允许路径更新后，构建与验证才能并行推进。'
    ]),
    '03-plan/ownership.md': md('责任归属', [
      '## 部门归属\n- zhongshu: intake 与任务规格\n- menxia: 评审结论\n- shangshu: 状态控制与冻结管理\n- gongbu: 契约与实现产物\n- xingbu: 规则、测试与验证\n- yushitai: 审计与升级',
      '## 交接规则\n- 接收部门在变更任务状态前，必须确认上游已完成。\n- 返工必须退回到对应的生产部门，不能在评审或审计环节直接改正。'
    ]),
    '04-design/prototype.md': md('原型设计', [
      '## 页面结构\n- 以固定的 00-09 阶段目录和控制文档组织整个工作区。',
      '## 交互规则\n- 先澄清、再评审、后冻结，最后构建和审计。',
      checklist([
        '核心工作流界面已识别。',
        '必需交互状态已列出。',
        '原型已稳定到可以驱动 API 设计。'
      ])
    ]),
    '04-design/api-contract.yaml': `openapi: 3.1.0
info:
  title: MAS 任务工作区契约
  version: 1.0.0
paths:
  /tasks/{taskId}/state:
    get:
      summary: 读取任务运行时状态
  /tasks/{taskId}/manifest:
    get:
      summary: 读取任务静态清单
`,
    '04-design/data-model.md': md('数据模型', [
      '## 实体\n- manifest.json 存储任务策略、路由和交付物归属。\n- state.json 存储当前工作流状态、活跃 Agent 和已批准产物。',
      '## 状态记录\n- agent-log.md 存储阶段级执行证据和交接上下文。'
    ]),
    '04-design/migration-plan.md': md('迁移计划', [
      '## 迁移步骤\n- 用完整的 tasks/<task-id>/ 工作区替换旧的纯文档脚手架。\n- 使用默认示例任务对仓库执行校验。\n- 增加状态流转控制器，避免通过临时编辑推进状态。',
      '## 回滚说明\n- 如果迁移破坏策略校验，应先将工作区回退到上一个已验证状态，再继续推进。'
    ]),
    '05-rules/rules.md': md('规则清单', [
      '## 生效规则\n\n### RULE-001\n- 来源: 架构设计\n- 触发条件: 生成工作区脚手架\n- 约束内容: 必须生成完整的 MAS 任务结构\n- 严重级别: high\n- 检查方式: 工作流校验',
      '### RULE-002\n- 来源: 工作流策略\n- 触发条件: 进行状态流转\n- 约束内容: 目标状态在激活前必须通过入口门禁\n- 严重级别: high\n- 检查方式: 状态流转控制器',
      checklist([
        '每条规则都写明来源、触发条件和检查方式。',
        '规则同时覆盖正常路径和回退路径约束。',
        '下一次评审可以把每道门禁追溯到具体规则。'
      ])
    ]),
    '05-rules/allowed-files.md': md('允许文件', [
      '## 部门路径\n- zhongshu -> 00-intake/, 01-spec/\n- menxia -> 02-review/\n- shangshu -> 03-plan/\n- yushitai -> 09-audit/'
    ]),
    '05-rules/dependency-policy.md': md('依赖策略', [
      '## 允许依赖\n- 当前阶段只允许使用 Node.js 内置模块。',
      '## 禁止变更\n- 不要为工作流控制器新增第三方运行时依赖。'
    ]),
    '05-rules/quality-gates.md': md('质量门禁', [
      '## 门禁矩阵\n- REQUIREMENT_REVIEW -> TASK_PLANNED\n- UI_REVIEW -> API_DESIGNED\n- API_REVIEW -> RULES_FROZEN\n- TEST_REVIEW -> BUILD_IN_PROGRESS\n- AUDIT_REVIEW -> DONE'
    ]),
    '06-tests/test-cases.md': md('测试用例', [
      '## 用例列表\n\n### CASE-001\n- 输入: 生成工作区脚手架\n- 预期输出: 所有必需任务产物都存在',
      '### CASE-002\n- 输入: 在输入不完整时流转到评审状态\n- 预期输出: 控制器阻止这次流转',
      '### CASE-003\n- 输入: 评审结论为驳回\n- 预期输出: 控制器会路由到对应的驳回状态',
      '## 覆盖范围\n- 覆盖脚手架、校验、状态流转门禁、审批同步和评审驱动回退。'
    ]),
    '06-tests/contract/.gitkeep': '',
    '06-tests/frontend/.gitkeep': '',
    '06-tests/backend/.gitkeep': '',
    '06-tests/e2e/.gitkeep': '',
    '07-build/frontend/.gitkeep': '',
    '07-build/backend/.gitkeep': '',
    '07-build/database/.gitkeep': '',
    '07-build/generated-summary.md': md('构建总结', [
      '## 生成产物\n- 该示例任务只验证工作流机制，不交付业务代码。',
      checklist([
        '已列出所有生成产物。',
        '构建范围保持在允许写入路径内。',
        '下一阶段验证可以审计本阶段产物。'
      ])
    ]),
    '08-verify/test-results.md': verifyDoc('测试结果', '预留给未来自动化校验填充。'),
    '08-verify/contract-results.md': verifyDoc(
      '契约结果',
      '确认 manifest 与 state 仍与产物路径和工作流策略保持一致。'
    ),
    '08-verify/build-results.md': verifyDoc(
      '构建结果',
      '确认任务在具备必需产物后，可以从 BUILD_IN_PROGRESS 推进到 INTEGRATION_VERIFY。'
    ),
    '08-verify/integration-results.md': verifyDoc(
      '集成结果',
      '确认工作区、状态机和权限规则可以作为一个整体通过校验。'
    ),
    '09-audit/review.md': reviewDoc(
      '审计评审',
      '检查工作流结构、状态控制、写入边界和策略符合性。',
      '记录任务是否始终与已批准流程保持一致。',
      '若驳回，通知 shangshu，并路由回对应恢复状态。'
    ) + '\n## 升级处理\n- 当发现需要回退或重新规划时，通知 shangshu。\n',
    '09-audit/findings.md': md('审计发现', [
      '## 发现列表\n- 基线示例任务当前没有关键发现。',
      '## 通知\n- 当前没有活跃升级。'
    ]),
    '09-audit/risk-register.md': md('风险登记', [
      '## 活跃风险\n- R-001: 未来的运行时编排需要更强的事件日志和执行锁定能力。',
      '## 回退建议\n- 无。'
    ]),
    '09-audit/compliance.md': md('合规检查', [
      '## 合规状态\n- 写入边界已复核。\n- 状态推进已复核。\n- 入口门禁策略已复核。',
      '## 建议动作\n- 在出现审计发现前，继续按当前规划工作流推进。'
    ]),
    'agent-log.md': md('Agent 执行日志', [
      '## 阶段记录\n\n### 阶段 1 - 已完成任务规格\n- 输入文档: 00-intake/request.md\n- 输出文档: 01-spec/spec.md\n- 是否遵守范围: 是\n- 是否修改无关文件: 否\n- 是否新增依赖: 否\n- 评审结论: 待定\n- 剩余风险: low'
    ]),
    'state.json': `${JSON.stringify(state, null, 2)}\n`,
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`
  };
}
