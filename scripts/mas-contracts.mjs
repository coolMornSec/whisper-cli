export const DELIVERABLE_CONTRACTS = {
  'AGENT.md': {
    department: 'shangshu',
    headings: [
      '# Agent Execution Contract',
      '## Mission',
      '## Authority Order',
      '## Department Role Map',
      '## Read Inputs',
      '## Allowed Outputs',
      '## Stage Execution Rules',
      '## Escalation Rules',
      '## Audit Hooks',
      '## Case Overrides',
      '## Completion Protocol'
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
    headings: ['# User Request']
  },
  '00-intake/context.md': {
    department: 'zhongshu',
    headings: ['# Business Context']
  },
  '00-intake/constraints.md': {
    department: 'zhongshu',
    headings: ['# Constraints']
  },
  '01-spec/spec.md': {
    department: 'zhongshu',
    headings: [
      '# Specification',
      '## Task Goal',
      '## Business Context',
      '## Scope',
      '## Inputs And Outputs',
      '## Acceptance Criteria',
      '## Completion Checklist'
    ]
  },
  '01-spec/acceptance.md': {
    department: 'zhongshu',
    headings: ['# Acceptance Criteria', '## Acceptance Checklist']
  },
  '01-spec/non-goals.md': {
    department: 'zhongshu',
    headings: ['# Non-Goals', '## Deferred Items']
  },
  '02-review/requirement-review.md': {
    department: 'menxia',
    headings: ['# Requirement Review', '## Review Scope', '## Findings', '## Decision', '## Follow-ups']
  },
  '02-review/ui-review.md': {
    department: 'menxia',
    headings: ['# UI Review', '## Review Scope', '## Findings', '## Decision', '## Follow-ups']
  },
  '02-review/api-review.md': {
    department: 'menxia',
    headings: ['# API Review', '## Review Scope', '## Findings', '## Decision', '## Follow-ups']
  },
  '02-review/test-review.md': {
    department: 'menxia',
    headings: ['# Test Review', '## Review Scope', '## Findings', '## Decision', '## Follow-ups']
  },
  '03-plan/task-breakdown.md': {
    department: 'libu_task_breakdown',
    headings: ['# Task Breakdown', '## Workstreams', '## Deliverable Mapping', '## Completion Checklist']
  },
  '03-plan/dependency-map.md': {
    department: 'libu_task_breakdown',
    headings: ['# Dependency Map', '## Critical Path', '## Parallelization Notes']
  },
  '03-plan/ownership.md': {
    department: 'libu_task_breakdown',
    headings: ['# Ownership', '## Department Ownership', '## Handover Rules']
  },
  '04-design/prototype.md': {
    department: 'libu_prototype',
    headings: ['# Prototype Design', '## Page Map', '## Interaction Rules', '## Completion Checklist']
  },
  '04-design/data-model.md': {
    department: 'gongbu',
    headings: ['# Data Model', '## Entities', '## State Records']
  },
  '04-design/migration-plan.md': {
    department: 'gongbu',
    headings: ['# Migration Plan', '## Migration Steps', '## Rollback Notes']
  },
  '05-rules/rules.md': {
    department: 'xingbu',
    headings: ['# Rules Catalog', '## Enforced Rules', '## Completion Checklist']
  },
  '05-rules/allowed-files.md': {
    department: 'xingbu',
    headings: ['# Allowed Files', '## Department Paths']
  },
  '05-rules/dependency-policy.md': {
    department: 'xingbu',
    headings: ['# Dependency Policy', '## Allowed Dependencies', '## Prohibited Changes']
  },
  '05-rules/quality-gates.md': {
    department: 'xingbu',
    headings: ['# Quality Gates', '## Gate Matrix']
  },
  '06-tests/test-cases.md': {
    department: 'xingbu',
    headings: ['# Test Cases', '## Case List', '## Coverage Map']
  },
  '07-build/generated-summary.md': {
    department: 'gongbu',
    headings: ['# Build Summary', '## Generated Outputs', '## Completion Checklist']
  },
  '08-verify/test-results.md': {
    department: 'xingbu',
    headings: ['# Test Results', '## Verification Summary']
  },
  '08-verify/contract-results.md': {
    department: 'xingbu',
    headings: ['# Contract Results', '## Verification Summary']
  },
  '08-verify/build-results.md': {
    department: 'xingbu',
    headings: ['# Build Results', '## Verification Summary']
  },
  '08-verify/integration-results.md': {
    department: 'xingbu',
    headings: ['# Integration Results', '## Verification Summary']
  },
  '09-audit/review.md': {
    department: 'yushitai',
    headings: ['# Audit Review', '## Review Scope', '## Findings', '## Decision', '## Follow-ups', '## Escalation']
  },
  '09-audit/findings.md': {
    department: 'yushitai',
    headings: ['# Audit Findings', '## Findings List', '## Notifications']
  },
  '09-audit/risk-register.md': {
    department: 'yushitai',
    headings: ['# Risk Register', '## Active Risks', '## Rollback Recommendation']
  },
  '09-audit/compliance.md': {
    department: 'yushitai',
    headings: ['# Compliance Check', '## Compliance Status', '## Recommended Action']
  },
  'agent-log.md': {
    department: 'shangshu',
    headings: ['# Agent Execution Log', '## Stage Records']
  }
};

export const ORCHESTRATOR_CONTRACTS = {
  'orchestrator/state-machine.md': ['# State Machine', '## Main Flow', '## Failure Recovery'],
  'orchestrator/routing-rules.md': ['# Routing Rules', '## Peer Deliberation', '## Parallel Execution', '## Freeze Points'],
  'orchestrator/role-permissions.md': ['# Role Permissions', '## Department Write Boundaries']
};

export function renderDeliverableContractsPolicy() {
  const lines = ['# Deliverable Contracts', ''];

  for (const [relativePath, contract] of Object.entries(DELIVERABLE_CONTRACTS)) {
    lines.push(`## ${relativePath}`);
    lines.push(`- Department: \`${contract.department}\``);
    lines.push(`- Required Sections: ${contract.headings.map(heading => `\`${heading}\``).join(', ')}`);
    if (contract.snippets?.length) {
      lines.push(`- Required Markers: ${contract.snippets.map(snippet => `\`${snippet}\``).join(', ')}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
