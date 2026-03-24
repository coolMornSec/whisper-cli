export const WORKFLOW_STATES = [
  'INTAKE',
  'SPEC_DRAFT',
  'REQUIREMENT_REVIEW',
  'TASK_PLANNED',
  'PROTOTYPE_DRAFT',
  'UI_REVIEW',
  'API_DESIGNED',
  'API_REVIEW',
  'RULES_FROZEN',
  'TESTS_DRAFTED',
  'TEST_REVIEW',
  'BUILD_IN_PROGRESS',
  'INTEGRATION_VERIFY',
  'AUDIT_REVIEW',
  'REQUIREMENT_REJECTED',
  'UI_REJECTED',
  'API_REJECTED',
  'TEST_REJECTED',
  'VERIFY_FAILED',
  'AUDIT_FAILED',
  'DONE'
];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
export const RISK_STATUSES = ['open', 'mitigated', 'accepted'];

export const DEPARTMENT_KEYS = [
  'zhongshu',
  'menxia',
  'shangshu',
  'libu_task_breakdown',
  'libu_prototype',
  'gongbu',
  'xingbu',
  'yushitai'
];

export const TASK_FILES = [
  'AGENT.md',
  '00-intake/request.md',
  '00-intake/context.md',
  '00-intake/constraints.md',
  '01-spec/spec.md',
  '01-spec/acceptance.md',
  '01-spec/non-goals.md',
  '02-review/requirement-review.md',
  '02-review/ui-review.md',
  '02-review/api-review.md',
  '02-review/test-review.md',
  '03-plan/task-breakdown.md',
  '03-plan/dependency-map.md',
  '03-plan/ownership.md',
  '04-design/prototype.md',
  '04-design/api-contract.yaml',
  '04-design/data-model.md',
  '04-design/migration-plan.md',
  '05-rules/rules.md',
  '05-rules/allowed-files.md',
  '05-rules/dependency-policy.md',
  '05-rules/quality-gates.md',
  '06-tests/test-cases.md',
  '06-tests/contract/.gitkeep',
  '06-tests/frontend/.gitkeep',
  '06-tests/backend/.gitkeep',
  '06-tests/e2e/.gitkeep',
  '07-build/frontend/.gitkeep',
  '07-build/backend/.gitkeep',
  '07-build/database/.gitkeep',
  '07-build/generated-summary.md',
  '08-verify/test-results.md',
  '08-verify/contract-results.md',
  '08-verify/build-results.md',
  '08-verify/integration-results.md',
  '09-audit/review.md',
  '09-audit/findings.md',
  '09-audit/risk-register.md',
  '09-audit/compliance.md',
  'agent-log.md',
  'state.json',
  'manifest.json'
];

export const SUPPORT_FILES = [
  'shared/templates/task-workspace.template.md',
  'shared/templates/AGENT.template.md',
  'shared/policies/department-write-scope.md',
  'shared/policies/deliverable-contracts.md',
  'shared/policies/agent-document-standard.md',
  'shared/prompts/department-prompts.md',
  'orchestrator/state-machine.md',
  'orchestrator/routing-rules.md',
  'orchestrator/role-permissions.md'
];
