# mas-v1-architecture Spec

## 任务目标
- 产出一份面向 MAS V1 的架构设计稿，明确从需求澄清到构建完成的多 Agent 执行机制。
- 将“三省六部 + 审计”的职责映射落成可执行的目录结构、状态机、权限模型与 schema 设计。
- 为后续实现任务脚手架、状态机控制器和 schema 校验提供稳定输入。

## 业务背景
- 当前我们已经确认，AI 开发流程最容易失控的不是代码生成速度，而是上层方向偏差、原型与 API 漂移、测试后置以及多 Agent 越权协作。
- MAS V1 的目标不是一次性覆盖发布运维，而是先把需求、设计、规则、测试、构建、验证和审计闭环做扎实。
- 这份设计稿将作为后续脚手架与实现工作的正式约束输入，而不是仅作为讨论记录存在。

## 范围
### In Scope
- 输出 `docs/designs/mas-v1-architecture.v1.md`
- 输出 `shared/schemas/state.schema.json`
- 输出 `shared/schemas/manifest.schema.json`
- 补齐 `docs/specs/mas-v1-architecture.spec.md`
- 补齐 `docs/rules/mas-v1-architecture.rules.md`
- 补齐 `docs/testing/mas-v1-architecture.cases.md`
- 补齐 `docs/review/mas-v1-architecture.review.md`
- 补齐 `docs/logs/mas-v1-architecture.agent-log.md`
- 保证设计稿中的流程图、状态机、schema 与角色映射一致

### Out of Scope
- 不实现真实 orchestrator 运行时
- 不实现发布、部署、回滚与运维工作流
- 不接入外部 Agent 平台或第三方编排框架
- 不在本任务中开发业务应用代码

## 输入输出
- 输入: 用户关于 MAS、三省六部职责划分、原型优先、API 冻结、测试前置、数据库独立、运维暂不纳入 V1 的约束结论
- 输出: 一套可阅读、可落地、可继续实现的 MAS V1 设计文档与配套 schema

## 代码风格与目录约束
- 设计文档使用 Markdown，内容必须清晰、完整、结构化。
- schema 文件放在 `shared/schemas/`。
- 架构设计文档放在 `docs/designs/`。
- workflow 文档放在 `docs/specs/`、`docs/rules/`、`docs/testing/`、`docs/review/`、`docs/logs/`。
- 不允许为了迁就校验器而牺牲主文档可读性。

## 允许修改文件
- `docs/designs/mas-v1-architecture.v1.md`
- `docs/specs/mas-v1-architecture.spec.md`
- `docs/rules/mas-v1-architecture.rules.md`
- `docs/testing/mas-v1-architecture.cases.md`
- `docs/review/mas-v1-architecture.review.md`
- `docs/logs/mas-v1-architecture.agent-log.md`
- `shared/schemas/state.schema.json`
- `shared/schemas/manifest.schema.json`
- `scripts/task-docs.mjs`
- `tests/task-docs.test.mjs`

## 禁止修改文件
- 与当前 MAS V1 设计无关的业务代码文件
- 未被 spec 授权的目录与依赖配置
- `docs/whipser-cli.md`

## 依赖边界
- 仅允许使用现有仓库能力和 Node.js 内置模块辅助校验。
- 不新增第三方依赖。
- schema 必须使用标准 JSON Schema 表达。

## 验收标准
- MAS V1 主设计稿恢复为正常中文可读内容。
- 主设计稿包含流程图、目录结构、状态机、权限模型、`state.json` 与 `manifest.json` schema 说明。
- `state.schema.json` 与 `manifest.schema.json` 文件存在且结构自洽。
- `manifest.departments` 明确区分 `libu_task_breakdown` 与 `libu_prototype`。
- workflow 文档与主设计稿核心机制一致。
- `npm test` 通过。
- `npm run workflow:validate` 通过。

## 失败场景/边界场景
- 主设计稿出现真实乱码或 `?` 占位，导致内容不可恢复阅读。
- 流程图、状态机、schema 与角色映射互相矛盾。
- `state.json` 与 `manifest.json` schema 无法表达文档中声明的关键约束。
- workflow 文档与主设计稿描述不一致，导致后续实现无从落地。
