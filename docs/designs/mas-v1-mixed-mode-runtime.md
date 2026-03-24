# MAS V1 混合模式运行时

## 目标
- 保持仓库内的 `manifest.json`、`state.json`、评审文档和审计文档作为制度真相源。
- 在仓库外增加轻量执行器，负责调度、租约、事件流、任务看板和人工介入。
- 让皇帝只提交需求，就可以观察任务从入队到完成的全过程。

## 运行时文件
- `tasks/<task-id>/runtime/control.json`
  - 保存运行时状态、暂停标记、当前阻塞、执行租约、重试计数和待处理人工动作。
- `tasks/<task-id>/runtime/events.jsonl`
  - 保存机器可读事件流，用于看板、恢复和审计追踪。

## 运行时命令
- `node scripts/mas-runtime.mjs submit`
  - 提交皇帝需求并创建任务工作区。
- `node scripts/mas-runtime.mjs run-once`
  - 执行一轮调度，只处理一个可运行任务。
- `node scripts/mas-runtime.mjs run-loop`
  - 持续调度，直到达到迭代上限或没有可运行任务。
- `node scripts/mas-runtime.mjs board`
  - 读取状态面和事件流，渲染任务看板。
- `node scripts/mas-runtime.mjs events`
  - 查看任务事件流。
- `node scripts/mas-runtime.mjs intervene`
  - 让皇帝执行暂停、恢复、通过、驳回或合法回退。
- `node scripts/mas-runtime-intent.mjs --task-id <task-id>`
  - 为当前任务输出机器可读的执行意图，用作 Codex/Agent 外部执行层的 handoff 契约。
- `node scripts/mas-runtime.mjs run-loop --driver command --driver-command "<command>"`
  - 通过外部命令驱动当前阶段执行，运行时只负责租约、状态推进、门禁和事件写回。
- `node scripts/mas-runtime.mjs run-loop --driver module --driver-module "<module-path>"`
  - 通过 Node 模块驱动当前阶段执行，适合本地测试、集成验证和嵌入式适配层。

## 事件类型
- `TASK_ENQUEUED`
- `TASK_LEASED`
- `LEASE_RELEASED`
- `AGENT_STARTED`
- `AGENT_COMPLETED`
- `AGENT_FAILED`
- `STATE_TRANSITIONED`
- `GATE_BLOCKED`
- `REVIEW_DECISION_CHANGED`
- `AUDIT_DECISION_CHANGED`
- `HUMAN_INTERVENTION`
- `TASK_COMPLETED`

## 看板原则
- 看板只读取状态面和事件流，不解析全文文档推断事实。
- 看板必须直接显示任务状态、当前部门、负责人、阻塞项和最近动作。
- 如果任务被人工暂停、审计驳回或执行失败，看板必须给出明确原因。

## Codex 执行交接
- 外部执行器进入任务前，先读取 `runtime/control.json`、`runtime/events.jsonl` 与 `mas-runtime-intent.mjs` 输出。
- `mas-runtime-intent.mjs` 负责提供当前阶段目标、允许写入路径、上游输入、预期输出、下一步迁移和人工动作。
- 看板与调度器共享同一套状态面和事件流，不允许维护平行真相源。

## 驱动契约
- `internal` 驱动用于仓库内模拟执行，帮助验证制度和状态机本身。
- `command` 驱动用于接入真实外部执行器，例如 Codex 命令行或你自己的 Agent 启动器。
- `module` 驱动用于在同一 Node 进程内加载适配器模块，便于测试和受限环境下的集成。
- `command` 驱动通过标准输入接收 JSON：
  - `task_id`
  - `driver`
  - `department`
  - `actor_id`
  - `intent`
- 外部驱动在标准输出返回 JSON：
  - 普通生产阶段可返回 `summary` 与可选 `next_state`
  - 评审阶段必须返回 `review_decision=pass|reject`
  - 审计阶段必须返回 `audit_decision=pass|reject`，必要时附带 `recommended_rollback_state`
- 运行时会在外部驱动完成后重新校验任务工作区，防止越权写入或不完整交付物直接推进状态机。
- `module` 驱动的模块必须导出默认函数或 `runDriver(payload)`，返回值与 `command` 驱动输出 JSON 完全一致。
