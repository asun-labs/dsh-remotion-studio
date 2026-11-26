/**
 * HTTP API behind the settings page.
 *
 * The client half of this plugin is a React component running in the Harness
 * Web UI, so it talks to the Host over one same-origin JSON endpoint rather
 * than bundling its own transport. Only settings/secret/provider actions live
 * here — no Remotion work is triggered from the UI.
 */
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BRIDGE_PATH, isBridgeToken, isLocalOrigin } from './bridge.js';
import { generateImage, synthesizeSpeech, PROTOCOL_LABEL } from './providers.js';
import { doctor, listProjects, projectPath } from './runner.js';
import { sameOrigin } from './settings.js';
import { startStudio, studioFor, studioReady, stopStudio, waitUntilReady } from './studio.js';

export const API_PATH = '/dsh-remotion/api';

const MAX_BODY = 1024 * 1024;

function send(res, status, payload) {
  const body = JSON.stringify(payload ?? {});
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('请求体必须是 JSON 对象');
  return parsed;
}

/** Normalize `~`-relative and relative project references for the UI. */
function projectDir(settings, name) {
  if (!name) return undefined;
  const dir = projectPath(settings, name);
  return dir;
}

/** Human readable size; keeps sub-kilobyte results honest (8x8 test icons). */
function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function testProvider(provider, { store, logger }) {
  const config = store.providerConfig(provider);
  const apiKey = await store.readSecret(provider);
  if (!config.baseURL) throw new Error(`还没有填写${provider === 'tts' ? ' TTS ' : '生图'}服务地址 baseURL`);
  const started = Date.now();
  const suffix = (result) =>
    result.protocol ? `，协议 ${PROTOCOL_LABEL[result.protocol] ?? result.protocol}` : '';
  if (provider === 'tts') {
    const outFile = join(tmpdir(), `dsh-remotion-tts-${Date.now()}.${config.format || 'mp3'}`);
    try {
      const result = await synthesizeSpeech({
        provider: config,
        apiKey,
        text: '你好，这是一次模型服务连通性测试。',
        outFile,
      });
      return {
        ok: true,
        detail: `合成成功：${formatBytes(result.bytes)}，用时 ${Date.now() - started} ms${suffix(result)}`,
      };
    } finally {
      try {
        unlinkSync(outFile);
      } catch {
        /* ignore */
      }
    }
  }
  const outFile = join(tmpdir(), `dsh-remotion-image-${Date.now()}.png`);
  try {
    const result = await generateImage({
      provider: config,
      apiKey,
      prompt: 'a simple red circle on a white background, flat icon',
      outFile,
      size: '512x512',
    });
    let preview;
    try {
      const bytes = readFileSync(result.path ?? outFile);
      if (bytes.length < 1_500_000) {
        const mime = /^jpg$/i.test(String(result.path ?? '').split('.').pop()) ? 'image/jpeg' : 'image/png';
        preview = `data:${mime};base64,${bytes.toString('base64')}`;
      }
    } catch (error) {
      logger?.warn?.(`[remotion-studio] preview read failed: ${String(error?.message ?? error)}`);
    }
    return {
      ok: true,
      detail: `生成成功：${formatBytes(result.bytes)}，用时 ${Date.now() - started} ms${suffix(result)}`,
      preview,
    };
  } finally {
    try {
      unlinkSync(outFile);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Register the settings endpoint.
 * @returns {() => void} disposer (also collected by the caller's ctx.effect)
 */
export function registerApi(ctx, { store, logger }) {
  const handler = async (req, res) => {
    if (req.method !== 'POST') {
      send(res, 405, { ok: false, error: '只支持 POST' });
      return;
    }
    const host = req.headers.host;
    const origin = req.headers.origin;
    if (origin && host && !sameOrigin(`http://${host}`, origin)) {
      send(res, 403, { ok: false, error: '来源不被允许' });
      return;
    }
    let payload;
    try {
      payload = await readJson(req);
    } catch (error) {
      send(res, 400, { ok: false, error: String(error?.message ?? error) });
      return;
    }
    try {
      switch (payload.action) {
        case 'getState': {
          const state = await store.publicState();
          const settings = store.load();
          send(res, 200, {
            ok: true,
            ...state,
            projects: listProjects(settings),
            defaults: { remotionVersion: settings.remotionVersion },
          });
          return;
        }
        case 'saveSettings': {
          const patch = payload.patch ?? {};
          if (typeof patch !== 'object' || Array.isArray(patch)) throw new Error('patch 必须是对象');
          store.save(patch);
          send(res, 200, { ok: true, ...(await store.publicState()) });
          return;
        }
        case 'setSecret': {
          await store.setSecret(String(payload.provider), payload.value);
          send(res, 200, { ok: true, ...(await store.publicState()) });
          return;
        }
        case 'clearSecret': {
          await store.clearSecret(String(payload.provider));
          send(res, 200, { ok: true, ...(await store.publicState()) });
          return;
        }
        case 'reset': {
          store.reset();
          send(res, 200, { ok: true, ...(await store.publicState()) });
          return;
        }
        case 'testProvider': {
          const result = await testProvider(String(payload.provider), { store, logger });
          send(res, 200, result);
          return;
        }
        case 'doctor': {
          const settings = store.load();
          const dir = projectDir(settings, payload.project);
          const secrets = { tts: await store.readSecret('tts'), image: await store.readSecret('image') };
          const checks = await doctor({ settings, projectDir: dir, secrets });
          send(res, 200, { ok: checks.every((check) => check.ok), checks });
          return;
        }
        case 'openProjectsDir': {
          const state = await store.publicState();
          send(res, 200, { ok: true, path: state.paths.projectsDirAbs, file: state.paths.settingsFile });
          return;
        }
        case 'studioStart': {
          const settings = store.load();
          const dir = projectDir(settings, payload.project);
          if (!dir) throw new Error('先选择一个项目');
          const secrets = { tts: await store.readSecret('tts'), image: await store.readSecret('image') };
          const result = await startStudio({ dir, settings, secrets, port: payload.port });
          const ready = await waitUntilReady(result.url, { timeoutMs: 120000 });
          send(res, 200, { ok: true, url: result.url, port: result.port, started: result.started, ready, autoOpen: Boolean(result.autoOpen) });
          return;
        }
        case 'studioStatus': {
          const settings = store.load();
          const dir = projectDir(settings, payload.project);
          const info = dir ? studioFor(dir) : undefined;
          const ready = info ? await studioReady(info.url) : false;
          send(res, 200, { ok: true, running: Boolean(info), url: info?.url, port: info?.port, ready });
          return;
        }
        case 'studioStop': {
          const settings = store.load();
          const dir = projectDir(settings, payload.project);
          const stopped = dir ? stopStudio(dir) : false;
          send(res, 200, { ok: true, stopped });
          return;
        }
        default:
          send(res, 400, { ok: false, error: `未知操作：${String(payload.action)}` });
      }
    } catch (error) {
      logger?.warn?.(`[remotion-studio] api ${String(payload?.action)} failed: ${String(error?.message ?? error)}`);
      send(res, 200, { ok: false, error: String(error?.message ?? error) });
    }
  };

  return ctx.webServer.register({ kind: 'exact', path: API_PATH, handler });
}

/* ── provider bridge ──────────────────────────────────────────────────────── */

function sendCors(req, res, status, payload) {
  const origin = req.headers.origin;
  const body = JSON.stringify(payload ?? {});
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    ...(origin && isLocalOrigin(origin)
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': 'content-type, x-dsh-token',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-max-age': '600',
        }
      : {}),
  });
  res.end(body);
}

/**
 * Let composition code in Remotion's browser call the configured providers.
 * Allow-list: localhost origins only + a per-process bearer token that is
 * written into the project's public/ folder before each run.
 */
export function registerBridge(ctx, { store, logger }) {
  const handler = async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !isLocalOrigin(origin)) {
      sendCors(req, res, 403, { ok: false, error: '来源不被允许' });
      return;
    }
    if (req.method === 'OPTIONS') {
      sendCors(req, res, 204, {});
      return;
    }
    if (req.method !== 'POST') {
      sendCors(req, res, 405, { ok: false, error: '只支持 POST' });
      return;
    }
    if (!isBridgeToken(req.headers['x-dsh-token'])) {
      sendCors(req, res, 403, { ok: false, error: 'bridge token 无效，请重新渲染' });
      return;
    }
    let payload;
    try {
      payload = await readJson(req);
    } catch (error) {
      sendCors(req, res, 400, { ok: false, error: String(error?.message ?? error) });
      return;
    }
    try {
      if (payload.action === 'tts') {
        const config = store.providerConfig('tts');
        if (!config.baseURL) throw new Error('未配置 TTS 服务商');
        const apiKey = await store.readSecret('tts');
        const format = String(payload.format || config.format || 'mp3');
        const outFile = join(tmpdir(), `dsh-remotion-bridge-tts-${Date.now()}.${format}`);
        try {
          const result = await synthesizeSpeech({
            provider: config,
            apiKey,
            text: String(payload.text ?? ''),
            outFile,
            voice: payload.voice ? String(payload.voice) : undefined,
            model: payload.model ? String(payload.model) : undefined,
            format,
          });
          const base64 = readFileSync(outFile).toString('base64');
          sendCors(req, res, 200, {
            ok: true,
            mime: `audio/${format === 'mp3' ? 'mpeg' : format}`,
            base64,
            bytes: result.bytes,
          });
        } finally {
          try {
            unlinkSync(outFile);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      if (payload.action === 'image') {
        const config = store.providerConfig('image');
        if (!config.baseURL) throw new Error('未配置生图服务商');
        const apiKey = await store.readSecret('image');
        const outFile = join(tmpdir(), `dsh-remotion-bridge-image-${Date.now()}.png`);
        try {
          const result = await generateImage({
            provider: config,
            apiKey,
            prompt: String(payload.prompt ?? ''),
            outFile,
            size: payload.size ? String(payload.size) : undefined,
            model: payload.model ? String(payload.model) : undefined,
          });
          const base64 = readFileSync(outFile).toString('base64');
          sendCors(req, res, 200, { ok: true, mime: 'image/png', base64, bytes: result.bytes });
        } finally {
          try {
            unlinkSync(outFile);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      sendCors(req, res, 400, { ok: false, error: `未知 bridge 操作：${String(payload.action)}` });
    } catch (error) {
      logger?.warn?.(`[remotion-studio] bridge ${String(payload?.action)} failed: ${String(error?.message ?? error)}`);
      sendCors(req, res, 200, { ok: false, error: String(error?.message ?? error) });
    }
  };

  return ctx.webServer.register({ kind: 'exact', path: BRIDGE_PATH, handler });
}