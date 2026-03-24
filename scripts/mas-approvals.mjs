import { readFile } from 'node:fs/promises';

import { parseDecision } from './mas-gates.mjs';
import { resolveTaskFile } from './mas-utils.mjs';

const REVIEW_BINDINGS = [
  { artifact: 'spec', file: '02-review/requirement-review.md' },
  { artifact: 'prototype', file: '02-review/ui-review.md' },
  { artifact: 'api_contract', file: '02-review/api-review.md' },
  { artifact: 'tests', file: '02-review/test-review.md' },
  { artifact: 'audit', file: '09-audit/review.md' }
];

const RULE_FILES = [
  '05-rules/rules.md',
  '05-rules/allowed-files.md',
  '05-rules/dependency-policy.md',
  '05-rules/quality-gates.md'
];

const VERIFICATION_FILES = [
  '08-verify/test-results.md',
  '08-verify/contract-results.md',
  '08-verify/build-results.md',
  '08-verify/integration-results.md'
];

const RULE_APPROVAL_STATES = [
  'RULES_FROZEN',
  'TESTS_DRAFTED',
  'TEST_REVIEW',
  'TEST_REJECTED',
  'BUILD_IN_PROGRESS',
  'INTEGRATION_VERIFY',
  'VERIFY_FAILED',
  'AUDIT_REVIEW',
  'AUDIT_FAILED',
  'DONE'
];

const BUILD_APPROVAL_STATES = ['INTEGRATION_VERIFY', 'VERIFY_FAILED', 'AUDIT_REVIEW', 'AUDIT_FAILED', 'DONE'];
const VERIFICATION_APPROVAL_STATES = ['AUDIT_REVIEW', 'AUDIT_FAILED', 'DONE'];

async function readText(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function allFilesExist(rootDir, taskId, relativePaths) {
  for (const relativePath of relativePaths) {
    const content = await readText(resolveTaskFile(rootDir, taskId, relativePath));
    if (content === null) {
      return false;
    }
  }
  return true;
}

export function emptyApprovedArtifacts() {
  return {
    spec: false,
    prototype: false,
    api_contract: false,
    rules: false,
    tests: false,
    build: false,
    verification: false,
    audit: false
  };
}

export async function deriveApprovedArtifacts({ rootDir, taskId, currentState }) {
  const approvals = emptyApprovedArtifacts();

  for (const binding of REVIEW_BINDINGS) {
    const markdown = await readText(resolveTaskFile(rootDir, taskId, binding.file));
    const decision = markdown ? parseDecision(markdown) : null;
    approvals[binding.artifact] = decision === 'pass';
  }

  if (RULE_APPROVAL_STATES.includes(currentState)) {
    approvals.rules = await allFilesExist(rootDir, taskId, RULE_FILES);
  }

  if (BUILD_APPROVAL_STATES.includes(currentState)) {
    approvals.build = await allFilesExist(rootDir, taskId, ['07-build/generated-summary.md']);
  }

  if (VERIFICATION_APPROVAL_STATES.includes(currentState)) {
    approvals.verification = await allFilesExist(rootDir, taskId, VERIFICATION_FILES);
  }

  return approvals;
}
