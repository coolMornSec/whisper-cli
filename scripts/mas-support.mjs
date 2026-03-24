import { renderDeliverableContractsPolicy } from './mas-contracts.mjs';

export function renderSupportFiles() {
  return {
    'shared/templates/task-workspace.template.md': `# Task Workspace Template

## Directory Contract
- Every task must live under \`tasks/<task-id>/\`.
- Stage outputs must be stored in the fixed \`00\` to \`09\` directories.
- \`state.json\` records runtime execution state and \`manifest.json\` records static task policy.
- \`AGENT.md\` defines the case-level execution contract for all participating agents.

## Core Deliverables
- \`AGENT.md\`
- \`01-spec/spec.md\`
- \`04-design/prototype.md\`
- \`04-design/api-contract.yaml\`
- \`05-rules/rules.md\`
- \`06-tests/test-cases.md\`
- \`09-audit/review.md\`
`,
    'shared/templates/AGENT.template.md': `# Agent Execution Contract

## Mission
- Describe the business objective of this task in one concise paragraph.

## Authority Order
- Follow this precedence strictly: user request -> approved spec -> passed review -> manifest.json -> state.json -> AGENT.md -> local execution notes.

## Department Role Map
- \`zhongshu\`: clarify intent, scope, non-goals, and acceptance criteria.
- \`menxia\`: review only, decide pass or reject, never silently rewrite deliverables.
- \`shangshu\`: coordinate progression, freeze outputs, and own rollback orchestration.
- \`libu_task_breakdown\`: define workstreams, dependencies, and ownership.
- \`libu_prototype\`: define prototype structure and interaction states.
- \`gongbu\`: produce API, data, and build outputs.
- \`xingbu\`: define rules, tests, and verification evidence.
- \`yushitai\`: audit independently, notify shangshu, and recommend rollback when needed.

## Read Inputs
- Always read \`manifest.json\`, \`state.json\`, \`AGENT.md\`, and the upstream approved deliverables for the current state before writing.

## Allowed Outputs
- Write only inside the paths granted by \`state.json.allowed_write_paths\`.
- Do not modify deliverables owned by another department unless the workflow has routed the task back to that department.

## Stage Execution Rules
- Do not start work for the next stage until the current entry gate has passed.
- Treat review documents with \`Decision: pending\` as blocked, not approved.
- Treat \`approved_artifacts\` as derived truth, never as a field to force manually.

## Escalation Rules
- Escalate to shangshu when inputs conflict, a gate fails, required ownership is unclear, or execution would exceed the allowed write paths.
- Stop and wait when a required review or audit decision is still pending.

## Audit Hooks
- Leave clear evidence for yushitai in the expected deliverables and \`agent-log.md\`.
- Never edit \`09-audit/\` unless the active state explicitly grants that scope.

## Case Overrides
- List only case-specific constraints here. If none exist, state "No case overrides."

## Completion Protocol
- Before handoff, confirm inputs used, outputs changed, unresolved risks, and whether the next gate should pass or remain blocked.
`,
    'shared/policies/department-write-scope.md': `# Department Write Scope

## Write Boundaries
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
    'shared/policies/agent-document-standard.md': `# Agent Document Standard

## Purpose
- \`AGENT.md\` is the case-level execution contract that binds all participating agents to the same authority order, stage rules, escalation rules, and audit hooks.

## Ownership
- Default owner: \`shangshu\`
- Review contributors: all departments may propose updates through the routed workflow, but direct edits must stay inside the currently allowed write paths.

## Required Structure
- The document must contain the fixed sections defined in \`shared/templates/AGENT.template.md\`.
- The document must explicitly mention all eight departments, \`state.json\`, \`manifest.json\`, and \`AGENT.md\`.

## Enforcement Rules
- A task workspace is invalid if \`AGENT.md\` is missing, missing required sections, or omits department role mapping and escalation behavior.
- Case-specific exceptions belong only in \`## Case Overrides\`; they must not silently change workflow order or department write scopes.

## Usage Rules
- Every agent must read \`AGENT.md\` before starting work on a case.
- If \`AGENT.md\` conflicts with \`manifest.json\` or \`state.json\`, the agent must escalate to shangshu instead of choosing locally.
`,
    'shared/prompts/department-prompts.md': `# Department Prompt Baseline

## Shared Requirement
- Read \`AGENT.md\`, \`manifest.json\`, and \`state.json\` before writing.

## zhongshu
- Clarify requirements, acceptance criteria, non-goals, and upstream context before execution starts.

## menxia
- Output review findings, pass or reject decisions, and explicit return instructions without rewriting deliverables directly.

## shangshu
- Advance state, freeze approved outputs, coordinate rollback, manage active execution scopes, and keep \`AGENT.md\` aligned with the case contract.

## Execution Departments
- Write only inside the allowed scope for the active state.
- Do not modify deliverables owned by another department without a routed re-entry.
- Escalate conflicts instead of resolving them ad hoc.
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
- shangshu: plan control, state progression, freeze management, and AGENT contract stewardship
- libu_task_breakdown: planning decomposition and ownership definition
- libu_prototype: prototype and interaction definition
- gongbu: API, implementation, and data model delivery
- xingbu: rules, tests, and verification evidence
- yushitai: independent audit and escalation
`
  };
}
