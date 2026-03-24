import { readFile, writeFile } from 'node:fs/promises';

import { deriveApprovedArtifacts } from './mas-approvals.mjs';
import { validateTaskWorkspace } from './mas-validators.mjs';
import { resolveTaskFile } from './mas-utils.mjs';

const AUDIT_BLOCK_PREFIX = 'audit-escalation:';
const AUDIT_RISK_PREFIX = 'AUDIT-';

function severityToRiskLevel(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function summarizeFinding(error) {
  return error.replace(/\s+/g, ' ').trim();
}

function classifyFinding(error, currentState) {
  const governanceMatchers = [
    'manifest.',
    '01-spec/',
    '02-review/',
    '03-plan/',
    '04-design/',
    'department',
    'routing_policy',
    'constraints',
    'task-breakdown',
    'ownership',
    'Dependency Map'
  ];
  const executionMatchers = [
    '05-rules/',
    '06-tests/',
    '07-build/',
    '08-verify/',
    'state.allowed_write_paths',
    'state.active_agents',
    'state.approved_artifacts',
    'build',
    'verification'
  ];

  let category = 'execution';
  let rollbackState = 'BUILD_IN_PROGRESS';
  let severity = 'high';

  if (governanceMatchers.some(matcher => error.includes(matcher))) {
    category = 'governance';
    rollbackState = 'TASK_PLANNED';
  } else if (executionMatchers.some(matcher => error.includes(matcher))) {
    category = 'execution';
    rollbackState = 'BUILD_IN_PROGRESS';
  } else if (
    ['INTAKE', 'SPEC_DRAFT', 'REQUIREMENT_REVIEW', 'REQUIREMENT_REJECTED', 'TASK_PLANNED', 'PROTOTYPE_DRAFT', 'UI_REVIEW', 'UI_REJECTED', 'API_DESIGNED', 'API_REVIEW', 'API_REJECTED'].includes(
      currentState
    )
  ) {
    category = 'governance';
    rollbackState = 'TASK_PLANNED';
  }

  if (error.includes('Illegal state transition recorded') || error.includes('state.current_state gate failed')) {
    severity = 'critical';
  } else if (error.includes('Missing required') || error.includes('must')) {
    severity = 'high';
  } else {
    severity = 'medium';
  }

  return { category, rollbackState, severity };
}

function pickRecommendedRollback(findings, currentState) {
  if (findings.some(finding => finding.rollbackState === 'TASK_PLANNED')) {
    return 'TASK_PLANNED';
  }
  if (findings.some(finding => finding.rollbackState === 'BUILD_IN_PROGRESS')) {
    return 'BUILD_IN_PROGRESS';
  }
  if (['BUILD_IN_PROGRESS', 'INTEGRATION_VERIFY', 'VERIFY_FAILED', 'AUDIT_REVIEW', 'AUDIT_FAILED', 'DONE'].includes(currentState)) {
    return 'BUILD_IN_PROGRESS';
  }
  return 'TASK_PLANNED';
}

function renderFindings(findings) {
  if (findings.length === 0) {
    return '- No active audit findings.';
  }

  return findings
    .map(
      finding => `### ${finding.id}
- Category: ${finding.category}
- Severity: ${finding.severity}
- Summary: ${finding.summary}
- Recommended Rollback: ${finding.rollbackState}`
    )
    .join('\n\n');
}

function renderRisks(findings) {
  if (findings.length === 0) {
    return '- No active audit risks.';
  }

  return findings
    .map(finding => `- ${finding.id} | ${severityToRiskLevel(finding.severity)} | ${finding.summary}`)
    .join('\n');
}

function reviewDecisionForAudit(currentState, findings) {
  if (findings.length > 0) {
    return 'reject';
  }
  if (currentState === 'AUDIT_REVIEW') {
    return 'pass';
  }
  return 'pending';
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeAuditDocuments({ rootDir, taskId, findings, decision, recommendedRollbackState, escalationTarget }) {
  const reviewPath = resolveTaskFile(rootDir, taskId, '09-audit/review.md');
  const findingsPath = resolveTaskFile(rootDir, taskId, '09-audit/findings.md');
  const riskPath = resolveTaskFile(rootDir, taskId, '09-audit/risk-register.md');
  const compliancePath = resolveTaskFile(rootDir, taskId, '09-audit/compliance.md');

  const followUpText =
    findings.length > 0
      ? `- Return the task to ${recommendedRollbackState} and require shangshu to coordinate remediation.`
      : '- No rollback required at this time.';
  const escalationText =
    findings.length > 0
      ? `- Notify ${escalationTarget} immediately and pause downstream execution until the rollback decision is applied.`
      : '- No escalation required.';

  await writeFile(
    reviewPath,
    `# Audit Review

## Review Scope
- Inspect workflow execution, state integrity, write boundaries, and approval flow independent of production departments.

## Findings
- ${findings.length === 0 ? 'No active findings.' : `${findings.length} finding(s) detected.`}

## Decision
- ${decision}

## Follow-ups
${followUpText}

## Escalation
${escalationText}
`,
    'utf8'
  );

  await writeFile(
    findingsPath,
    `# Audit Findings

## Findings List
${renderFindings(findings)}

## Notifications
- ${findings.length === 0 ? 'No notifications sent.' : `Notify ${escalationTarget} and the current task owner about the rollback recommendation.`}
`,
    'utf8'
  );

  await writeFile(
    riskPath,
    `# Risk Register

## Active Risks
${renderRisks(findings)}

## Rollback Recommendation
- ${findings.length === 0 ? 'None.' : recommendedRollbackState}
`,
    'utf8'
  );

  await writeFile(
    compliancePath,
    `# Compliance Check

## Compliance Status
- ${findings.length === 0 ? 'Compliant.' : 'Non-compliant.'}

## Recommended Action
- ${findings.length === 0 ? 'Continue with the current planned workflow.' : `Escalate to ${escalationTarget} and return to ${recommendedRollbackState}.`}
`,
    'utf8'
  );
}

export async function auditTaskWorkspace({ rootDir, taskId }) {
  const statePath = resolveTaskFile(rootDir, taskId, 'state.json');
  const state = await readJson(statePath);
  const validation = await validateTaskWorkspace({ rootDir, taskId });

  const findings = validation.errors.map((error, index) => {
    const classification = classifyFinding(error, state.current_state);
    return {
      id: `${AUDIT_RISK_PREFIX}${String(index + 1).padStart(3, '0')}`,
      summary: summarizeFinding(error),
      ...classification
    };
  });

  const decision = reviewDecisionForAudit(state.current_state, findings);
  const recommendedRollbackState = findings.length > 0 ? pickRecommendedRollback(findings, state.current_state) : null;
  const escalationTarget = 'shangshu';

  await writeAuditDocuments({
    rootDir,
    taskId,
    findings,
    decision,
    recommendedRollbackState,
    escalationTarget
  });

  const refreshedState = await readJson(statePath);
  const nextBlockedBy = (refreshedState.blocked_by ?? []).filter(entry => !entry.startsWith(AUDIT_BLOCK_PREFIX));
  const nextRisks = (refreshedState.risks ?? []).filter(risk => !String(risk.id ?? '').startsWith(AUDIT_RISK_PREFIX));

  if (findings.length > 0) {
    nextBlockedBy.push(`${AUDIT_BLOCK_PREFIX}${recommendedRollbackState}:notify-${escalationTarget}`);
    nextRisks.push(
      ...findings.map(finding => ({
        id: finding.id,
        level: severityToRiskLevel(finding.severity),
        summary: finding.summary,
        status: 'open',
        owner: 'audit-agent'
      }))
    );
  }

  const approvedArtifacts = await deriveApprovedArtifacts({
    rootDir,
    taskId,
    currentState: refreshedState.current_state
  });

  const nextState = {
    ...refreshedState,
    approved_artifacts: approvedArtifacts,
    blocked_by: nextBlockedBy,
    risks: nextRisks,
    updated_at: new Date().toISOString()
  };

  await writeJson(statePath, nextState);

  return {
    taskId,
    decision,
    findings,
    escalation: findings.length > 0
      ? {
          target: escalationTarget,
          recommendedRollbackState
        }
      : {
          target: escalationTarget,
          recommendedRollbackState: null
        },
    recommendedRollbackState
  };
}
