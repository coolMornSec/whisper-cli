import { readFile } from 'node:fs/promises';

import { resolveTaskFile } from './mas-utils.mjs';

export const GATE_RULES = {
  SPEC_DRAFT: {
    requiredFiles: ['00-intake/request.md', '00-intake/context.md', '00-intake/constraints.md']
  },
  REQUIREMENT_REVIEW: {
    markdownSections: {
      '01-spec/spec.md': [
        '# Specification',
        '## Task Goal',
        '## Business Context',
        '## Scope',
        '## Inputs And Outputs',
        '## Acceptance Criteria'
      ],
      '01-spec/acceptance.md': ['# Acceptance Criteria'],
      '01-spec/non-goals.md': ['# Non-Goals']
    }
  },
  TASK_PLANNED: {
    reviewDecision: { file: '02-review/requirement-review.md', expected: 'pass' }
  },
  REQUIREMENT_REJECTED: {
    reviewDecision: { file: '02-review/requirement-review.md', expected: 'reject' }
  },
  PROTOTYPE_DRAFT: {
    requiredFiles: ['03-plan/task-breakdown.md', '03-plan/dependency-map.md', '03-plan/ownership.md']
  },
  UI_REVIEW: {
    markdownSections: {
      '04-design/prototype.md': ['# Prototype Design', '## Page Map', '## Interaction Rules']
    }
  },
  API_DESIGNED: {
    reviewDecision: { file: '02-review/ui-review.md', expected: 'pass' }
  },
  UI_REJECTED: {
    reviewDecision: { file: '02-review/ui-review.md', expected: 'reject' }
  },
  API_REVIEW: {
    requiredFiles: ['04-design/api-contract.yaml', '04-design/data-model.md', '04-design/migration-plan.md']
  },
  RULES_FROZEN: {
    reviewDecision: { file: '02-review/api-review.md', expected: 'pass' },
    requiredFiles: ['05-rules/rules.md', '05-rules/quality-gates.md']
  },
  API_REJECTED: {
    reviewDecision: { file: '02-review/api-review.md', expected: 'reject' }
  },
  TESTS_DRAFTED: {
    requiredFiles: [
      '05-rules/rules.md',
      '05-rules/allowed-files.md',
      '05-rules/dependency-policy.md',
      '05-rules/quality-gates.md'
    ]
  },
  TEST_REVIEW: {
    markdownSections: {
      '06-tests/test-cases.md': ['# Test Cases', '## Case List']
    }
  },
  BUILD_IN_PROGRESS: {
    reviewDecision: { file: '02-review/test-review.md', expected: 'pass' }
  },
  TEST_REJECTED: {
    reviewDecision: { file: '02-review/test-review.md', expected: 'reject' }
  },
  INTEGRATION_VERIFY: {
    requiredFiles: ['07-build/generated-summary.md']
  },
  VERIFY_FAILED: {
    requiredFiles: ['08-verify/test-results.md']
  },
  AUDIT_REVIEW: {
    requiredFiles: [
      '08-verify/test-results.md',
      '08-verify/contract-results.md',
      '08-verify/build-results.md',
      '08-verify/integration-results.md'
    ]
  },
  DONE: {
    reviewDecision: { file: '09-audit/review.md', expected: 'pass' }
  },
  AUDIT_FAILED: {
    reviewDecision: { file: '09-audit/review.md', expected: 'reject' }
  }
};

async function readMarkdown(rootDir, taskId, relativePath) {
  return readFile(resolveTaskFile(rootDir, taskId, relativePath), 'utf8');
}

export function parseDecision(markdown) {
  const match = markdown.match(/## Decision\s*\r?\n-\s*([a-zA-Z]+)/);
  return match ? match[1].toLowerCase() : null;
}

export async function validateStateEntryGate({ rootDir, taskId, targetState }) {
  const errors = [];
  const gate = GATE_RULES[targetState];

  if (!gate) {
    return errors;
  }

  for (const relativePath of gate.requiredFiles ?? []) {
    try {
      await readFile(resolveTaskFile(rootDir, taskId, relativePath), 'utf8');
    } catch {
      errors.push(`Missing required file for ${targetState}: ${relativePath}`);
    }
  }

  for (const [relativePath, headings] of Object.entries(gate.markdownSections ?? {})) {
    try {
      const markdown = await readMarkdown(rootDir, taskId, relativePath);
      for (const heading of headings) {
        if (!markdown.includes(heading)) {
          errors.push(`${relativePath} is missing required heading: ${heading}`);
        }
      }
    } catch {
      errors.push(`Missing required markdown file for ${targetState}: ${relativePath}`);
    }
  }

  if (gate.reviewDecision) {
    try {
      const markdown = await readMarkdown(rootDir, taskId, gate.reviewDecision.file);
      const decision = parseDecision(markdown);
      if (decision !== gate.reviewDecision.expected) {
        errors.push(
          `${gate.reviewDecision.file} must contain decision "${gate.reviewDecision.expected}" before entering ${targetState}`
        );
      }
    } catch {
      errors.push(`Missing review file for ${targetState}: ${gate.reviewDecision.file}`);
    }
  }

  return errors;
}

export async function assertStateEntryGate({ rootDir, taskId, targetState }) {
  const errors = await validateStateEntryGate({ rootDir, taskId, targetState });
  if (errors.length > 0) {
    throw new Error(`Entry gate failed for ${targetState}:\n- ${errors.join('\n- ')}`);
  }
}
