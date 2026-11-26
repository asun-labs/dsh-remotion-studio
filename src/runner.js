/**
 * Process runner + Remotion CLI bridge.
 *
 * Remotion's own code is never modified or re-implemented here: every media
 * operation shells out to the official `@remotion/cli` that lives inside the
 * user's project (`node_modules/@remotion/cli`), exactly as `npx remotion …`
 * would. This module only locates that binary and runs it with a sane
 * environment, so Remotion stays fully capable and upgradeable by the user.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as pathResolve, isAbsolute } from 'node:path';
import { bridgeInfo } from './bridge.js';

/** Resolve the `bin` entry path of an installed package inside a project. */
function resolvePackageBin(projectDir, packageName) {
  const pkgDir = join(projectDir, 'node_modules', ...packageName.split('/'));
  const manifestPath = join(pkgDir, 'package.json');
  if (!existsSync(manifestPath)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const bin = manifest.bin;
    const rel = typeof bin === 'string' ? bin : bin && typeof bin === 'object' ? Object.values(bin)[0] : undefined;
    if (!rel) return undefined;
    const abs = join(pkgDir, rel);
    return existsSync(abs) ? abs : undefined;
  } catch {
    return undefined;
  }
}

/** Locate the `npm` CLI script that ships with the running Node. */
function npmCliPath() {
  const nodeDir = dirname(process.execPath);
  const candidates = [
    join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * Command that reports the npm version: the CLI bundled with the running Node
 * when present, otherwise whatever `npm` the PATH resolves (that is what
 * runNpm falls back to, so the doctor should probe the same thing).
 */
function npmProbe() {
  const cli = npmCliPath();
  if (cli) return { file: process.execPath, args: [cli, '--version'] };
  if (process.platform === 'win32') {
    return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm --version'] };
  }
  return { file: 'npm', args: ['--version'] };
}

/**
 * Run one child process to completion.
 * @param {{file:string, args:string[], cwd?:string, env?:Record<string,string>, timeoutMs?:number, onStdout?:(chunk:string)=>void}} options
 * @returns {Promise<{code:number|null, stdout:string, stderr:string, timedOut:boolean, command:string}>}
 */
export function runProcess({ file, args = [], cwd, env, timeoutMs = 600000, onStdout }) {
  const command = [file, ...args].join(' ');
  return new Promise((resolvePromise) => {
    let child;
    try {
      child = spawn(file, args, {
        cwd,
        // The host may itself be an Electron binary; children must run as plain
        // Node. DSH sets this variable too, but we never rely on inheritance.
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...(env ?? {}) },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolvePromise({ code: -1, stdout: '', stderr: String(error?.message ?? error), timedOut: false, command });
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        /* ignore */
      }
    }, Math.max(1000, Number(timeoutMs) || 600000));

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > 400000) stdout = stdout.slice(-200000);
      onStdout?.(String(chunk));
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > 400000) stderr = stderr.slice(-200000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolvePromise({ code: -1, stdout, stderr: `${stderr}\n${String(error?.message ?? error)}`, timedOut, command });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr, timedOut, command });
    });
  });
}

/** Environment that hands the configured model providers to composition code. */
export function providerEnv(settings, secrets) {
  const env = { DSH_REMOTION_STUDIO: '1' };
  const tts = settings.providers?.tts ?? {};
  if (tts.baseURL) {
    env.DSH_TTS_BASE_URL = String(tts.baseURL);
    env.DSH_TTS_PROTOCOL = String(tts.protocol || 'auto');
    env.DSH_TTS_PATH = String(tts.path ?? '');
    env.DSH_TTS_MODEL = String(tts.model ?? '');
    env.DSH_TTS_VOICE = String(tts.voice ?? '');
    env.DSH_TTS_FORMAT = String(tts.format ?? 'mp3');
    if (tts.extraBody) env.DSH_TTS_EXTRA_BODY = String(tts.extraBody);
    if (secrets?.tts) env.DSH_TTS_API_KEY = secrets.tts;
  }
  const image = settings.providers?.image ?? {};
  if (image.baseURL) {
    env.DSH_IMAGE_BASE_URL = String(image.baseURL);
    env.DSH_IMAGE_PROTOCOL = String(image.protocol || 'auto');
    env.DSH_IMAGE_PATH = String(image.path ?? '');
    env.DSH_IMAGE_MODEL = String(image.model ?? '');
    env.DSH_IMAGE_SIZE = String(image.size ?? '1024x1024');
    if (image.extraBody) env.DSH_IMAGE_EXTRA_BODY = String(image.extraBody);
    if (secrets?.image) env.DSH_IMAGE_API_KEY = secrets.image;
  }
  return env;
}

/** Absolute project path for a name, refusing escapes outside projectsDir. */
export function projectPath(settings, name) {
  const root = settings.projectsDirAbs;
  if (!name) return root;
  const cleaned = String(name).replace(/[\\/]+/g, '/');
  if (cleaned.includes('..') || cleaned.startsWith('/')) {
    throw new Error(`项目名不合法：${name}`);
  }
  const abs = pathResolve(root, cleaned);
  if (!abs.startsWith(pathResolve(root))) throw new Error(`项目名不合法：${name}`);
  return abs;
}

/** List projects under projectsDir: folders owning a package.json. */
export function listProjects(settings) {
  const root = settings.projectsDirAbs;
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) continue;
    let version;
    let dependencies = {};
    try {
      const parsed = JSON.parse(readFileSync(manifest, 'utf8'));
      dependencies = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
      version = dependencies.remotion ?? dependencies['@remotion/cli'];
    } catch {
      /* ignore */
    }
    let mtime;
    try {
      mtime = statSync(dir).mtime.toISOString();
    } catch {
      /* ignore */
    }
    out.push({
      name: entry.name,
      path: dir,
      remotion: version ?? null,
      installed: existsSync(join(dir, 'node_modules', '@remotion', 'cli')),
      modifiedAt: mtime,
    });
  }
  return out.sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
}

/** Subcommands exposed through the passthrough tool. */
export const CLI_SUBCOMMANDS = [
  'render',
  'still',
  'studio',
  'bundle',
  'compositions',
  'benchmark',
  'ffmpeg',
  'ffprobe',
  'versions',
  'upgrade',
  'browser',
  'lambda',
  'cloudrun',
  'gpu',
  'record',
  'help',
];

/**
 * Write `public/dsh-providers.json` into a project.
 *
 * Remotion bundles composition code for the browser, so `process.env` values
 * are NOT visible inside a composition. A plain file in `public/` is: the
 * composition fetches it with `staticFile()` (see src/dsh/providers.ts in the
 * scaffold). The file is regenerated before every CLI run, so settings changes
 * take effect immediately without touching the project source.
 */
export function writeProvidersFile(projectDir, settings, secrets) {
  const providerFile = join(projectDir, 'public', 'dsh-providers.json');
  const bridge = bridgeInfo();
  const payload = {
    version: 2,
    generatedBy: 'dsh-remotion-studio',
    ...(bridge.url ? { bridge: { url: bridge.url, token: bridge.token } } : {}),
  };
  const tts = settings.providers?.tts ?? {};
  if (tts.baseURL) {
    payload.tts = {
      baseURL: String(tts.baseURL),
      protocol: String(tts.protocol || 'auto'),
      path: String(tts.path || ''),
      model: String(tts.model ?? ''),
      voice: String(tts.voice ?? ''),
      format: String(tts.format || 'mp3'),
      extraBody: parseMaybeJson(tts.extraBody),
      ...(secrets?.tts && !bridge.url ? { apiKey: String(secrets.tts) } : {}),
    };
  }
  const image = settings.providers?.image ?? {};
  if (image.baseURL) {
    payload.image = {
      baseURL: String(image.baseURL),
      protocol: String(image.protocol || 'auto'),
      path: String(image.path || ''),
      model: String(image.model ?? ''),
      size: String(image.size || '1024x1024'),
      extraBody: parseMaybeJson(image.extraBody),
      ...(secrets?.image && !bridge.url ? { apiKey: String(secrets.image) } : {}),
    };
  }
  try {
    mkdirSync(dirname(providerFile), { recursive: true });
    writeFileSync(providerFile, JSON.stringify(payload, null, 2), 'utf8');
    return providerFile;
  } catch (error) {
    // Never block a render because the bridge file could not be written.
    return null;
  }
}

function parseMaybeJson(raw) {
  if (!raw || !String(raw).trim()) return undefined;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Translate the browser settings into the official Remotion flags.
 *
 * `--browser-executable <path>` is documented as "Set a custom Chrome or
 * Chromium executable path" (https://www.remotion.dev/docs/options/browser-executable),
 * so the "use my local Chrome" switch really is a native Remotion option and
 * not a plugin-only toggle. Only rendering subcommands accept it, so other
 * subcommands (`versions`, `compositions`, …) are left untouched, and a flag
 * the caller already passed wins over the setting.
 */
function browserFlags(settings, args) {
  const subcommand = args[0];
  if (subcommand !== 'render' && subcommand !== 'still') return [];
  const executable = String(settings?.chromePath ?? '').trim();
  if (settings?.chromeMode !== 'path' || !executable) return [];
  const already = args.some((arg) => arg === '--browser-executable' || arg.startsWith('--browser-executable='));
  return already ? [] : [`--browser-executable=${executable}`];
}

/**
 * Run the official Remotion CLI inside a project.
 * @param {object} options
 * @param {object} options.settings resolved settings
 * @param {Record<string,string>} options.secrets provider api keys
 * @param {string} options.projectDir absolute project dir
 * @param {string[]} options.args CLI arguments (`['render', 'src/index.ts', ...]`)
 */
export async function runRemotionCli({ settings, secrets, projectDir, args, timeoutMs }) {
  const bin = resolvePackageBin(projectDir, '@remotion/cli');
  if (!bin) {
    throw new Error(
      `项目 ${projectDir} 还没安装 Remotion 依赖。先调用 remotion_project_install（或 remotion_project_create）安装。`,
    );
  }
  writeProvidersFile(projectDir, settings, secrets);
  const result = await runProcess({
    file: process.execPath,
    args: [bin, ...args, ...browserFlags(settings, args)],
    cwd: projectDir,
    env: providerEnv(settings, secrets),
    timeoutMs: timeoutMs ?? settings.timeoutMs,
  });
  return result;
}

/** Run `npm install` (or a given npm argv) inside a directory. */
export async function runNpm({ args, cwd, registry, timeoutMs = 1800000 }) {
  const cli = npmCliPath();
  const env = registry ? { npm_config_registry: registry } : undefined;
  if (cli) {
    return runProcess({ file: process.execPath, args: [cli, ...args], cwd, env, timeoutMs });
  }
  // Fallback: rely on PATH (npm.cmd / npm on POSIX via shell).
  const isWin = process.platform === 'win32';
  const file = isWin ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const finalArgs = isWin ? ['/d', '/s', '/c', `npm ${args.join(' ')}`] : args;
  return runProcess({ file, args: finalArgs, cwd, env, timeoutMs });
}

/** Best-effort environment probe for the settings page. */
export async function doctor({ settings, projectDir, secrets }) {
  const checks = [];
  const push = (name, ok, detail) => checks.push({ name, ok, detail });

  push('node', true, process.version);
  const probe = npmProbe();
  const version = await runProcess({ ...probe, timeoutMs: 30000 });
  const versionText = (version.stdout || version.stderr).trim().split('\n').pop() ?? '';
  push(
    'npm',
    version.code === 0,
    version.code === 0 ? versionText : `npm 不可用（无法自动安装依赖）：${versionText || '未知错误'}`,
  );

  const root = settings.projectsDirAbs;
  push('projectsDir', existsSync(root), existsSync(root) ? root : `尚未创建：${root}`);

  if (projectDir) {
    const bin = resolvePackageBin(projectDir, '@remotion/cli');
    push('remotion-cli', Boolean(bin), bin ?? `未安装于 ${projectDir}`);
    if (bin) {
      const versions = await runRemotionCli({ settings, secrets, projectDir, args: ['versions'], timeoutMs: 120000 });
      const text = `${versions.stdout}\n${versions.stderr}`.trim();
      push('remotion versions', versions.code === 0, text.split('\n').slice(0, 6).join(' | ') || 'no output');
    }
  } else {
    const projects = listProjects(settings);
    push('projects', projects.length > 0, projects.length ? projects.map((p) => p.name).join(', ') : 'projectsDir 里还没有项目');
  }

  if (settings.chromeMode === 'path') {
    push('chrome', Boolean(settings.chromePath) && existsSync(settings.chromePath), settings.chromePath || '未填写 Chrome 路径');
  } else {
    push('chrome', true, '由 Remotion 自动下载 Headless Shell（首次渲染时联网获取）');
  }

  if (!isAbsolute(root)) push('paths', false, `projectsDir 不是绝对路径：${root}`);

  return checks;
}
