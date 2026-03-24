export function renderSupportFiles() {
  return {
    'shared/templates/task-workspace.template.md': `# Task Workspace Template

## Directory Contract
- Every task must live under \`tasks/<task-id>/\`.
- Stage outputs must be stored in the fixed \`00\` to \`09\` directories.
- \`state.json\` records runtime execution state and \`manifest.json\` records static task policy.

## Core Deliverables
- \`01-spec/spec.md\`
- \`04-design/prototype.md\`
- \`04-design/api-contract.yaml\`
- \`05-rules/rules.md\`
- \`06-tests/test-cases.md\`
- \`09-audit/review.md\`
`,
    'shared/policies/department-write-scope.md': `# Department Write Scope

## Write Boundaries
- zhongshu: \`00-intake/\`, \`01-spec/\`
- menxia: \`02-review/\`
- shangshu: \`03-plan/\`
- libu_task_breakdown: \`03-plan/task-breakdown.md\`, \`03-plan/dependency-map.md\`, \`03-plan/ownership.md\`
- libu_prototype: \`04-design/prototype.md\`
- gongbu: \`04-design/api-contract.yaml\`, \`04-design/data-model.md\`, \`04-design/migration-plan.md\`, \`07-build/\`
- xingbu: \`05-rules/\`, \`06-tests/\`, \`08-verify/\`
- yushitai: \`09-audit/\`
`,
    'shared/prompts/department-prompts.md': `# Department Prompt Baseline

## zhongshu
- Clarify requirements, acceptance criteria, non-goals, and upstream context before execution starts.

## menxia
- Output review findings, pass or reject decisions, and explicit return instructions without rewriting deliverables directly.

## shangshu
- Advance state, freeze approved outputs, coordinate rollback, and manage active execution scopes.

## Execution Departments
- Write only inside the allowed scope for the active state.
- Do not modify deliverables owned by another department without a routed re-entry.
`,
    'orchestrator/state-machine.md': `# State Machine

## Main Flow
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

## Failure Recovery
\`\`\`text
REQUIREMENT_REJECTED -> SPEC_DRAFT
UI_REJECTED -> PROTOTYPE_DRAFT
API_REJECTED -> API_DESIGNED
TEST_REJECTED -> TESTS_DRAFTED
VERIFY_FAILED -> BUILD_IN_PROGRESS
AUDIT_FAILED -> TASK_PLANNED or BUILD_IN_PROGRESS
\`\`\`
`,
    'orchestrator/routing-rules.md': `# Routing Rules

## Peer Deliberation
- SPEC_DRAFT
- REQUIREMENT_REVIEW
- TASK_PLANNED
- UI_REVIEW
- API_REVIEW

## Parallel Execution
- BUILD_IN_PROGRESS
- INTEGRATION_VERIFY

## Freeze Points
- UI_REVIEW
- API_REVIEW
- TEST_REVIEW
`,
    'orchestrator/role-permissions.md': `# Role Permissions

## Department Write Boundaries
- zhongshu: intake and specification authoring
- menxia: review and rejection decisions
- shangshu: plan control, state progression, and freeze management
- libu_task_breakdown: planning decomposition and ownership definition
- libu_prototype: prototype and interaction definition
- gongbu: API, implementation, and data model delivery
- xingbu: rules, tests, and verification evidence
- yushitai: independent audit and escalation
`
  };
}
