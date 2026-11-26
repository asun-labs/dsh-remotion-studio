/**
 * TTS / image generation over OpenAI-compatible HTTP APIs.
 *
 * Every model choice, endpoint, key and voice comes from the settings page,
 * so the plugin itself carries no provider assumptions. The same settings are
 * also exported to composition code as `DSH_TTS_*` / `DSH_IMAGE_*` env vars
 * (see runner.providerEnv), which is how scaffolding helpers inside a Remotion
 * project reach the same providers at render time.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function joinUrl(baseURL, suffix) {
  const base = String(baseURL ?? '').replace(/\/+$/, '');
  const tail = String(suffix ?? '').replace(/^\/+/, '');
  if (!base) throw new Error('服务地址 baseURL 未配置');
  return tail ? `${base}/${tail}` : base;
}

function parseExtraBody(extraBody, label) {
  if (!extraBody || !String(extraBody).trim()) return {};
  try {
    const parsed = JSON.parse(extraBody);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('必须是 JSON 对象');
    }
    return parsed;
  } catch (error) {
    throw new Error(`${label} 的附加参数不是合法 JSON 对象：${String(error?.message ?? error)}`);
  }
}

async function postJson(url, body, apiKey, { timeoutMs = 180000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 800);
      } catch {
        /* ignore */
      }
      throw new Error(`HTTP ${response.status} ${response.statusText} @ ${url}${detail ? `\n${detail}` : ''}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) return { json: await response.json() };
    return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBytes(url, apiKey, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`下载生成结果失败：HTTP ${response.status} @ ${url}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Text-to-speech.
 * @returns {Promise<{path:string, bytes:number, model:string}>}
 */
export async function synthesizeSpeech({ provider, apiKey, text, outFile, voice, format, model, timeoutMs }) {
  if (!String(text ?? '').trim()) throw new Error('TTS 文本为空');
  if (!outFile) throw new Error('TTS 缺少输出文件路径');
  const url = joinUrl(provider.baseURL, provider.path || '/audio/speech');
  const body = {
    input: String(text),
    ...(model ?? provider.model ? { model: String(model ?? provider.model) } : {}),
    ...(voice ?? provider.voice ? { voice: String(voice ?? provider.voice) } : {}),
    ...(format ?? provider.format ? { response_format: String(format ?? provider.format) } : {}),
    ...parseExtraBody(provider.extraBody, 'TTS'),
  };
  const result = await postJson(url, body, apiKey, { timeoutMs });
  let bytes = result.bytes;
  if (!bytes) {
    const maybe = result.json?.audio ?? result.json?.data;
    const b64 = typeof maybe === 'string' ? maybe : undefined;
    if (!b64) {
      throw new Error(`TTS 响应既不是音频二进制也不含 audio 字段：${JSON.stringify(result.json).slice(0, 400)}`);
    }
    bytes = Buffer.from(b64, 'base64');
  }
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, bytes);
  return { path: outFile, bytes: bytes.length, model: String(model ?? provider.model ?? '') };
}

/**
 * Image generation. Accepts `b64_json` or `url` shaped responses.
 * @returns {Promise<{path:string, bytes:number, model:string, revisedPrompt?:string}>}
 */
export async function generateImage({ provider, apiKey, prompt, outFile, size, model, timeoutMs }) {
  if (!String(prompt ?? '').trim()) throw new Error('生图 prompt 为空');
  if (!outFile) throw new Error('生图缺少输出文件路径');
  const url = joinUrl(provider.baseURL, provider.path || '/images/generations');
  const body = {
    prompt: String(prompt),
    n: 1,
    ...(model ?? provider.model ? { model: String(model ?? provider.model) } : {}),
    ...(size ?? provider.size ? { size: String(size ?? provider.size) } : {}),
    ...parseExtraBody(provider.extraBody, '生图'),
  };
  const result = await postJson(url, body, apiKey, { timeoutMs });
  const item = result.json?.data?.[0] ?? result.json?.output?.[0] ?? result.json;
  let bytes = result.bytes;
  if (!bytes) {
    if (item && typeof item.b64_json === 'string') {
      bytes = Buffer.from(item.b64_json, 'base64');
    } else if (item && typeof item.url === 'string') {
      bytes = await fetchBytes(item.url, apiKey, timeoutMs);
    } else if (typeof result.json?.data === 'string') {
      bytes = Buffer.from(result.json.data, 'base64');
    } else {
      throw new Error(`生图响应没有图片数据：${JSON.stringify(result.json).slice(0, 400)}`);
    }
  }
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, bytes);
  return {
    path: outFile,
    bytes: bytes.length,
    model: String(model ?? provider.model ?? ''),
    revisedPrompt: item?.revised_prompt,
  };
}

/** Default file name for a generated asset inside a project. */
export function assetPath(projectDir, folder, name, extension) {
  return join(projectDir, 'public', folder, `${name}.${extension}`);
}