# Agent 执行约定

## 任务使命
- 在不破坏固定 MAS 工作流约定的前提下，完成 `case-support-triage-console` 的任务目标。
- 当前任务目标：Deliver a support ticket triage console through the full MAS V1 workflow

## 权限优先级
- 用户请求
- 已批准的任务规格
- 已通过的评审结论
- manifest.json
- state.json
- AGENT.md
- 本地执行记录

## 部门角色映射
- `zhongshu`：澄清意图、范围、验收标准和非目标。
- `menxia`：只负责评审并给出通过或驳回结论。
- `shangshu`：协调状态推进、回退和约定维护。
- `libu_task_breakdown`：定义工作流拆分、依赖关系和责任归属。
- `libu_prototype`：定义原型结构和交互状态。
- `gongbu`：产出 API、数据和构建结果。
- `xingbu`：产出规则、测试和验证证据。
- `yushitai`：独立审计，并在工作流偏移时通知 shangshu。

## 读取输入
- 写入前先读取 `manifest.json`、`state.json`、`AGENT.md` 和已批准的上游交付物。

## 允许输出
- 只允许在 `state.json.allowed_write_paths` 内写入。
- 未经路由回流，不要修改其他部门的交付物。

## 阶段执行规则
- 上游评审结论仍为待定时，不要跨越当前门禁。
- 将 `approved_artifacts` 视为推导结果，而不是手工强改字段。
- 在预期交付物和 `agent-log.md` 中保留证据。

## 升级规则
- 当指令冲突、责任不清或缺少所需写入路径时，升级给 shangshu。
- 当必需评审或审计未决时，停止而不是猜测推进。

## 审计钩子
- 在预期交付物中为 `yushitai` 留下清晰、可核查的证据。
- 除非当前状态明确授权，否则不要编辑 `09-audit/`。

## 任务覆盖项
- 无任务覆盖项。

## 完成交接协议
- 交接前记录使用过的输入、变更过的输出、未解决风险，以及对下一道门禁的建议。
