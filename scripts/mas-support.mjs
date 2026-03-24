import { renderDeliverableContractsPolicy } from './mas-contracts.mjs';

export function renderSupportFiles() {
  return {
    'shared/templates/task-workspace.template.md': `# 任务工作区模板

## 目录约定
- 每个任务都必须放在 \`tasks/<task-id>/\` 下。
- 阶段产物必须存放在固定的 \`00\` 到 \`09\` 目录中。
- \`state.json\` 记录运行时执行状态，\`manifest.json\` 记录静态任务策略。
- \`AGENT.md\` 定义所有参与 Agent 的任务级执行约定。

## 核心交付物
- \`AGENT.md\`
- \`01-spec/spec.md\`
- \`04-design/prototype.md\`
- \`04-design/api-contract.yaml\`
- \`05-rules/rules.md\`
- \`06-tests/test-cases.md\`
- \`09-audit/review.md\`
`,
    'shared/templates/AGENT.template.md': `# Agent 执行约定

## 任务使命
- 用一段简洁的话描述本任务的业务目标。

## 权限优先级
- 严格遵循以下优先级：用户请求 -> 已批准 spec -> 已通过评审 -> manifest.json -> state.json -> AGENT.md -> 本地执行记录。

## 部门角色映射
- \`zhongshu\`：澄清意图、范围、非目标和验收标准。
- \`menxia\`：只负责评审，给出通过或驳回结论，不能静默重写交付物。
- \`shangshu\`：协调推进、冻结产物，并负责回退编排。
- \`libu_task_breakdown\`：定义工作流拆分、依赖关系和责任归属。
- \`libu_prototype\`：定义原型结构和交互状态。
- \`gongbu\`：产出 API、数据和构建产物。
- \`xingbu\`：定义规则、测试和验证证据。
- \`yushitai\`：独立审计、通知 shangshu，并在需要时建议回退。

## 读取输入
- 开始写入前，始终先读取 \`manifest.json\`、\`state.json\`、\`AGENT.md\` 以及当前状态已批准的上游交付物。

## 允许输出
- 只允许在 \`state.json.allowed_write_paths\` 授权的路径内写入。
- 除非工作流已将任务路由回对应部门，否则不要修改其他部门拥有的交付物。

## 阶段执行规则
- 当前入口门禁未通过前，不要启动下一阶段工作。
- 将 \`结论: 待定\` 的评审文档视为阻塞，而不是已批准。
- 将 \`approved_artifacts\` 视为推导结果，绝不能手工强行改值。

## 升级规则
- 当输入冲突、门禁失败、责任归属不清或执行将超出授权写入范围时，升级给 shangshu。
- 当必需的评审或审计结论仍为待定时，停止并等待。

## 审计钩子
- 在预期交付物和 \`agent-log.md\` 中为 yushitai 留下清晰证据。
- 除非当前激活状态明确授权，否则不要编辑 \`09-audit/\`。

## 任务覆盖项
- 这里只列任务特定约束。如果没有，写“无任务覆盖项”。

## 完成交接协议
- 交接前，确认使用过的输入、变更过的输出、未解决风险，以及下一道门禁应通过还是继续阻塞。
`,
    'shared/policies/department-write-scope.md': `# 部门写入范围

## 写入边界
- zhongshu: \`00-intake/\`, \`01-spec/\`
- menxia: \`02-review/\`
- shangshu: \`03-plan/\`, \`AGENT.md\`, \`agent-log.md\`
- libu_task_breakdown: \`03-plan/task-breakdown.md\`, \`03-plan/dependency-map.md\`, \`03-plan/ownership.md\`
- libu_prototype: \`04-design/prototype.md\`
- gongbu: \`04-design/api-contract.yaml\`, \`04-design/data-model.md\`, \`04-design/migration-plan.md\`, \`07-build/\`
- xingbu: \`05-rules/\`, \`06-tests/\`, \`08-verify/\`
- yushitai: \`09-audit/\`
`,
    'shared/policies/deliverable-contracts.md': renderDeliverableContractsPolicy(),
    'shared/policies/agent-document-standard.md': `# Agent 文档标准

## 目的
- \`AGENT.md\` 是任务级执行约定，用来把所有参与 Agent 绑定到同一套权限优先级、阶段规则、升级规则和审计钩子上。

## 归属
- 默认负责人：\`shangshu\`
- 评审参与方：所有部门都可以通过路由后的流程提出更新建议，但直接编辑必须限制在当前允许写入路径内。

## 必需结构
- 文档必须包含 \`shared/templates/AGENT.template.md\` 中定义的固定章节。
- 文档必须明确提到八个部门、\`state.json\`、\`manifest.json\` 和 \`AGENT.md\`。

## 执行规则
- 如果 \`AGENT.md\` 缺失、缺少必填章节，或遗漏部门角色映射与升级行为，则任务工作区无效。
- 任务特定例外只能写在 \`## 任务覆盖项\` 中，不能静默改变工作流顺序或部门写入范围。

## 使用规则
- 每个 Agent 在开始处理任务前都必须阅读 \`AGENT.md\`。
- 如果 \`AGENT.md\` 与 \`manifest.json\` 或 \`state.json\` 冲突，Agent 必须升级给 shangshu，而不是自行判断。
`,
    'shared/prompts/department-prompts.md': `# 部门提示词基线

## 共同要求
- 写入前先读取 \`AGENT.md\`、\`manifest.json\` 和 \`state.json\`。

## zhongshu
- 在执行开始前澄清需求、验收标准、非目标和上游上下文。

## menxia
- 输出评审发现、通过或驳回结论，以及明确的回退说明，但不要直接重写交付物。

## shangshu
- 推进状态、冻结已批准产物、协调回退、管理当前执行范围，并保持 \`AGENT.md\` 与任务约定一致。

## 执行部门
- 只在当前激活状态允许的范围内写入。
- 未经路由回流，不要修改其他部门拥有的交付物。
- 遇到冲突要升级处理，而不是临时拍板。
`,
    'orchestrator/state-machine.md': `# 状态机

## 主流程
\`\`\`text
INTAKE
-> SPEC_DRAFT
-> REQUIREMENT_REVIEW
-> TASK_PLANNED
-> PROTOTYPE_DRAFT
-> UI_REVIEW
-> API_DESIGNED
-> API_REVIEW
-> RULES_FROZEN
-> TESTS_DRAFTED
-> TEST_REVIEW
-> BUILD_IN_PROGRESS
-> INTEGRATION_VERIFY
-> AUDIT_REVIEW
-> DONE
\`\`\`

## 失败恢复
\`\`\`text
REQUIREMENT_REJECTED -> SPEC_DRAFT
UI_REJECTED -> PROTOTYPE_DRAFT
API_REJECTED -> API_DESIGNED
TEST_REJECTED -> TESTS_DRAFTED
VERIFY_FAILED -> BUILD_IN_PROGRESS
AUDIT_FAILED -> TASK_PLANNED or BUILD_IN_PROGRESS
\`\`\`
`,
    'orchestrator/routing-rules.md': `# 路由规则

## 平级协商
- SPEC_DRAFT
- REQUIREMENT_REVIEW
- TASK_PLANNED
- UI_REVIEW
- API_REVIEW

## 并行执行
- BUILD_IN_PROGRESS
- INTEGRATION_VERIFY

## 冻结点
- UI_REVIEW
- API_REVIEW
- TEST_REVIEW
`,
    'orchestrator/role-permissions.md': `# 角色权限

## 部门写入边界
- zhongshu: intake 与规格编写
- menxia: 评审与驳回决策
- shangshu: 计划控制、状态推进、冻结管理和 AGENT 约定维护
- libu_task_breakdown: 规划拆分与责任定义
- libu_prototype: 原型与交互定义
- gongbu: API、实现与数据模型交付
- xingbu: 规则、测试与验证证据
- yushitai: 独立审计与升级处理
`
  };
}
