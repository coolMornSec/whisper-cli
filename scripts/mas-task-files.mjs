import { emptyApprovedArtifacts } from './mas-approvals.mjs';
import { DEFAULT_CONSTRAINTS, DEFAULT_ROUTING_POLICY } from './mas-policy.mjs';
import {
  activeAgentsForState,
  allowedWritePathsForState,
  artifactPaths,
  defaultDepartments,
  ownerForState
} from './mas-utils.mjs';

export function defaultManifest(taskId, title, goal) {
  return {
    task_id: taskId,
    title,
    priority: 'high',
    goal,
    human_approvals_required: ['REQUIREMENT_REVIEW', 'UI_REVIEW', 'API_REVIEW', 'TEST_REVIEW', 'AUDIT_REVIEW'],
    departments: defaultDepartments(),
    artifacts: artifactPaths(taskId),
    routing_policy: DEFAULT_ROUTING_POLICY,
    constraints: DEFAULT_CONSTRAINTS
  };
}

export function defaultState(taskId, departments = defaultDepartments()) {
  const currentState = 'INTAKE';
  return {
    task_id: taskId,
    current_state: currentState,
    previous_state: null,
    owner: ownerForState(currentState, departments),
    approved_artifacts: emptyApprovedArtifacts(),
    blocked_by: [],
    active_agents: activeAgentsForState(currentState, departments),
    allowed_write_paths: allowedWritePathsForState(currentState),
    risks: [],
    updated_at: '2026-03-24T10:30:00+08:00'
  };
}

function md(title, sections) {
  return `# ${title}\n\n${sections.join('\n\n')}\n`;
}

function checklist(items) {
  return `## Completion Checklist\n${items.map(item => `- [ ] ${item}`).join('\n')}`;
}

function reviewDoc(title, scope, findings, followUps) {
  return md(title, [
    `## Review Scope\n- ${scope}`,
    `## Findings\n- ${findings}`,
    '## Decision\n- pending',
    `## Follow-ups\n- ${followUps}`
  ]);
}

function verifyDoc(title, summary) {
  return md(title, [`## Verification Summary\n- ${summary}`]);
}

export function renderTaskFiles(taskId, title, goal) {
  const manifest = defaultManifest(taskId, title, goal);
  const state = defaultState(taskId, manifest.departments);

  return {
    'AGENT.md': md('Agent Execution Contract', [
      `## Mission
- Deliver the case goal for \`${taskId}\` without breaking the fixed MAS workflow contract.
- Current case goal: ${goal}`,
      '## Authority Order\n- user request\n- approved specification\n- passed review decisions\n- manifest.json\n- state.json\n- AGENT.md\n- local execution notes',
      '## Department Role Map\n- `zhongshu`: clarify intent, scope, acceptance criteria, and non-goals.\n- `menxia`: review only and issue pass or reject decisions.\n- `shangshu`: coordinate state progression, rollback, and contract stewardship.\n- `libu_task_breakdown`: define workstreams, dependencies, and ownership.\n- `libu_prototype`: define prototype structure and interaction states.\n- `gongbu`: produce API, data, and build outputs.\n- `xingbu`: produce rules, tests, and verification evidence.\n- `yushitai`: audit independently and notify shangshu when the workflow drifts.',
      '## Read Inputs\n- Read `manifest.json`, `state.json`, `AGENT.md`, and the approved upstream deliverables before writing.',
      '## Allowed Outputs\n- Write only inside `state.json.allowed_write_paths`.\n- Do not change another department\'s deliverables without a routed re-entry.',
      '## Stage Execution Rules\n- Do not cross a gate while the upstream review decision is pending.\n- Treat `approved_artifacts` as derived truth, not a field to force manually.\n- Keep evidence in the expected deliverables and `agent-log.md`.',
      '## Escalation Rules\n- Escalate to shangshu when instructions conflict, ownership is unclear, or the required write path is missing.\n- Stop instead of guessing when a required review or audit is unresolved.',
      '## Audit Hooks\n- Leave clear, reviewable evidence for `yushitai` in the expected deliverables.\n- Never edit `09-audit/` unless the active state explicitly grants it.',
      '## Case Overrides\n- No case overrides.',
      '## Completion Protocol\n- Before handoff, record inputs used, outputs changed, unresolved risks, and the next gate recommendation.'
    ]),
    '00-intake/request.md': md('User Request', [
      `- Task ID: \`${taskId}\``,
      `- Title: ${title}`,
      `- Goal: ${goal}`
    ]),
    '00-intake/context.md': md('Business Context', [
      '- This task bootstraps a reusable MAS V1 workspace with enforceable workflow rules.',
      '- The workspace is intended to become a stable mechanism for future project delivery.'
    ]),
    '00-intake/constraints.md': md('Constraints', [
      '- Prototype must be approved before API design is finalized.',
      '- API review must pass before rules are frozen and build can proceed.',
      '- Tests must be designed and reviewed before implementation starts.'
    ]),
    '01-spec/spec.md': md('Specification', [
      '## Task Goal\n- Build a complete MAS task workspace that can be validated and advanced by policy.',
      '## Business Context\n- The repository is evolving from architecture notes into an executable delivery mechanism.',
      '## Scope\n### In Scope\n- Fixed workspace structure\n- State validation\n- Transition control\n### Out Of Scope\n- Deployment automation',
      '## Inputs And Outputs\n- Inputs: architecture design, workflow policy, task metadata\n- Outputs: scaffolded task workspace, validated state, transition controller',
      '## Acceptance Criteria\n- Scaffolded workspaces pass validation\n- State transitions enforce entry gates\n- Review decisions control pass and reject routing',
      checklist([
        'Goal, scope, and acceptance criteria are explicit.',
        'Business context and non-goals are captured.',
        'The next department can consume the spec without asking for missing definitions.'
      ])
    ]),
    '01-spec/acceptance.md': md('Acceptance Criteria', [
      '## Acceptance Checklist\n- Every required workspace file exists.\n- manifest.json and state.json remain consistent with workflow policy.\n- Workflow validation and tests pass.'
    ]),
    '01-spec/non-goals.md': md('Non-Goals', [
      '## Deferred Items\n- Do not implement a runtime agent scheduler in this phase.\n- Do not cover deployment or external integrations in this phase.'
    ]),
    '02-review/requirement-review.md': reviewDoc(
      'Requirement Review',
      'Check requirement clarity, scope boundaries, and acceptance criteria.',
      'Record whether the specification is fit to enter planning.',
      'If rejected, return to SPEC_DRAFT with explicit gaps to address.'
    ),
    '02-review/ui-review.md': reviewDoc(
      'UI Review',
      'Check prototype structure, information architecture, and interaction coverage.',
      'Record whether the prototype is clear enough to support API design.',
      'If rejected, return to PROTOTYPE_DRAFT with missing interaction states.'
    ),
    '02-review/api-review.md': reviewDoc(
      'API Review',
      'Check contract structure, data ownership, and migration impact.',
      'Record whether the API contract is stable enough to freeze.',
      'If rejected, return to API_DESIGNED with the conflicting contract details.'
    ),
    '02-review/test-review.md': reviewDoc(
      'Test Review',
      'Check rule coverage, test case completeness, and verification scope.',
      'Record whether the test package is sufficient to unlock build execution.',
      'If rejected, return to TESTS_DRAFTED with missing cases and quality gates.'
    ),
    '03-plan/task-breakdown.md': md('Task Breakdown', [
      '## Workstreams\n- Scaffold workflow workspace\n- Define manifest and state policy\n- Enforce transitions and entry gates\n- Validate sample task end to end',
      '## Deliverable Mapping\n- zhongshu -> intake and specification\n- menxia -> review records\n- gongbu -> design contract and build summary\n- xingbu -> rules, tests, verification\n- yushitai -> audit evidence',
      checklist([
        'Each workstream has a concrete owner.',
        'Each workstream maps to a fixed deliverable.',
        'No build work starts before the upstream gates are identified.'
      ])
    ]),
    '03-plan/dependency-map.md': md('Dependency Map', [
      '## Critical Path\n- Requirement review -> planning -> prototype -> API review -> rules and tests -> build -> verify -> audit',
      '## Parallelization Notes\n- Build and verification can parallelize only after TEST_REVIEW passes and allowed paths are updated.'
    ]),
    '03-plan/ownership.md': md('Ownership', [
      '## Department Ownership\n- zhongshu: intake and specification\n- menxia: review decisions\n- shangshu: state control and freeze management\n- gongbu: contract and implementation artifacts\n- xingbu: rules, tests, and verification\n- yushitai: audit and escalation',
      '## Handover Rules\n- The receiving department must confirm upstream completion before changing the task state.\n- Rework must return to the owning production department, not be corrected inside review or audit.'
    ]),
    '04-design/prototype.md': md('Prototype Design', [
      '## Page Map\n- Organize the workspace around fixed 00-09 phase directories and control documents.',
      '## Interaction Rules\n- Clarify first, review second, freeze third, then build and audit.',
      checklist([
        'Primary workflow surfaces are identified.',
        'Required interaction states are listed.',
        'The prototype is stable enough to drive API design.'
      ])
    ]),
    '04-design/api-contract.yaml': `openapi: 3.1.0
info:
  title: MAS Task Workspace Contract
  version: 1.0.0
paths:
  /tasks/{taskId}/state:
    get:
      summary: Read task runtime state
  /tasks/{taskId}/manifest:
    get:
      summary: Read task static manifest
`,
    '04-design/data-model.md': md('Data Model', [
      '## Entities\n- manifest.json stores task policy, routing, and artifact ownership.\n- state.json stores the active workflow state, agents, and approved artifacts.',
      '## State Records\n- agent-log.md stores stage-level execution evidence and handoff context.'
    ]),
    '04-design/migration-plan.md': md('Migration Plan', [
      '## Migration Steps\n- Replace the old document-only scaffold with a complete tasks/<task-id>/ workspace.\n- Validate the repository against a default sample task.\n- Add a transition controller so state cannot be advanced by ad hoc edits.',
      '## Rollback Notes\n- If a migration breaks policy validation, revert the workspace to the last validated task state before continuing.'
    ]),
    '05-rules/rules.md': md('Rules Catalog', [
      '## Enforced Rules\n\n### RULE-001\n- Source: architecture design\n- Trigger: scaffold workspace\n- Constraint: generate the complete MAS task structure\n- Severity: high\n- Check: workflow validation',
      '### RULE-002\n- Source: workflow policy\n- Trigger: transition state\n- Constraint: the target state must pass its entry gate before activation\n- Severity: high\n- Check: transition controller',
      checklist([
        'Each rule names its source, trigger, and check.',
        'Rules cover both happy path and rollback path constraints.',
        'The next review stage can trace every gate to a rule.'
      ])
    ]),
    '05-rules/allowed-files.md': md('Allowed Files', [
      '## Department Paths\n- zhongshu -> 00-intake/, 01-spec/\n- menxia -> 02-review/\n- shangshu -> 03-plan/\n- yushitai -> 09-audit/'
    ]),
    '05-rules/dependency-policy.md': md('Dependency Policy', [
      '## Allowed Dependencies\n- Use only Node.js built-in modules in this phase.',
      '## Prohibited Changes\n- Do not add third-party runtime dependencies for the workflow controller.'
    ]),
    '05-rules/quality-gates.md': md('Quality Gates', [
      '## Gate Matrix\n- REQUIREMENT_REVIEW -> TASK_PLANNED\n- UI_REVIEW -> API_DESIGNED\n- API_REVIEW -> RULES_FROZEN\n- TEST_REVIEW -> BUILD_IN_PROGRESS\n- AUDIT_REVIEW -> DONE'
    ]),
    '06-tests/test-cases.md': md('Test Cases', [
      '## Case List\n\n### CASE-001\n- Input: scaffold workspace\n- Expected Output: every required task artifact exists',
      '### CASE-002\n- Input: transition to a review state with incomplete inputs\n- Expected Output: the controller blocks the transition',
      '### CASE-003\n- Input: rejected review decision\n- Expected Output: the controller routes to the matching rejected state',
      '## Coverage Map\n- Covers scaffold, validation, transition gating, approval synchronization, and review-driven rollback.'
    ]),
    '06-tests/contract/.gitkeep': '',
    '06-tests/frontend/.gitkeep': '',
    '06-tests/backend/.gitkeep': '',
    '06-tests/e2e/.gitkeep': '',
    '07-build/frontend/.gitkeep': '',
    '07-build/backend/.gitkeep': '',
    '07-build/database/.gitkeep': '',
    '07-build/generated-summary.md': md('Build Summary', [
      '## Generated Outputs\n- The sample task validates workflow mechanics only and does not ship product code.',
      checklist([
        'Generated outputs are listed.',
        'Build scope stays inside the allowed write paths.',
        'The next verification stage can audit what was produced.'
      ])
    ]),
    '08-verify/test-results.md': verifyDoc('Test Results', 'Expected to be filled by automated validation in future iterations.'),
    '08-verify/contract-results.md': verifyDoc(
      'Contract Results',
      'Confirm manifest and state remain aligned with artifact paths and workflow policy.'
    ),
    '08-verify/build-results.md': verifyDoc(
      'Build Results',
      'Confirm the task can progress from BUILD_IN_PROGRESS to INTEGRATION_VERIFY with required artifacts.'
    ),
    '08-verify/integration-results.md': verifyDoc(
      'Integration Results',
      'Confirm the workspace, state machine, and permission rules validate as one system.'
    ),
    '09-audit/review.md': reviewDoc(
      'Audit Review',
      'Check workflow structure, state control, write boundaries, and policy conformance.',
      'Record whether the task stayed aligned with the approved process.',
      'If rejected, notify shangshu and route back to the owning recovery state.'
    ) + '\n## Escalation\n- Notify shangshu when findings require rollback or re-planning.\n',
    '09-audit/findings.md': md('Audit Findings', [
      '## Findings List\n- No critical findings in the baseline sample task.',
      '## Notifications\n- No active escalations.'
    ]),
    '09-audit/risk-register.md': md('Risk Register', [
      '## Active Risks\n- R-001: future runtime orchestration will need stronger event logging and execution locking.',
      '## Rollback Recommendation\n- None.'
    ]),
    '09-audit/compliance.md': md('Compliance Check', [
      '## Compliance Status\n- Write boundaries reviewed.\n- State progression reviewed.\n- Entry gate policy reviewed.',
      '## Recommended Action\n- Continue with the current planned workflow until audit findings appear.'
    ]),
    'agent-log.md': md('Agent Execution Log', [
      '## Stage Records\n\n### Stage 1 - Specification Prepared\n- Input Document: 00-intake/request.md\n- Output Document: 01-spec/spec.md\n- Followed Scope: yes\n- Modified Unrelated Files: no\n- Added New Dependencies: no\n- Review Decision: pending\n- Remaining Risk: low'
    ]),
    'state.json': `${JSON.stringify(state, null, 2)}\n`,
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`
  };
}
