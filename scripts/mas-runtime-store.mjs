import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { isObject, resolveTaskFile } from './mas-utils.mjs';

export const RUNTIME_STATUSES = ['queued', 'running', 'paused', 'blocked', 'completed', 'failed'];
export const EVENT_TYPES = [
  'TASK_ENQUEUED',
  'TASK_LEASED',
  'LEASE_RELEASED',
  'AGENT_STARTED',
  'AGENT_COMPLETED',
  'AGENT_FAILED',
  'STATE_TRANSITIONED',
  'GATE_BLOCKED',
  'REVIEW_DECISION_CHANGED',
  'AUDIT_DECISION_CHANGED',
  'HUMAN_INTERVENTION',
  'TASK_COMPLETED'
];

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function defaultRuntimeControl(taskId, timestamp = nowIso()) {
  return {
    task_id: taskId,
    status: 'queued',
    paused: false,
    pause_reason: null,
    current_blocker: null,
    lease: null,
    retry_policy: {
      total_attempts: 0,
      consecutive_failures: 0,
      last_error: null,
      last_failure_at: null
    },
    pending_human_actions: [],
    last_event_id: 0,
    last_event_at: null,
    updated_at: timestamp
  };
}

export function renderRuntimeFiles(taskId) {
  return {
    'runtime/control.json': `${JSON.stringify(defaultRuntimeControl(taskId), null, 2)}\n`,
    'runtime/events.jsonl': ''
  };
}

export function runtimeControlPath(rootDir, taskId) {
  return resolveTaskFile(rootDir, taskId, 'runtime/control.json');
}

export function runtimeEventsPath(rootDir, taskId) {
  return resolveTaskFile(rootDir, taskId, 'runtime/events.jsonl');
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function ensureRuntimeFiles({ rootDir, taskId }) {
  const fileMap = renderRuntimeFiles(taskId);
  for (const [relativePath, content] of Object.entries(fileMap)) {
    const absolutePath = resolveTaskFile(rootDir, taskId, relativePath);
    if (!await fileExists(absolutePath)) {
      await writeText(absolutePath, content);
    }
  }
}

export async function readRuntimeControl({ rootDir, taskId }) {
  await ensureRuntimeFiles({ rootDir, taskId });
  return JSON.parse(await readText(runtimeControlPath(rootDir, taskId)));
}

export async function writeRuntimeControl({ rootDir, taskId, control }) {
  await writeText(runtimeControlPath(rootDir, taskId), `${JSON.stringify(control, null, 2)}\n`);
}

export async function updateRuntimeControl({ rootDir, taskId, mutate }) {
  const current = await readRuntimeControl({ rootDir, taskId });
  const next = clone(current);
  await mutate(next, current);
  next.updated_at = nowIso();
  await writeRuntimeControl({ rootDir, taskId, control: next });
  return next;
}

export async function readTaskEvents({ rootDir, taskId, limit } = {}) {
  await ensureRuntimeFiles({ rootDir, taskId });
  const raw = await readText(runtimeEventsPath(rootDir, taskId));
  const events = raw
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(line => JSON.parse(line));

  if (typeof limit === 'number') {
    return events.slice(-limit);
  }
  return events;
}

export async function appendTaskEvent({ rootDir, taskId, type, actor, summary, detail = {}, state = null, department = null, stage = null }) {
  if (!EVENT_TYPES.includes(type)) {
    throw new Error(`Unknown runtime event type: ${type}`);
  }

  await ensureRuntimeFiles({ rootDir, taskId });
  const control = await readRuntimeControl({ rootDir, taskId });
  const event = {
    id: control.last_event_id + 1,
    ts: nowIso(),
    task_id: taskId,
    type,
    actor,
    summary,
    detail,
    state,
    department,
    stage
  };

  const eventsPath = runtimeEventsPath(rootDir, taskId);
  const current = await readText(eventsPath);
  const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  await writeText(eventsPath, `${current}${prefix}${JSON.stringify(event)}\n`);

  control.last_event_id = event.id;
  control.last_event_at = event.ts;
  control.updated_at = event.ts;
  await writeRuntimeControl({ rootDir, taskId, control });
  return event;
}

export function isLeaseActive(control, now = Date.now()) {
  if (!isObject(control?.lease) || typeof control.lease.expires_at !== 'string') {
    return false;
  }
  const expiresAt = Date.parse(control.lease.expires_at);
  return !Number.isNaN(expiresAt) && expiresAt > now;
}

export function makeLease({ owner, leaseMs }) {
  const acquiredAt = nowIso();
  return {
    owner,
    token: `${owner}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    acquired_at: acquiredAt,
    heartbeat_at: acquiredAt,
    expires_at: new Date(Date.now() + leaseMs).toISOString()
  };
}

export async function listTaskIds(rootDir) {
  try {
    const entries = await readdir(join(rootDir, 'tasks'), { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => basename(entry.name));
  } catch {
    return [];
  }
}
