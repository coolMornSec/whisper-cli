# Agent 文档标准

## 目的
- `AGENT.md` 是任务级执行约定，用来把所有参与 Agent 绑定到同一套权限优先级、阶段规则、升级规则和审计钩子上。

## 归属
- 默认负责人：`shangshu`
- 评审参与方：所有部门都可以通过路由后的流程提出更新建议，但直接编辑必须限制在当前允许写入路径内。

## 必需结构
- 文档必须包含 `shared/templates/AGENT.template.md` 中定义的固定章节。
- 文档必须明确提到八个部门、`state.json`、`manifest.json` 和 `AGENT.md`。

## 执行规则
- 如果 `AGENT.md` 缺失、缺少必填章节，或遗漏部门角色映射与升级行为，则任务工作区无效。
- 任务特定例外只能写在 `## 任务覆盖项` 中，不能静默改变工作流顺序或部门写入范围。

## 使用规则
- 每个 Agent 在开始处理任务前都必须阅读 `AGENT.md`。
- 如果 `AGENT.md` 与 `manifest.json` 或 `state.json` 冲突，Agent 必须升级给 shangshu，而不是自行判断。
