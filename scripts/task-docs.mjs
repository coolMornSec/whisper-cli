import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditTaskWorkspace } from './mas-audit.mjs';
import { transitionTaskState } from './mas-controller.mjs';
import { renderSupportFiles } from './mas-support.mjs';
import { renderTaskFiles } from './mas-task-files.mjs';
import { toPosix } from './mas-utils.mjs';
import { validateTaskWorkspace } from './mas-validators.mjs';

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeManagedFile(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  if (await fileExists(filePath)) {
    return false;
  }
  await writeFile(filePath, content, 'utf8');
  return true;
}

async function writeFileMap(rootDir, fileMap) {
  const created = [];
  const skipped = [];

  for (const [relativePath, content] of Object.entries(fileMap)) {
    const targetPath = join(rootDir, ...relativePath.split('/'));
    if (await writeManagedFile(targetPath, content)) {
      created.push(relativePath);
    } else {
      skipped.push(relativePath);
    }
  }

  return { created, skipped };
}

export async function scaffoldTaskWorkspace({
  rootDir,
  taskId,
  title = 'Whisper CLI AI Workflow',
  goal = 'Implement a reusable MAS V1 workflow workspace for reliable AI delivery'
}) {
  if (!taskId) {
    throw new Error('taskId is required');
  }

  const supportResult = await writeFileMap(rootDir, renderSupportFiles());
  const taskFileMap = Object.fromEntries(
    Object.entries(renderTaskFiles(taskId, title, goal)).map(([relativePath, content]) => [
      toPosix(join('tasks', taskId, relativePath)),
      content
    ])
  );
  const taskResult = await writeFileMap(rootDir, taskFileMap);

  return {
    taskId,
    created: [...supportResult.created, ...taskResult.created],
    skipped: [...supportResult.skipped, ...taskResult.skipped]
  };
}

export { auditTaskWorkspace, transitionTaskState, validateTaskWorkspace };
export const scaffoldTaskSet = scaffoldTaskWorkspace;
export const validateTaskSet = validateTaskWorkspace;
export const transitionTaskSet = transitionTaskState;
export const auditTaskSet = auditTaskWorkspace;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--task-id') {
      options.taskId = rest[index + 1];
      index += 1;
    } else if (rest[index] === '--title') {
      options.title = rest[index + 1];
      index += 1;
    } else if (rest[index] === '--goal') {
      options.goal = rest[index + 1];
      index += 1;
    } else if (rest[index] === '--to') {
      options.toState = rest[index + 1];
      index += 1;
    }
  }

  return { command, options };
}

async function listTaskIds(rootDir) {
  try {
    const entries = await readdir(join(rootDir, 'tasks'), { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => basename(entry.name));
  } catch {
    return [];
  }
}

async function runCli() {
  const rootDir = process.cwd();
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || !['scaffold', 'validate', 'transition', 'audit'].includes(command)) {
    console.error(
      'Usage: node scripts/task-docs.mjs <scaffold|validate|transition|audit> --task-id <task-id> [--title <title>] [--goal <goal>] [--to <state>]'
    );
    process.exitCode = 1;
    return;
  }

  if (command === 'scaffold') {
    if (!options.taskId) {
      console.error('scaffold requires --task-id');
      process.exitCode = 1;
      return;
    }

    const result = await scaffoldTaskWorkspace({
      rootDir,
      taskId: options.taskId,
      title: options.title,
      goal: options.goal
    });
    console.log(JSON.stringify({ status: 'scaffolded', ...result }, null, 2));
    return;
  }

  if (command === 'transition') {
    if (!options.taskId || !options.toState) {
      console.error('transition requires --task-id and --to');
      process.exitCode = 1;
      return;
    }

    const result = await transitionTaskState({
      rootDir,
      taskId: options.taskId,
      toState: options.toState
    });
    console.log(JSON.stringify({ status: 'transitioned', state: result }, null, 2));
    return;
  }

  if (command === 'audit') {
    if (!options.taskId) {
      console.error('audit requires --task-id');
      process.exitCode = 1;
      return;
    }

    const result = await auditTaskWorkspace({
      rootDir,
      taskId: options.taskId
    });
    console.log(JSON.stringify({ status: 'audited', report: result }, null, 2));
    return;
  }

  const taskIds = options.taskId ? [options.taskId] : await listTaskIds(rootDir);
  if (taskIds.length === 0) {
    console.error('No task workspace found. Run scaffold first or provide --task-id.');
    process.exitCode = 1;
    return;
  }

  const reports = [];
  for (const taskId of taskIds) {
    reports.push(await validateTaskWorkspace({ rootDir, taskId }));
  }

  const valid = reports.every(report => report.valid);
  console.log(JSON.stringify({ valid, reports }, null, 2));
  if (!valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await runCli();
}
