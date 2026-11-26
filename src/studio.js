/**
 * Remotion Studio process registry.
 *
 * One `remotion studio` per project, shared by the agent tool (`remotion_studio`)
 * and the creator panel in the Harness UI, so opening the panel reuses an
 * already-warm server instead of booting a second webpack build.
 *
 * Nothing here touches Remotion's source: we only run the CLI that the project's
 * own `node_modules/@remotion/cli` already ships.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { providerEnv, writeProvidersFile } from './runner.js';

/** dir -> { port, url, pid, startedAt } */
const studios = new Map();

const DEFAULT_PORT = 3111;

/** Resolve the CLI entry script inside a project's own node_modules. */
export function cliScriptOf(dir) {
  const manifestPath = join(dir, 'node_modules', '@remotion', 'cli', 'package.json');
  if (!existsSync(manifestPath)) {
    throw new Error('项目还没安装依赖：先运行 remotion_project_install（或 npm install）');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const bin = typeof manifest.bin === 'string' ? manifest.bin : Object.values(manifest.bin ?? {})[0];
  if (!bin) throw new Error('这个 @remotion/cli 版本没有声明 bin 入口');
  return join(dir, 'node_modules', '@remotion', 'cli', bin);
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function pickPort(preferred) {
  const start = Number(preferred) || DEFAULT_PORT;
  for (let port = start; port < start + 40; port += 1) {
    if (await portFree(port)) return port;
  }
  throw new Error(`端口 ${start} 附近没有可用端口`);
}

async function reachable(url, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok || response.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** True when the given Studio URL currently answers. */
export async function studioReady(url) {
  if (!url) return false;
  return reachable(url);
}

/** Wait until the dev server answers, or give up. */
export async function waitUntilReady(url, { timeoutMs = 90000, intervalMs = 600 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await reachable(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/** Live entry for a project directory, if it was started by this plugin. */
export function studioFor(dir) {
  return studios.get(dir);
}

export function listStudios() {
  return [...studios.entries()].map(([dir, info]) => ({ dir, ...info }));
}

/** Open a URL in the user's default browser. Best effort: never throws. */
export function openInBrowser(url) {
  if (!url) return false;
  try {
    const detached = { detached: true, stdio: 'ignore', windowsHide: true };
    if (process.platform === 'win32') {
      // The empty argument is the window title `start` insists on.
      spawn('cmd', ['/c', 'start', '', url], detached).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], detached).unref();
    } else {
      spawn('xdg-open', [url], detached).unref();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Start (or reuse) the Studio for one project.
 * @returns {Promise<{url:string, port:number, pid:number, started:boolean, autoOpen:boolean}>}
 */
export async function startStudio({ dir, settings, secrets, port }) {
  const requested = Number(port) || DEFAULT_PORT;
  const cached = studios.get(dir);
  if (cached && cached.port === requested) {
    const alive = await reachable(cached.url);
    if (alive) return { url: cached.url, port: cached.port, pid: cached.pid, started: false, autoOpen: false };
    studios.delete(dir);
  }
  const cliScript = cliScriptOf(dir);
  const chosen = await pickPort(requested);
  writeProvidersFile(dir, settings, secrets);
  const child = spawn(process.execPath, [cliScript, 'studio', 'src/index.ts', `--port=${chosen}`], {
    cwd: dir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...providerEnv(settings, secrets) },
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.unref();
  const url = `http://localhost:${chosen}`;
  const info = { port: chosen, url, pid: child.pid, startedAt: Date.now() };
  studios.set(dir, info);
  // The page only answers once webpack finished its first build, so open the
  // browser after it is actually reachable instead of on a blank error page.
  const autoOpen = settings?.autoOpenStudio !== false;
  if (autoOpen) {
    void waitUntilReady(url, { timeoutMs: 180000 }).then((ok) => {
      if (ok) openInBrowser(url);
    });
  }
  return { url, port: chosen, pid: child.pid, started: true, autoOpen };
}

/** Stop the Studio process belonging to one project. */
export function stopStudio(dir) {
  const info = studios.get(dir);
  if (!info) return false;
  studios.delete(dir);
  killTree(info.pid);
  return true;
}

export function stopAllStudios() {
  for (const info of studios.values()) killTree(info.pid);
  studios.clear();
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    /* already gone */
  }
}