export const DELIVERABLE_CONTRACTS = {
  'AGENT.md': {
    department: 'shangshu',
    headings: [
      '# Agent 执行约定',
      '## 任务使命',
      '## 权限优先级',
      '## 部门角色映射',
      '## 读取输入',
      '## 允许输出',
      '## 阶段执行规则',
      '## 升级规则',
      '## 审计钩子',
      '## 任务覆盖项',
      '## 完成交接协议'
    ],
    snippets: [
      '`zhongshu`',
      '`menxia`',
      '`shangshu`',
      '`libu_task_breakdown`',
      '`libu_prototype`',
      '`gongbu`',
      '`xingbu`',
      '`yushitai`',
      '`state.json`',
      '`manifest.json`',
      '`AGENT.md`'
    ]
  },
  '00-intake/request.md': {
    department: 'zhongshu',
    headings: ['# 用户请求']
  },
  '00-intake/context.md': {
    department: 'zhongshu',
    headings: ['# 业务背景']
  },
  '00-intake/constraints.md': {
    department: 'zhongshu',
    headings: ['# 约束条件']
  },
  '01-spec/spec.md': {
    department: 'zhongshu',
    headings: [
      '# 任务规格',
      '## 任务目标',
      '## 业务背景',
      '## 范围',
      '## 输入输出',
      '## 验收标准',
      '## 完成检查清单'
    ]
  },
  '01-spec/acceptance.md': {
    department: 'zhongshu',
    headings: ['# 验收标准', '## 验收检查清单']
  },
  '01-spec/non-goals.md': {
    department: 'zhongshu',
    headings: ['# 非目标', '## 暂缓项']
  },
  '02-review/requirement-review.md': {
    department: 'menxia',
    headings: ['# 需求评审', '## 评审范围', '## 发现', '## 结论', '## 后续动作']
  },
  '02-review/ui-review.md': {
    department: 'menxia',
    headings: ['# UI 评审', '## 评审范围', '## 发现', '## 结论', '## 后续动作']
  },
  '02-review/api-review.md': {
    department: 'menxia',
    headings: ['# API 评审', '## 评审范围', '## 发现', '## 结论', '## 后续动作']
  },
  '02-review/test-review.md': {
    department: 'menxia',
    headings: ['# 测试评审', '## 评审范围', '## 发现', '## 结论', '## 后续动作']
  },
  '03-plan/task-breakdown.md': {
    department: 'libu_task_breakdown',
    headings: ['# 任务拆分', '## 工作流拆分', '## 交付物映射', '## 完成检查清单']
  },
  '03-plan/dependency-map.md': {
    department: 'libu_task_breakdown',
    headings: ['# 依赖关系图', '## 关键路径', '## 并行说明']
  },
  '03-plan/ownership.md': {
    department: 'libu_task_breakdown',
    headings: ['# 责任归属', '## 部门归属', '## 交接规则']
  },
  '04-design/prototype.md': {
    department: 'libu_prototype',
    headings: ['# 原型设计', '## 页面结构', '## 交互规则', '## 完成检查清单']
  },
  '04-design/data-model.md': {
    department: 'gongbu',
    headings: ['# 数据模型', '## 实体', '## 状态记录']
  },
  '04-design/migration-plan.md': {
    department: 'gongbu',
    headings: ['# 迁移计划', '## 迁移步骤', '## 回滚说明']
  },
  '05-rules/rules.md': {
    department: 'xingbu',
    headings: ['# 规则清单', '## 生效规则', '## 完成检查清单']
  },
  '05-rules/allowed-files.md': {
    department: 'xingbu',
    headings: ['# 允许文件', '## 部门路径']
  },
  '05-rules/dependency-policy.md': {
    department: 'xingbu',
    headings: ['# 依赖策略', '## 允许依赖', '## 禁止变更']
  },
  '05-rules/quality-gates.md': {
    department: 'xingbu',
    headings: ['# 质量门禁', '## 门禁矩阵']
  },
  '06-tests/test-cases.md': {
    department: 'xingbu',
    headings: ['# 测试用例', '## 用例列表', '## 覆盖范围']
  },
  '07-build/generated-summary.md': {
    department: 'gongbu',
    headings: ['# 构建总结', '## 生成产物', '## 完成检查清单']
  },
  '08-verify/test-results.md': {
    department: 'xingbu',
    headings: ['# 测试结果', '## 验证摘要']
  },
  '08-verify/contract-results.md': {
    department: 'xingbu',
    headings: ['# 契约结果', '## 验证摘要']
  },
  '08-verify/build-results.md': {
    department: 'xingbu',
    headings: ['# 构建结果', '## 验证摘要']
  },
  '08-verify/integration-results.md': {
    department: 'xingbu',
    headings: ['# 集成结果', '## 验证摘要']
  },
  '09-audit/review.md': {
    department: 'yushitai',
    headings: ['# 审计评审', '## 评审范围', '## 发现', '## 结论', '## 后续动作', '## 升级处理']
  },
  '09-audit/findings.md': {
    department: 'yushitai',
    headings: ['# 审计发现', '## 发现列表', '## 通知']
  },
  '09-audit/risk-register.md': {
    department: 'yushitai',
    headings: ['# 风险登记', '## 活跃风险', '## 回退建议']
  },
  '09-audit/compliance.md': {
    department: 'yushitai',
    headings: ['# 合规检查', '## 合规状态', '## 建议动作']
  },
  'agent-log.md': {
    department: 'shangshu',
    headings: ['# Agent 执行日志', '## 阶段记录']
  }
};

export const ORCHESTRATOR_CONTRACTS = {
  'orchestrator/state-machine.md': ['# 状态机', '## 主流程', '## 失败恢复'],
  'orchestrator/routing-rules.md': ['# 路由规则', '## 平级协商', '## 并行执行', '## 冻结点'],
  'orchestrator/role-permissions.md': ['# 角色权限', '## 部门写入边界']
};

export function renderDeliverableContractsPolicy() {
  const lines = ['# 交付物约定', ''];

  for (const [relativePath, contract] of Object.entries(DELIVERABLE_CONTRACTS)) {
    lines.push(`## ${relativePath}`);
    lines.push(`- 部门: \`${contract.department}\``);
    lines.push(`- 必填章节: ${contract.headings.map(heading => `\`${heading}\``).join(', ')}`);
    if (contract.snippets?.length) {
      lines.push(`- 必需标记: ${contract.snippets.map(snippet => `\`${snippet}\``).join(', ')}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
