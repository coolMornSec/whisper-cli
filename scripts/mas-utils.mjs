import { join } from 'node:path';

import { DEPARTMENT_WRITE_SCOPES, STATE_DEPARTMENTS } from './mas-policy.mjs';

export function toPosix(pathValue) {
  return pathValue.replaceAll('\\', '/');
}

export function unique(values) {
  return [...new Set(values)];
}

export function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function arrayEquals(left, right) {
  return JSON.stringify(sortStrings(left)) === JSON.stringify(sortStrings(right));
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function taskRoot(rootDir, taskId) {
  return join(rootDir, 'tasks', taskId);
}

export function resolveTaskFile(rootDir, taskId, relativePath) {
  return join(taskRoot(rootDir, taskId), ...relativePath.split('/'));
}

export function artifactPaths(taskId) {
  return {
    spec: `tasks/${taskId}/01-spec/spec.md`,
    prototype: `tasks/${taskId}/04-design/prototype.md`,
    api_contract: `tasks/${taskId}/04-design/api-contract.yaml`,
    rules: `tasks/${taskId}/05-rules/rules.md`,
    tests: `tasks/${taskId}/06-tests/test-cases.md`,
    audit: `tasks/${taskId}/09-audit/review.md`
  };
}

export function defaultDepartments() {
  return {
    zhongshu: ['spec-agent'],
    menxia: ['requirement-reviewer', 'ui-reviewer', 'api-reviewer', 'test-reviewer'],
    shangshu: ['orchestrator-agent'],
    libu_task_breakdown: ['task-breakdown-agent'],
    libu_prototype: ['prototype-agent'],
    gongbu: ['api-agent', 'frontend-agent', 'backend-agent', 'database-agent'],
    xingbu: ['rules-agent', 'test-agent', 'verify-agent'],
    yushitai: ['audit-agent']
  };
}

export function allowedWritePathsForState(state) {
  const departments = STATE_DEPARTMENTS[state] ?? [];
  return unique(departments.flatMap(department => DEPARTMENT_WRITE_SCOPES[department] ?? []));
}

export function ownerForState(state, departments = defaultDepartments()) {
  const department = (STATE_DEPARTMENTS[state] ?? [])[0];
  return departments[department]?.[0] ?? 'orchestrator-agent';
}

export function activeAgentsForState(state, departments = defaultDepartments()) {
  return unique((STATE_DEPARTMENTS[state] ?? []).flatMap(department => departments[department] ?? []));
}
