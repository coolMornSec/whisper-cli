import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExecutionIntent } from './mas-runtime-intent.mjs';
import { buildTaskBoard } from './mas-runtime.mjs';
import { readTaskEvents } from './mas-runtime-store.mjs';

const DEFAULT_PORT = 4321;
const STATIC_DIR = ['apps', 'personal-website'];
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function sendFile(res, filePath) {
  try {
    const content = await readFile(filePath);
    const mime = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': mime });
    res.end(content);
  } catch {
    json(res, 404, { error: 'File not found' });
  }
}

function safeStaticPath(rootDir, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const staticRoot = resolve(rootDir, ...STATIC_DIR);
  const target = resolve(join(staticRoot, normalize(requested)));
  if (!target.startsWith(staticRoot)) {
    return null;
  }
  return target;
}

export async function buildWebsiteOverview(rootDir) {
  const board = await buildTaskBoard({ rootDir });
  const spotlight = board.find(task => task.task_id === 'personal-website') ?? board[0] ?? null;
  const events = spotlight ? await readTaskEvents({ rootDir, taskId: spotlight.task_id, limit: 8 }) : [];
  const intent = spotlight
    ? await buildExecutionIntent({ rootDir, taskId: spotlight.task_id })
    : {
        stage_goal: '当前没有可展示任务。',
        human_actions: []
      };

  return {
    project: {
      name: 'Personal Website',
      description: 'A real frontend view over the Codex 三省六部 runtime.'
    },
    spotlight,
    board,
    events: events.reverse(),
    intent
  };
}

async function handleApi(rootDir, pathname, searchParams, res) {
if (pathname === '/api/overview') {
    json(res, 200, await buildWebsiteOverview(rootDir));
    return;
  }

  if (pathname === '/api/board') {
    json(res, 200, await buildTaskBoard({ rootDir }));
    return;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/(board|events|intent)$/u);
  if (!taskMatch) {
    json(res, 404, { error: 'Unknown API route' });
    return;
  }

  const [, taskId, resource] = taskMatch;
  if (resource === 'board') {
    const board = await buildTaskBoard({ rootDir, taskId });
    json(res, 200, board[0] ?? null);
    return;
  }
  if (resource === 'events') {
    const limit = Number(searchParams.get('limit') ?? '12');
    json(res, 200, await readTaskEvents({ rootDir, taskId, limit }));
    return;
  }
  if (resource === 'intent') {
    json(res, 200, await buildExecutionIntent({ rootDir, taskId }));
  }
}

export function createPersonalWebsiteServer({ rootDir }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    try {
      if (url.pathname.startsWith('/api/')) {
        await handleApi(rootDir, url.pathname, url.searchParams, res);
        return;
      }

      const filePath = safeStaticPath(rootDir, url.pathname);
      if (!filePath) {
        json(res, 400, { error: 'Invalid file path' });
        return;
      }
      await sendFile(res, filePath);
    } catch (error) {
      json(res, 500, { error: error.message });
    }
  });
}

export async function startPersonalWebsiteServer({ rootDir, port = DEFAULT_PORT, host = '127.0.0.1' } = {}) {
  const server = createPersonalWebsiteServer({ rootDir });
  await new Promise(resolveListen => server.listen(port, host, resolveListen));
  const address = server.address();
  const resolvedPort = typeof address === 'object' && address ? address.port : port;
  return {
    server,
    url: `http://${host}:${resolvedPort}`
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--port') {
      options.port = Number(value);
      index += 1;
    } else if (key === '--host') {
      options.host = value;
      index += 1;
    }
  }
  return options;
}

async function runCli() {
  const rootDir = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const { url } = await startPersonalWebsiteServer({ rootDir, ...options });
  console.log(`Personal Website running at ${url}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli();
}
