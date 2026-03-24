export const STATE_TRANSITIONS = {
  INTAKE: ['SPEC_DRAFT'],
  SPEC_DRAFT: ['REQUIREMENT_REVIEW'],
  REQUIREMENT_REVIEW: ['TASK_PLANNED', 'REQUIREMENT_REJECTED'],
  REQUIREMENT_REJECTED: ['SPEC_DRAFT'],
  TASK_PLANNED: ['PROTOTYPE_DRAFT'],
  PROTOTYPE_DRAFT: ['UI_REVIEW'],
  UI_REVIEW: ['API_DESIGNED', 'UI_REJECTED'],
  UI_REJECTED: ['PROTOTYPE_DRAFT'],
  API_DESIGNED: ['API_REVIEW'],
  API_REVIEW: ['RULES_FROZEN', 'API_REJECTED'],
  API_REJECTED: ['API_DESIGNED'],
  RULES_FROZEN: ['TESTS_DRAFTED'],
  TESTS_DRAFTED: ['TEST_REVIEW'],
  TEST_REVIEW: ['BUILD_IN_PROGRESS', 'TEST_REJECTED'],
  TEST_REJECTED: ['TESTS_DRAFTED'],
  BUILD_IN_PROGRESS: ['INTEGRATION_VERIFY'],
  INTEGRATION_VERIFY: ['AUDIT_REVIEW', 'VERIFY_FAILED'],
  VERIFY_FAILED: ['BUILD_IN_PROGRESS'],
  AUDIT_REVIEW: ['DONE', 'AUDIT_FAILED'],
  AUDIT_FAILED: ['TASK_PLANNED', 'BUILD_IN_PROGRESS'],
  DONE: []
};

export const DEPARTMENT_WRITE_SCOPES = {
  zhongshu: ['00-intake/', '01-spec/'],
  menxia: ['02-review/'],
  shangshu: ['03-plan/'],
  libu_task_breakdown: [
    '03-plan/task-breakdown.md',
    '03-plan/dependency-map.md',
    '03-plan/ownership.md'
  ],
  libu_prototype: ['04-design/prototype.md'],
  gongbu: [
    '04-design/api-contract.yaml',
    '04-design/data-model.md',
    '04-design/migration-plan.md',
    '07-build/'
  ],
  xingbu: ['05-rules/', '06-tests/', '08-verify/'],
  yushitai: ['09-audit/']
};

export const STATE_DEPARTMENTS = {
  INTAKE: ['zhongshu'],
  SPEC_DRAFT: ['zhongshu'],
  REQUIREMENT_REVIEW: ['menxia'],
  REQUIREMENT_REJECTED: ['zhongshu'],
  TASK_PLANNED: ['shangshu', 'libu_task_breakdown'],
  PROTOTYPE_DRAFT: ['libu_prototype'],
  UI_REVIEW: ['menxia'],
  UI_REJECTED: ['libu_prototype'],
  API_DESIGNED: ['libu_prototype', 'gongbu'],
  API_REVIEW: ['menxia'],
  API_REJECTED: ['gongbu'],
  RULES_FROZEN: ['shangshu'],
  TESTS_DRAFTED: ['xingbu'],
  TEST_REVIEW: ['menxia'],
  TEST_REJECTED: ['xingbu'],
  BUILD_IN_PROGRESS: ['gongbu'],
  INTEGRATION_VERIFY: ['gongbu', 'xingbu'],
  VERIFY_FAILED: ['gongbu'],
  AUDIT_REVIEW: ['yushitai'],
  AUDIT_FAILED: ['shangshu', 'gongbu'],
  DONE: []
};

export const DEFAULT_ROUTING_POLICY = {
  peer_deliberation_states: ['SPEC_DRAFT', 'REQUIREMENT_REVIEW', 'TASK_PLANNED', 'UI_REVIEW', 'API_REVIEW'],
  parallel_execution_states: ['BUILD_IN_PROGRESS', 'INTEGRATION_VERIFY'],
  serialized_gates: ['REQUIREMENT_REVIEW', 'UI_REVIEW', 'API_REVIEW', 'TEST_REVIEW', 'AUDIT_REVIEW'],
  freeze_points: ['UI_REVIEW', 'API_REVIEW', 'TEST_REVIEW']
};

export const DEFAULT_CONSTRAINTS = {
  prototype_first: true,
  api_follows_prototype: true,
  tests_before_code: true,
  deployment_in_scope: false
};
