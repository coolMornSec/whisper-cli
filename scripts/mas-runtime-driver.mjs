import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const RUNTIME_DRIVERS = ['internal', 'command', 'module'];
export const DEFAULT_RUNTIME_DRIVER = 'internal';
const DEFAULT_DRIVER_TIMEOUT_MS = 60_000;

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
      buffer += chunk;
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(buffer));
  });
}

function validateJsonResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Driver result must be a JSON object');
  }
}

export async function invokeCommandDriver({ rootDir, command, payload, timeoutMs = DEFAULT_DRIVER_TIMEOUT_MS }) {
  if (!command || typeof command !== 'string') {
    throw new Error('command driver requires a non-empty command string');
  }

  const child = spawn(command, {
    cwd: rootDir,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const stdoutPromise = collectStream(child.stdout);
  const stderrPromise = collectStream(child.stderr);

  child.stdin.write(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  child.stdin.end();

  const exitCode = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Driver command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', code => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });

  const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
  if (exitCode !== 0) {
    throw new Error(`Driver command failed with exit code ${exitCode}: ${stderr.trim() || stdout.trim() || 'no output'}`);
  }

  let result;
  try {
    result = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Driver command must write JSON to stdout: ${error.message}`);
  }

  validateJsonResult(result);
  return result;
}

export async function invokeModuleDriver({ modulePath, payload }) {
  if (!modulePath || typeof modulePath !== 'string') {
    throw new Error('module driver requires a non-empty module path');
  }

  const loaded = await import(pathToFileURL(modulePath).href);
  const runDriver = loaded.runDriver ?? loaded.default;
  if (typeof runDriver !== 'function') {
    throw new Error('module driver must export a default function or named runDriver function');
  }

  const result = await runDriver(payload);
  validateJsonResult(result);
  return result;
}

export function normalizeDriver(driver) {
  const resolved = driver ?? DEFAULT_RUNTIME_DRIVER;
  if (!RUNTIME_DRIVERS.includes(resolved)) {
    throw new Error(`Unknown runtime driver: ${resolved}`);
  }
  return resolved;
}
