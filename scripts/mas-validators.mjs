import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  DEPARTMENT_KEYS,
  PRIORITIES,
  RISK_LEVELS,
  RISK_STATUSES,
  SUPPORT_FILES,
  TASK_FILES,
  WORKFLOW_STATES
} from './mas-constants.mjs';
import { deriveApprovedArtifacts } from './mas-approvals.mjs';
import { DELIVERABLE_CONTRACTS, ORCHESTRATOR_CONTRACTS } from './mas-contracts.mjs';
import { parseDecision, validateStateEntryGate } from './mas-gates.mjs';
import { DEFAULT_CONSTRAINTS, DEFAULT_ROUTING_POLICY, STATE_DEPARTMENTS, STATE_TRANSITIONS } from './mas-policy.mjs';
import { EVENT_TYPES, RUNTIME_STATUSES } from './mas-runtime-store.mjs';
import { allowedWritePathsForState, arrayEquals, artifactPaths, isObject, resolveTaskFile, taskRoot, unique } from './mas-utils.mjs';

export const CORE_MARKDOWN_SECTIONS = Object.fromEntries(
  Object.entries(DELIVERABLE_CONTRACTS).map(([relativePath, contract]) => [relativePath, contract.headings])
);
export const ORCHESTRATOR_MARKDOWN_SECTIONS = ORCHESTRATOR_CONTRACTS;

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(filePath, label, errors) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    errors.push(`Missing required file: ${label}`);
    return null;
  }
}

function parseJson(text, label, errors) {
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function validateRequiredHeadings(markdown, headings, label, errors) {
  for (const heading of headings) {
    if (!markdown.includes(heading)) {
      errors.push(`${label} is missing required heading: ${heading}`);
    }
  }
}

function validateRequiredSnippets(markdown, snippets, label, errors) {
  for (const snippet of snippets ?? []) {
    if (!markdown.includes(snippet)) {
      errors.push(`${label} is missing required marker: ${snippet}`);
    }
  }
}

function validateDecisionFields(relativePath, markdown, errors) {
  const reviewFiles = [
    '02-review/requirement-review.md',
    '02-review/ui-review.md',
    '02-review/api-review.md',
    '02-review/test-review.md',
    '09-audit/review.md'
  ];

  if (!reviewFiles.includes(relativePath)) {
    return;
  }

  const decision = parseDecision(markdown);
  if (!['pending', 'pass', 'reject'].includes(decision)) {
    errors.push(`${relativePath} must declare Decision as pending, pass, or reject`);
  }
}

function validateStringArray(fieldName, value, errors, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array of strings`);
    return;
  }
  if (!allowEmpty && value.length === 0) {
    errors.push(`${fieldName} must not be empty`);
  }
  if (!value.every(item => typeof item === 'string' && item.length > 0)) {
    errors.push(`${fieldName} must contain non-empty strings only`);
  }
  if (new Set(value).size !== value.length) {
    errors.push(`${fieldName} must not contain duplicates`);
  }
}

function validateManifest(manifest, taskId, rootDir, errors) {
  if (!isObject(manifest)) {
    errors.push('manifest.json must be an object');
    return;
  }

  for (const key of [
    'task_id',
    'title',
    'priority',
    'goal',
    'human_approvals_required',
    'departments',
    'artifacts',
    'routing_policy',
    'constraints'
  ]) {
    if (!(key in manifest)) {
      errors.push(`manifest.json is missing field: ${key}`);
    }
  }

  if (manifest.task_id !== taskId) errors.push(`manifest.task_id must match the directory task ID: ${taskId}`);
  if (typeof manifest.title !== 'string' || manifest.title.length === 0) errors.push('manifest.title must be a non-empty string');
  if (!PRIORITIES.includes(manifest.priority)) errors.push(`manifest.priority must be one of: ${PRIORITIES.join(', ')}`);
  if (typeof manifest.goal !== 'string' || manifest.goal.length === 0) errors.push('manifest.goal must be a non-empty string');

  validateStringArray('manifest.human_approvals_required', manifest.human_approvals_required, errors);
  if (Array.isArray(manifest.human_approvals_required)) {
    for (const state of manifest.human_approvals_required) {
      if (!WORKFLOW_STATES.includes(state)) errors.push(`manifest.human_approvals_required includes unknown state: ${state}`);
    }
    for (const state of ['REQUIREMENT_REVIEW', 'UI_REVIEW', 'API_REVIEW', 'TEST_REVIEW', 'AUDIT_REVIEW']) {
      if (!manifest.human_approvals_required.includes(state)) {
        errors.push(`manifest.human_approvals_required must include ${state}`);
      }
    }
  }

  if (!isObject(manifest.departments)) {
    errors.push('manifest.departments must be an object');
  } else {
    for (const department of DEPARTMENT_KEYS) {
      if (!(department in manifest.departments)) errors.push(`manifest.departments is missing department: ${department}`);
      validateStringArray(`manifest.departments.${department}`, manifest.departments[department], errors);
    }
    for (const extraKey of Object.keys(manifest.departments)) {
      if (!DEPARTMENT_KEYS.includes(extraKey)) errors.push(`manifest.departments includes unknown department: ${extraKey}`);
    }
  }

  const expectedArtifacts = artifactPaths(taskId);
  if (!isObject(manifest.artifacts)) {
    errors.push('manifest.artifacts must be an object');
  } else {
    for (const [artifact, expectedPath] of Object.entries(expectedArtifacts)) {
      if (manifest.artifacts[artifact] !== expectedPath) {
        errors.push(`manifest.artifacts.${artifact} must equal ${expectedPath}`);
      }
      const absolutePath = join(rootDir, ...(manifest.artifacts[artifact] ?? '').split('/'));
      if (!absolutePath.startsWith(taskRoot(rootDir, taskId))) {
        errors.push(`manifest.artifacts.${artifact} must stay within tasks/${taskId}/`);
      }
    }
  }

  if (!isObject(manifest.routing_policy)) {
    errors.push('manifest.routing_policy must be an object');
  } else {
    for (const [field, expectedStates] of Object.entries(DEFAULT_ROUTING_POLICY)) {
      validateStringArray(`manifest.routing_policy.${field}`, manifest.routing_policy[field], errors);
      if (Array.isArray(manifest.routing_policy[field]) && !arrayEquals(manifest.routing_policy[field], expectedStates)) {
        errors.push(`manifest.routing_policy.${field} must match the design policy`);
      }
    }
  }

  if (!isObject(manifest.constraints)) {
    errors.push('manifest.constraints must be an object');
  } else {
    for (const [constraint, expectedValue] of Object.entries(DEFAULT_CONSTRAINTS)) {
      if (manifest.constraints[constraint] !== expectedValue) {
        errors.push(`manifest.constraints.${constraint} must equal ${expectedValue}`);
      }
    }
  }
}

function validateRiskList(risks, errors) {
  if (!Array.isArray(risks)) {
    errors.push('state.risks must be an array');
    return;
  }
  for (const [index, risk] of risks.entries()) {
    if (!isObject(risk)) {
      errors.push(`state.risks[${index}] must be an object`);
      continue;
    }
    for (const key of ['id', 'level', 'summary', 'status', 'owner']) {
      if (!(key in risk)) errors.push(`state.risks[${index}] is missing field: ${key}`);
    }
    if (!RISK_LEVELS.includes(risk.level)) errors.push(`state.risks[${index}].level is invalid: ${risk.level}`);
    if (!RISK_STATUSES.includes(risk.status)) errors.push(`state.risks[${index}].status is invalid: ${risk.status}`);
  }
}

function validateRuntimeControl(control, taskId, errors) {
  if (!isObject(control)) {
    errors.push('runtime/control.json must be an object');
    return;
  }

  for (const key of [
    'task_id',
    'status',
    'paused',
    'pause_reason',
    'current_blocker',
    'lease',
    'retry_policy',
    'pending_human_actions',
    'last_event_id',
    'last_event_at',
    'updated_at'
  ]) {
    if (!(key in control)) {
      errors.push(`runtime/control.json is missing field: ${key}`);
    }
  }

  if (control.task_id !== taskId) {
    errors.push(`runtime/control.task_id must match the directory task ID: ${taskId}`);
  }
  if (!RUNTIME_STATUSES.includes(control.status)) {
    errors.push(`runtime/control.status must be one of: ${RUNTIME_STATUSES.join(', ')}`);
  }
  if (typeof control.paused !== 'boolean') {
    errors.push('runtime/control.paused must be a boolean');
  }
  if (!(control.pause_reason === null || typeof control.pause_reason === 'string')) {
    errors.push('runtime/control.pause_reason must be null or a string');
  }

  if (!(control.current_blocker === null || isObject(control.current_blocker))) {
    errors.push('runtime/control.current_blocker must be null or an object');
  } else if (isObject(control.current_blocker)) {
    for (const key of ['kind', 'message', 'at']) {
      if (!(key in control.current_blocker)) {
        errors.push(`runtime/control.current_blocker is missing field: ${key}`);
      }
    }
    if (typeof control.current_blocker.at !== 'string' || Number.isNaN(Date.parse(control.current_blocker.at))) {
      errors.push('runtime/control.current_blocker.at must be a valid ISO 8601 timestamp');
    }
  }

  if (!(control.lease === null || isObject(control.lease))) {
    errors.push('runtime/control.lease must be null or an object');
  } else if (isObject(control.lease)) {
    for (const key of ['owner', 'token', 'acquired_at', 'heartbeat_at', 'expires_at']) {
      if (!(key in control.lease)) {
        errors.push(`runtime/control.lease is missing field: ${key}`);
      }
    }
  }

  if (!isObject(control.retry_policy)) {
    errors.push('runtime/control.retry_policy must be an object');
  } else {
    for (const key of ['total_attempts', 'consecutive_failures', 'last_error', 'last_failure_at']) {
      if (!(key in control.retry_policy)) {
        errors.push(`runtime/control.retry_policy is missing field: ${key}`);
      }
    }
  }

  validateStringArray('runtime/control.pending_human_actions', control.pending_human_actions, errors, { allowEmpty: true });

  if (!Number.isInteger(control.last_event_id) || control.last_event_id < 0) {
    errors.push('runtime/control.last_event_id must be a non-negative integer');
  }
  if (!(control.last_event_at === null || (typeof control.last_event_at === 'string' && !Number.isNaN(Date.parse(control.last_event_at))))) {
    errors.push('runtime/control.last_event_at must be null or a valid ISO 8601 timestamp');
  }
  if (typeof control.updated_at !== 'string' || Number.isNaN(Date.parse(control.updated_at))) {
    errors.push('runtime/control.updated_at must be a valid ISO 8601 timestamp');
  }
}

function validateRuntimeEvents(eventsText, taskId, errors) {
  const lines = eventsText.split(/\r?\n/u).filter(Boolean);
  let previousId = 0;

  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      errors.push(`runtime/events.jsonl line ${index + 1} is not valid JSON: ${error.message}`);
      continue;
    }

    if (!isObject(event)) {
      errors.push(`runtime/events.jsonl line ${index + 1} must be an object`);
      continue;
    }

    for (const key of ['id', 'ts', 'task_id', 'type', 'actor', 'summary', 'detail']) {
      if (!(key in event)) {
        errors.push(`runtime/events.jsonl line ${index + 1} is missing field: ${key}`);
      }
    }
    if (!Number.isInteger(event.id) || event.id <= previousId) {
      errors.push(`runtime/events.jsonl line ${index + 1} must have a strictly increasing integer id`);
    }
    previousId = Number.isInteger(event.id) ? event.id : previousId;
    if (event.task_id !== taskId) {
      errors.push(`runtime/events.jsonl line ${index + 1} must use task_id ${taskId}`);
    }
    if (typeof event.ts !== 'string' || Number.isNaN(Date.parse(event.ts))) {
      errors.push(`runtime/events.jsonl line ${index + 1} must have a valid ISO 8601 ts`);
    }
    if (!EVENT_TYPES.includes(event.type)) {
      errors.push(`runtime/events.jsonl line ${index + 1} has unknown type: ${event.type}`);
    }
    if (!isObject(event.actor)) {
      errors.push(`runtime/events.jsonl line ${index + 1} must include an actor object`);
    }
    if (typeof event.summary !== 'string' || event.summary.length === 0) {
      errors.push(`runtime/events.jsonl line ${index + 1} must include a non-empty summary`);
    }
    if (!isObject(event.detail)) {
      errors.push(`runtime/events.jsonl line ${index + 1} must include a detail object`);
    }
  }

  return lines.length === 0 ? 0 : previousId;
}

async function validateCurrentStateGate(rootDir, taskId, state, errors) {
  const gateErrors = await validateStateEntryGate({
    rootDir,
    taskId,
    targetState: state.current_state
  });
  for (const gateError of gateErrors) {
    errors.push(`state.current_state gate failed: ${gateError}`);
  }
}

async function validateState(state, manifest, taskId, rootDir, errors) {
  if (!isObject(state)) {
    errors.push('state.json must be an object');
    return;
  }

  for (const key of [
    'task_id',
    'current_state',
    'previous_state',
    'owner',
    'approved_artifacts',
    'blocked_by',
    'active_agents',
    'allowed_write_paths',
    'risks',
    'updated_at'
  ]) {
    if (!(key in state)) errors.push(`state.json is missing field: ${key}`);
  }

  if (state.task_id !== taskId) errors.push(`state.task_id must match the directory task ID: ${taskId}`);
  if (!WORKFLOW_STATES.includes(state.current_state)) errors.push(`state.current_state is invalid: ${state.current_state}`);
  if (!(state.previous_state === null || WORKFLOW_STATES.includes(state.previous_state))) {
    errors.push(`state.previous_state is invalid: ${state.previous_state}`);
  }
  if (state.previous_state !== null && !(STATE_TRANSITIONS[state.previous_state] ?? []).includes(state.current_state)) {
    errors.push(`Illegal state transition recorded: ${state.previous_state} -> ${state.current_state}`);
  }
  if (typeof state.owner !== 'string' || state.owner.length === 0) errors.push('state.owner must be a non-empty string');
  if (!isObject(state.approved_artifacts)) {
    errors.push('state.approved_artifacts must be an object');
  } else {
    const expected = await deriveApprovedArtifacts({
      rootDir,
      taskId,
      currentState: state.current_state
    });
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (state.approved_artifacts[key] !== expectedValue) {
        errors.push(`state.approved_artifacts.${key} does not match derived approvals for ${state.current_state}`);
      }
    }
  }

  validateStringArray('state.blocked_by', state.blocked_by, errors, { allowEmpty: true });
  validateStringArray('state.active_agents', state.active_agents, errors, { allowEmpty: state.current_state === 'DONE' });
  validateStringArray('state.allowed_write_paths', state.allowed_write_paths, errors, { allowEmpty: state.current_state === 'DONE' });
  validateRiskList(state.risks, errors);

  if (typeof state.updated_at !== 'string' || Number.isNaN(Date.parse(state.updated_at))) {
    errors.push('state.updated_at must be a valid ISO 8601 timestamp');
  }

  if (!isObject(manifest?.departments)) return;

  const knownAgents = unique(Object.values(manifest.departments).flat());
  if (!knownAgents.includes(state.owner)) errors.push(`state.owner is not registered in manifest.departments: ${state.owner}`);
  for (const agent of state.active_agents ?? []) {
    if (!knownAgents.includes(agent)) errors.push(`state.active_agents includes unknown agent: ${agent}`);
  }

  const allowedDepartments = STATE_DEPARTMENTS[state.current_state] ?? [];
  const allowedAgents = unique(allowedDepartments.flatMap(department => manifest.departments[department] ?? []));
  for (const agent of state.active_agents ?? []) {
    if (!allowedAgents.includes(agent)) {
      errors.push(`state.active_agents includes ${agent}, which is not allowed in ${state.current_state}`);
    }
  }
  if (state.current_state !== 'DONE' && Array.isArray(state.active_agents) && !state.active_agents.includes(state.owner)) {
    errors.push('state.owner must be included in state.active_agents');
  }

  const expectedWritePaths = allowedWritePathsForState(state.current_state);
  if (Array.isArray(state.allowed_write_paths) && !arrayEquals(state.allowed_write_paths, expectedWritePaths)) {
    errors.push(`state.allowed_write_paths does not match ${state.current_state}`);
  }

  await validateCurrentStateGate(rootDir, taskId, state, errors);
}

async function validateWorkspaceFiles(rootDir, taskId, errors) {
  for (const relativePath of TASK_FILES) {
    if (!await fileExists(resolveTaskFile(rootDir, taskId, relativePath))) {
      errors.push(`Missing task file: tasks/${taskId}/${relativePath}`);
    }
  }
  for (const relativePath of SUPPORT_FILES) {
    if (!await fileExists(join(rootDir, ...relativePath.split('/')))) {
      errors.push(`Missing support file: ${relativePath}`);
    }
  }
}

async function validateMarkdownContracts(rootDir, taskId, errors) {
  for (const [relativePath, headings] of Object.entries(CORE_MARKDOWN_SECTIONS)) {
    const absolutePath = resolveTaskFile(rootDir, taskId, relativePath);
    const content = await readTextFile(absolutePath, relativePath, errors);
    if (content) {
      validateRequiredHeadings(content, headings, relativePath, errors);
      validateRequiredSnippets(content, DELIVERABLE_CONTRACTS[relativePath]?.snippets, relativePath, errors);
      validateDecisionFields(relativePath, content, errors);
    }
  }

  for (const [relativePath, headings] of Object.entries(ORCHESTRATOR_MARKDOWN_SECTIONS)) {
    const absolutePath = relativePath.startsWith('orchestrator/')
      ? join(rootDir, ...relativePath.split('/'))
      : resolveTaskFile(rootDir, taskId, relativePath);
    const content = await readTextFile(absolutePath, relativePath, errors);
    if (content) validateRequiredHeadings(content, headings, relativePath, errors);
  }
}

export async function validateTaskWorkspace({ rootDir, taskId }) {
  const errors = [];
  await validateWorkspaceFiles(rootDir, taskId, errors);
  await validateMarkdownContracts(rootDir, taskId, errors);

  const manifestText = await readTextFile(resolveTaskFile(rootDir, taskId, 'manifest.json'), 'manifest.json', errors);
  const stateText = await readTextFile(resolveTaskFile(rootDir, taskId, 'state.json'), 'state.json', errors);
  const manifest = manifestText ? parseJson(manifestText, 'manifest.json', errors) : null;
  const state = stateText ? parseJson(stateText, 'state.json', errors) : null;

  if (manifest) validateManifest(manifest, taskId, rootDir, errors);
  if (state) await validateState(state, manifest, taskId, rootDir, errors);

  const runtimeControlText = await readTextFile(resolveTaskFile(rootDir, taskId, 'runtime/control.json'), 'runtime/control.json', errors);
  const runtimeEventsText = await readTextFile(resolveTaskFile(rootDir, taskId, 'runtime/events.jsonl'), 'runtime/events.jsonl', errors);
  const runtimeControl = runtimeControlText ? parseJson(runtimeControlText, 'runtime/control.json', errors) : null;
  if (runtimeControl) {
    validateRuntimeControl(runtimeControl, taskId, errors);
  }
  const lastEventId = runtimeEventsText ? validateRuntimeEvents(runtimeEventsText, taskId, errors) : 0;
  if (runtimeControl && runtimeControl.last_event_id !== lastEventId) {
    errors.push(`runtime/control.last_event_id must match the final event id in runtime/events.jsonl`);
  }

  if (manifest?.artifacts) {
    for (const [artifact, relativePath] of Object.entries(manifest.artifacts)) {
      if (!await fileExists(join(rootDir, ...relativePath.split('/')))) {
        errors.push(`manifest.artifacts.${artifact} points to a missing file: ${relativePath}`);
      }
    }
  }

  return { taskId, valid: errors.length === 0, errors };
}
