import { DEFAULT_CONSTRAINTS, DEFAULT_ROUTING_POLICY } from './mas-policy.mjs';
import {
  activeAgentsForState,
  allowedWritePathsForState,
  artifactPaths,
  defaultDepartments,
  ownerForState
} from './mas-utils.mjs';

export function expectedApprovedArtifacts(state) {
  const approvals = {
    spec: false,
    prototype: false,
    api_contract: false,
    rules: false,
    tests: false,
    build: false,
    verification: false,
    audit: false
  };

  if (['TASK_PLANNED', 'PROTOTYPE_DRAFT', 'UI_REVIEW', 'REQUIREMENT_REJECTED'].includes(state)) {
    approvals.spec = true;
  }
  if (['API_DESIGNED', 'API_REVIEW', 'API_REJECTED'].includes(state)) {
    Object.assign(approvals, { spec: true, prototype: true });
  }
  if (['RULES_FROZEN', 'TESTS_DRAFTED', 'TEST_REVIEW', 'TEST_REJECTED'].includes(state)) {
    Object.assign(approvals, { spec: true, prototype: true, api_contract: true, rules: true });
  }
  if (state === 'BUILD_IN_PROGRESS') {
    Object.assign(approvals, { spec: true, prototype: true, api_contract: true, rules: true, tests: true });
  }
  if (['INTEGRATION_VERIFY', 'VERIFY_FAILED'].includes(state)) {
    Object.assign(approvals, { spec: true, prototype: true, api_contract: true, rules: true, tests: true, build: true });
  }
  if (['AUDIT_REVIEW', 'AUDIT_FAILED'].includes(state)) {
    Object.assign(approvals, {
      spec: true,
      prototype: true,
      api_contract: true,
      rules: true,
      tests: true,
      build: true,
      verification: true
    });
  }
  if (state === 'DONE') {
    Object.assign(approvals, {
      spec: true,
      prototype: true,
      api_contract: true,
      rules: true,
      tests: true,
      build: true,
      verification: true,
      audit: true
    });
  }

  return approvals;
}

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
    approved_artifacts: expectedApprovedArtifacts(currentState),
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

function reviewDoc(title, scope, findings, decision, followUps) {
  return md(title, [
    `## Review Scope\n- ${scope}`,
    `## Findings\n- ${findings}`,
    `## Decision\n- ${decision}`,
    `## Follow-ups\n- ${followUps}`
  ]);
}

export function renderTaskFiles(taskId, title, goal) {
  const manifest = defaultManifest(taskId, title, goal);
  const state = defaultState(taskId, manifest.departments);

  return {
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
      '## Acceptance Criteria\n- Scaffolded workspaces pass validation\n- State transitions enforce entry gates\n- Review decisions control pass and reject routing'
    ]),
    '01-spec/acceptance.md': md('Acceptance Criteria', [
      '- Every required workspace file exists.',
      '- manifest.json and state.json remain consistent with workflow policy.',
      '- Workflow validation and tests pass.'
    ]),
    '01-spec/non-goals.md': md('Non-Goals', [
      '- Do not implement a runtime agent scheduler in this phase.',
      '- Do not cover deployment or external integrations in this phase.'
    ]),
    '02-review/requirement-review.md': reviewDoc(
      'Requirement Review',
      'Check requirement clarity, scope boundaries, and acceptance criteria.',
      'The requirement package is complete enough to enter planning.',
      'pass',
      'Move to planning and task decomposition.'
    ),
    '02-review/ui-review.md': reviewDoc(
      'UI Review',
      'Check prototype structure, information architecture, and interaction coverage.',
      'The prototype establishes the workflow artifacts and operator view clearly.',
      'pass',
      'Move to API design.'
    ),
    '02-review/api-review.md': reviewDoc(
      'API Review',
      'Check contract structure, data ownership, and migration impact.',
      'The API and data model support the workflow without breaking artifact boundaries.',
      'pass',
      'Freeze the contract and move to rules and tests.'
    ),
    '02-review/test-review.md': reviewDoc(
      'Test Review',
      'Check rule coverage, test case completeness, and verification scope.',
      'The test package covers success paths, failure paths, and policy regressions.',
      'pass',
      'Allow implementation to start.'
    ),
    '03-plan/task-breakdown.md': md('Task Breakdown', [
      '## Workstreams\n- Scaffold workflow workspace\n- Define manifest and state policy\n- Enforce transitions and entry gates\n- Validate sample task end to end'
    ]),
    '03-plan/dependency-map.md': md('Dependency Map', [
      '- Requirement review -> planning -> prototype -> API review -> rules and tests -> build -> verify -> audit'
    ]),
    '03-plan/ownership.md': md('Ownership', [
      '- zhongshu: intake and specification',
      '- menxia: review decisions',
      '- shangshu: state control and freeze management',
      '- gongbu: contract and implementation artifacts',
      '- xingbu: rules, tests, and verification',
      '- yushitai: audit and escalation'
    ]),
    '04-design/prototype.md': md('Prototype Design', [
      '## Page Map\n- Organize the workspace around fixed 00-09 phase directories and control documents.',
      '## Interaction Rules\n- Clarify first, review second, freeze third, then build and audit.'
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
      '- manifest.json stores task policy, routing, and artifact ownership.',
      '- state.json stores the active workflow state, agents, and approved artifacts.',
      '- agent-log.md stores stage-level execution evidence.'
    ]),
    '04-design/migration-plan.md': md('Migration Plan', [
      '- Replace the old document-only scaffold with a complete tasks/<task-id>/ workspace.',
      '- Validate the repository against a default sample task.',
      '- Add a transition controller so state cannot be advanced by ad hoc edits.'
    ]),
    '05-rules/rules.md': md('Rules Catalog', [
      '## Enforced Rules\n\n### RULE-001\n- Source: architecture design\n- Trigger: scaffold workspace\n- Constraint: generate the complete MAS task structure\n- Severity: high\n- Check: workflow validation',
      '### RULE-002\n- Source: workflow policy\n- Trigger: transition state\n- Constraint: the target state must pass its entry gate before activation\n- Severity: high\n- Check: transition controller'
    ]),
    '05-rules/allowed-files.md': md('Allowed Files', [
      '- zhongshu -> 00-intake/, 01-spec/',
      '- menxia -> 02-review/',
      '- shangshu -> 03-plan/',
      '- yushitai -> 09-audit/'
    ]),
    '05-rules/dependency-policy.md': md('Dependency Policy', [
      '- Use only Node.js built-in modules in this phase.',
      '- Do not add third-party runtime dependencies for the workflow controller.'
    ]),
    '05-rules/quality-gates.md': md('Quality Gates', [
      '- REQUIREMENT_REVIEW -> TASK_PLANNED',
      '- UI_REVIEW -> API_DESIGNED',
      '- API_REVIEW -> RULES_FROZEN',
      '- TEST_REVIEW -> BUILD_IN_PROGRESS',
      '- AUDIT_REVIEW -> DONE'
    ]),
    '06-tests/test-cases.md': md('Test Cases', [
      '## Case List\n\n### CASE-001\n- Input: scaffold workspace\n- Expected Output: every required task artifact exists',
      '### CASE-002\n- Input: transition to a review state with incomplete inputs\n- Expected Output: the controller blocks the transition',
      '### CASE-003\n- Input: rejected review decision\n- Expected Output: the controller routes to the matching rejected state'
    ]),
    '06-tests/contract/.gitkeep': '',
    '06-tests/frontend/.gitkeep': '',
    '06-tests/backend/.gitkeep': '',
    '06-tests/e2e/.gitkeep': '',
    '07-build/frontend/.gitkeep': '',
    '07-build/backend/.gitkeep': '',
    '07-build/database/.gitkeep': '',
    '07-build/generated-summary.md': md('Build Summary', [
      '- The sample task validates workflow mechanics only and does not ship product code.'
    ]),
    '08-verify/test-results.md': md('Test Results', [
      '- Expected to be filled by automated validation in future iterations.'
    ]),
    '08-verify/contract-results.md': md('Contract Results', [
      '- Confirm manifest and state remain aligned with artifact paths and workflow policy.'
    ]),
    '08-verify/build-results.md': md('Build Results', [
      '- Confirm the task can progress from BUILD_IN_PROGRESS to INTEGRATION_VERIFY with required artifacts.'
    ]),
    '08-verify/integration-results.md': md('Integration Results', [
      '- Confirm the workspace, state machine, and permission rules validate as one system.'
    ]),
    '09-audit/review.md': reviewDoc(
      'Audit Review',
      'Check workflow structure, state control, write boundaries, and policy conformance.',
      'The default sample task satisfies the mechanism requirements for this phase.',
      'pass',
      'Proceed with future orchestrator integration.'
    ),
    '09-audit/findings.md': md('Audit Findings', [
      '- No critical findings in the baseline sample task.'
    ]),
    '09-audit/risk-register.md': md('Risk Register', [
      '- R-001: future runtime orchestration will need stronger event logging and execution locking.'
    ]),
    '09-audit/compliance.md': md('Compliance Check', [
      '- Write boundaries reviewed.',
      '- State progression reviewed.',
      '- Entry gate policy reviewed.'
    ]),
    'agent-log.md': md('Agent Execution Log', [
      '## Stage Records\n\n### Stage 1 - Specification Prepared\n- Input Document: 00-intake/request.md\n- Output Document: 01-spec/spec.md\n- Followed Scope: yes\n- Modified Unrelated Files: no\n- Added New Dependencies: no\n- Review Decision: pass\n- Remaining Risk: low'
    ]),
    'state.json': `${JSON.stringify(state, null, 2)}\n`,
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`
  };
}
