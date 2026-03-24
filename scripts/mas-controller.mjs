import { readFile, writeFile } from 'node:fs/promises';

import { deriveApprovedArtifacts } from './mas-approvals.mjs';
import { WORKFLOW_STATES } from './mas-constants.mjs';
import { assertStateEntryGate } from './mas-gates.mjs';
import { STATE_TRANSITIONS } from './mas-policy.mjs';
import { activeAgentsForState, allowedWritePathsForState, ownerForState, resolveTaskFile } from './mas-utils.mjs';

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function transitionTaskState({ rootDir, taskId, toState }) {
  if (!WORKFLOW_STATES.includes(toState)) {
    throw new Error(`Unknown target state: ${toState}`);
  }

  const manifestPath = resolveTaskFile(rootDir, taskId, 'manifest.json');
  const statePath = resolveTaskFile(rootDir, taskId, 'state.json');
  const manifest = await readJson(manifestPath);
  const state = await readJson(statePath);
  const allowedNextStates = STATE_TRANSITIONS[state.current_state] ?? [];

  if (!allowedNextStates.includes(toState)) {
    throw new Error(`Illegal state transition: ${state.current_state} -> ${toState}`);
  }

  await assertStateEntryGate({ rootDir, taskId, targetState: toState });

  const approvedArtifacts = await deriveApprovedArtifacts({
    rootDir,
    taskId,
    currentState: toState
  });

  const nextState = {
    ...state,
    previous_state: state.current_state,
    current_state: toState,
    owner: ownerForState(toState, manifest.departments),
    active_agents: activeAgentsForState(toState, manifest.departments),
    allowed_write_paths: allowedWritePathsForState(toState),
    approved_artifacts: approvedArtifacts,
    blocked_by: [],
    updated_at: new Date().toISOString()
  };

  await writeJson(statePath, nextState);
  return nextState;
}
