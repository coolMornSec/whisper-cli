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

  if (manifest?.artifacts) {
    for (const [artifact, relativePath] of Object.entries(manifest.artifacts)) {
      if (!await fileExists(join(rootDir, ...relativePath.split('/')))) {
        errors.push(`manifest.artifacts.${artifact} points to a missing file: ${relativePath}`);
      }
    }
  }

  return { taskId, valid: errors.length === 0, errors };
}
