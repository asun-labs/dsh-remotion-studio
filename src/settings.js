/**
 * Persistent settings for remotion-studio.
 *
 * Non-secret settings live in `~/.dsh/remotion-studio/settings.json`.
 * Provider API keys are handed to the credential service when it is
 * available (a record per provider, kind `api-key`); otherwise they fall back
 * to a `_secrets` map inside the settings file so the feature still works on
 * hosts without that service.
 *
 * The file is owned by this plugin only — the profile patch is never rewritten.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve as pathResolve } from 'node:path';

export const SETTINGS_DIR = join(homedir(), '.dsh', 'remotion-studio');
export const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');
export const PROVIDERS = ['tts', 'image'];

/** Default settings; the profile entry `config` is layered on top of these. */
export const DEFAULTS = {
  /** Where generated Remotion projects live. `~` is expanded. */
  projectsDir: '~/.dsh-remotion/projects',
  /** Output folder for renders/stills, relative to the project or absolute. */
  outDir: 'out',
  /** `remotion render` defaults. */
  defaultCodec: 'h264',
  /** Extra CLI flags appended to every render, e.g. "--crf=18". */
  extraRenderFlags: '',
  /** 0 = let Remotion decide (os.cpus().length / 2). */
  concurrency: 0,
  /** `download` = Remotion-managed headless browser; `path` = use chromePath. */
  chromeMode: 'download',
  chromePath: '',
  /** Registry used by `npm install` when scaffolding a project ('' = inherit npm). */
  npmRegistry: 'https://registry.npmjs.org/',
  /** Hard timeout for one CLI call (render can legitimately take long). */
  timeoutMs: 3600000,
  /** Open the Studio page in the default browser as soon as a new instance is ready. */
  autoOpenStudio: true,
  /** Texture for `remotion new` style scaffolds (informational only). */
  remotionVersion: '4.0.546',
  providers: {
    tts: {
      baseURL: '',
      path: '/audio/speech',
      model: '',
      voice: '',
      format: 'mp3',
      /** Extra JSON merged into the request body (provider-specific knobs). */
      extraBody: '',
    },
    image: {
      baseURL: '',
      path: '/images/generations',
      model: '',
      size: '1024x1024',
      extraBody: '',
    },
  },
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isPlainObject(override)) return override === undefined ? base : override;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}

export function expandHome(p) {
  if (typeof p !== 'string' || p.length === 0) return p;
  if (p === '~') return homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2));
  return pathResolve(p);
}

function sameOrigin(urlA, urlB) {
  try {
    return new URL(urlA).origin === new URL(urlB).origin;
  } catch {
    return false;
  }
}

/** Create the settings store bound to one plugin fiber. */
export function createStore({ config, credentials, logger } = {}) {
  let cache;
  let cachedSecrets = {};
  let activeFile = SETTINGS_FILE;

  /**
   * Make sure the settings directory exists. If the home directory is not
   * writable (read-only sandbox, roaming profile oddities) fall back to a
   * directory next to the host's working directory instead of failing.
   */
  function filePath() {
    try {
      mkdirSync(dirname(activeFile), { recursive: true });
    } catch (error) {
      const fallbackDir = join(process.cwd(), '.dsh-remotion-studio');
      const fallbackFile = join(fallbackDir, 'settings.json');
      if (activeFile !== fallbackFile) {
        logger?.warn?.(
          `[remotion-studio] ${SETTINGS_DIR} 不可写（${String(error?.message ?? error)}），改用 ${fallbackDir}`,
        );
        mkdirSync(fallbackDir, { recursive: true });
        activeFile = fallbackFile;
      }
    }
    return activeFile;
  }

  function readFile() {
    try {
      const file = activeFile;
      if (!existsSync(file)) return {};
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      return isPlainObject(parsed) ? parsed : {};
    } catch (error) {
      logger?.warn?.(`[remotion-studio] settings unreadable: ${String(error?.message ?? error)}`);
      return {};
    }
  }

  function load() {
    if (cache) return cache;
    const fromFile = readFile();
    cachedSecrets = isPlainObject(fromFile._secrets) ? fromFile._secrets : {};
    delete fromFile._secrets;
    const merged = deepMerge(deepMerge(DEFAULTS, config ?? {}), fromFile);
    merged.projectsDir = String(merged.projectsDir ?? DEFAULTS.projectsDir);
    merged.projectsDirAbs = expandHome(merged.projectsDir);
    cache = merged;
    return cache;
  }

  function save(next) {
    const merged = deepMerge(load(), next ?? {});
    const toWrite = deepMerge({}, merged);
    delete toWrite.projectsDirAbs;
    if (Object.keys(cachedSecrets).length > 0) toWrite._secrets = cachedSecrets;
    writeFileSync(filePath(), JSON.stringify(toWrite, null, 2), 'utf8');
    cache = undefined;
    return load();
  }

  function reset() {
    try {
      if (existsSync(activeFile)) writeFileSync(activeFile, '{}\n', 'utf8');
    } catch (error) {
      logger?.warn?.(`[remotion-studio] reset failed: ${String(error?.message ?? error)}`);
    }
    cachedSecrets = {};
    cache = undefined;
    return load();
  }

  function providerConfig(provider) {
    const settings = load();
    const cfg = settings.providers?.[provider] ?? {};
    return { ...cfg, baseURL: typeof cfg.baseURL === 'string' ? cfg.baseURL : '' };
  }

  // ── secrets ────────────────────────────────────────────────────────────────
  const recordKey = (provider) => `remotion-studio.${provider}`;

  async function readSecret(provider) {
    if (credentials) {
      try {
        const record = await credentials.readRecord(recordKey(provider));
        if (record && record.kind === 'api-key' && typeof record.key === 'string' && record.key.length > 0) {
          return record.key;
        }
      } catch (error) {
        logger?.warn?.(`[remotion-studio] credential read failed: ${String(error?.message ?? error)}`);
      }
    }
    const fallback = cachedSecrets?.[provider];
    return typeof fallback === 'string' && fallback.length > 0 ? fallback : '';
  }

  async function setSecret(provider, value) {
    const trimmed = String(value ?? '').trim();
    if (trimmed === '') return clearSecret(provider);
    if (credentials) {
      await credentials.modifyRecord(recordKey(provider), async () => ({ kind: 'api-key', key: trimmed }));
      return;
    }
    cachedSecrets = { ...(cachedSecrets ?? {}), [provider]: trimmed };
    const current = readFile();
    current._secrets = cachedSecrets;
    writeFileSync(filePath(), JSON.stringify(current, null, 2), 'utf8');
  }

  async function clearSecret(provider) {
    if (credentials) {
      try {
        await credentials.deleteRecord(recordKey(provider));
      } catch (error) {
        logger?.warn?.(`[remotion-studio] credential delete failed: ${String(error?.message ?? error)}`);
      }
    }
    if (cachedSecrets && cachedSecrets[provider] !== undefined) {
      const nextSecrets = { ...cachedSecrets };
      delete nextSecrets[provider];
      cachedSecrets = nextSecrets;
      const current = readFile();
      if (nextSecrets && Object.keys(nextSecrets).length > 0) current._secrets = nextSecrets;
      else delete current._secrets;
      writeFileSync(filePath(), JSON.stringify(current, null, 2), 'utf8');
      cache = undefined;
    }
  }

  async function secretState(provider) {
    const value = await readSecret(provider);
    return { configured: value.length > 0, length: value.length };
  }

  /** Settings with secrets stripped — the only shape the Web UI receives. */
  async function publicState() {
    const settings = load();
    const providers = {};
    for (const provider of PROVIDERS) {
      const { ...rest } = providerConfig(provider);
      providers[provider] = { ...rest, apiKeyConfigured: (await secretState(provider)).configured };
    }
    return {
      settings: {
        projectsDir: settings.projectsDir,
        projectsDirAbs: settings.projectsDirAbs,
        outDir: settings.outDir,
        defaultCodec: settings.defaultCodec,
        extraRenderFlags: settings.extraRenderFlags,
        concurrency: settings.concurrency,
        chromeMode: settings.chromeMode,
        chromePath: settings.chromePath,
        npmRegistry: settings.npmRegistry,
        timeoutMs: settings.timeoutMs,
        autoOpenStudio: settings.autoOpenStudio !== false,
        remotionVersion: settings.remotionVersion,
        providers,
      },
      paths: { settingsFile: activeFile, projectsDirAbs: settings.projectsDirAbs },
      runtime: runtimeInfo(),
    };
  }

  return {
    load,
    save,
    reset,
    providerConfig,
    readSecret,
    setSecret,
    clearSecret,
    secretState,
    publicState,
    get file() {
      return activeFile;
    },
  };
}

/** Cheap runtime facts for the settings page header. */
export function runtimeInfo() {
  return {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    cwd: process.cwd(),
    execPath: process.execPath,
  };
}

export { sameOrigin };