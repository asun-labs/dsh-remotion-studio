/**
 * TTS / image generation over several provider protocols.
 *
 * The settings page lets the user pick a protocol per provider
 * (`providers.tts.protocol`, `providers.image.protocol`):
 *
 *   openai      OpenAI-compatible: POST {input,prompt,model,voice,...} → audio
 *               bytes / {data[0].b64_json|url}           (OpenAI, 聚合站, 本地 vLLM)
 *   dashscope   阿里云百炼: /api/v1/services/aigc/multimodal-generation/generation
 *               或 /api/v1/services/audio/tts/SpeechSynthesizer → URL 或 base64
 *   ark         火山方舟: /images/generations、/contents/generations/tasks → {data[0].url}
 *   openspeech  火山语音: /api/v3/tts/unidirectional → {data:"<base64>"} 分块音频
 *   tokenplan   阿里云 Token Plan（sk-sp- 订阅套餐）: 图像
 *               /api/v1/services/aigc/multimodal-generation/generation，
 *               语音 /api/v1/services/audio/tts/SpeechSynthesizer → URL
 *               baseURL 建议 https://token-plan.cn-beijing.maas.aliyuncs.com
 *   auto        逐个试上面的协议，直到某个成功
 *
 * Nothing here hard-codes a key or a model: everything comes from settings.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export const PROTOCOLS = ['auto', 'openai', 'dashscope', 'tokenplan', 'ark', 'arkplan', 'openspeech'];

const PROTOCOL_LABEL = {
  auto: '自动识别',
  openai: 'OpenAI 兼容',
  dashscope: '阿里云百炼（DashScope）',
  tokenplan: '阿里云 Token Plan（订阅套餐）',
  ark: '火山方舟（Ark）',
  arkplan: '火山方舟 Agent Plan（订阅套餐）',
  openspeech: '火山语音（openspeech）',
};

const DEFAULT_TTS_PATH = {
  auto: '/audio/speech',
  openai: '/audio/speech',
  dashscope: '/api/v1/services/aigc/multimodal-generation/generation',
  tokenplan: '/api/v1/services/audio/tts/SpeechSynthesizer',
  // Agent Plan 语音只在 openspeech 端点，绝对地址，与 baseURL 无关。
  arkplan: '/api/v3/plan/tts/unidirectional',
  ark: '/api/v3/tts/unidirectional',
  openspeech: '/api/v3/tts/unidirectional',
};

const DEFAULT_IMAGE_PATH = {
  auto: '/images/generations',
  openai: '/images/generations',
  dashscope: '/api/v1/services/aigc/multimodal-generation/generation',
  tokenplan: '/api/v1/services/aigc/multimodal-generation/generation',
  ark: '/images/generations',
  // Must contain `/plan`; the plain `/api/v3` base silently bills pay-as-you-go instead.
  arkplan: '/api/plan/v3/images/generations',
  openspeech: '/images/generations',
};

/** Agent Plan speech is served by openspeech, a different host from the Ark API. */
const ARKPLAN_TTS_HOST = 'https://openspeech.bytedance.com';

/** Order in which `auto` probes protocols; cheap/likely first. */
const TTS_ORDER = ['openai', 'openspeech', 'dashscope', 'tokenplan', 'ark', 'arkplan'];
const IMAGE_ORDER = ['openai', 'ark', 'dashscope', 'tokenplan', 'arkplan'];

export function normalizeProtocol(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'volcengine' || key === 'volc' || key === 'bytedance') return 'ark';
  if (key === 'agentplan' || key === 'agent-plan' || key === 'ark-plan' || key === 'arkplan') return 'arkplan';
  if (key === 'aliyun' || key === 'bailian' || key === 'qwen') return 'dashscope';
  if (key === 'token-plan' || key === 'tokenplan' || key === 'sk-sp') return 'tokenplan';
  if (key === 'doubao' || key === 'seed-tts' || key === 'seedtts') return 'openspeech';
  return PROTOCOLS.includes(key) ? key : 'auto';
}

/** The path to use when the user left it blank for the chosen protocol. */
export function defaultPath(kind, protocol) {
  const key = normalizeProtocol(protocol);
  const table = kind === 'tts' ? DEFAULT_TTS_PATH : DEFAULT_IMAGE_PATH;
  return table[key] ?? table.openai;
}

/**
 * Endpoint for one attempt.
 *
 * Resolution order, first hit wins:
 *  1. an explicit `path` typed by the user;
 *  2. an address typed down to a full endpoint (`…/v1/audio/speech`);
 *  3. a Token Plan host, whose native services live at the host root and whose
 *     `/compatible-mode/v1` prefix only ever serves OpenAI-compatible paths —
 *     so the prefix is dropped before the native path is appended;
 *  4. `baseURL` + the protocol's default path.
 */
/** Ark Agent Plan base URLs end with the version segment, e.g. `.../api/plan/v3`. */
function planBaseSuffix(baseURL) {
  try {
    const pathname = new URL(String(baseURL ?? '')).pathname.replace(/\/+$/, '');
    return /\/api\/plan\/v\d+$/i.test(pathname);
  } catch {
    return false;
  }
}

function endpointFor(kind, provider, protocol) {
  const manual = String(provider.path ?? '').trim();
  if (manual) return joinUrl(protocol === 'arkplan' && kind === 'tts' ? ARKPLAN_TTS_HOST : provider.baseURL, manual);
  // Agent Plan speech always lives on openspeech, whatever the address box says.
  if (protocol === 'arkplan' && kind === 'tts') return joinUrlLoose(ARKPLAN_TTS_HOST, DEFAULT_TTS_PATH.arkplan);
  const typed = String(provider.baseURL ?? '').trim();
  // A pasted `/api/plan/v3` base already carries the prefix the default path repeats.
  // Image: the base IS the endpoint (`/api/plan/v3/images/generations` is a suffix of
  // nothing) — only the plain `/api/plan/v3` root makes no call on its own, so append
  // the kind's last segment. TTS never reaches here (it is pinned to openspeech).
  if (pathLikeBase(kind, typed)) {
    if (planBaseSuffix(typed)) {
      return joinUrlLoose(typed, kind === 'image' ? 'images/generations' : '');
    }
    return joinUrlLoose(typed);
  }
  const fallback = defaultPath(kind, protocol);
  if (/\/compatible-mode/i.test(typed)) {
    const root = typed.replace(/\/compatible-mode(\/v\d+)?\/?$/i, '');
    // Token Plan's compatible prefix serves no native service; always climb to the root.
    if (protocol === 'tokenplan') return joinUrlLoose(root, fallback);
    // Any other OpenAI-compatible service keeps its prefix: `/compatible-mode/v1` + `/audio/speech`.
    return joinUrlLoose(typed, fallback);
  }
  if (planBaseSuffix(typed) && fallback.startsWith('/api/plan/')) {
    return joinUrlLoose(typed, fallback.replace(/^\/api\/plan\/v\d+/i, ''));
  }
  return joinUrl(typed, fallback);
}

/** True when the address points at Token Plan's Anthropic-only endpoint. */
function isAnthropicBase(baseURL) {
  return /\/apps\/anthropic(\/|$)/i.test(String(baseURL ?? ''));
}

/** An actionable message for the one address that cannot serve TTS or images at all. */
function anthropicRefusal(kind) {
  return (
    `${kind === 'tts' ? '语音合成' : '生图'} 不能走 Token Plan 的 /apps/anthropic 端点（那是 Anthropic 对话协议专用）。` +
    '请把服务地址改成 https://token-plan.cn-beijing.maas.aliyuncs.com ' +
    '（带 /compatible-mode/v1 也可以，插件会自动折算），然后重新测试。'
  );
}

/**
 * True when the address box holds a full endpoint rather than a service root.
 * Deliberately narrow: only the well-known Tab-completion-style paths qualify, so a
 * custom base like `https://x/v1` keeps its suffix and only gains `/audio/speech`.
 */
function pathLikeBase(kind, baseURL) {
  if (!/^https?:\/\//i.test(baseURL)) return false;
  let pathname;
  try {
    pathname = new URL(baseURL).pathname.replace(/\/+$/, '');
  } catch {
    return false;
  }
  if (!pathname) return false;
  if (/\/(audio\/speech|images\/generations|chat\/completions|SpeechSynthesizer|generation)$/i.test(pathname)) return true;
  // Ark Agent Plan: people paste the whole `/api/plan/v3` base from the console.
  if (/\/api\/plan\/v\d+\/?$/i.test(pathname)) return true;
  return false;
}

/**
 * Which wire shape an address implies. Token Plan serves the same models through a
 * native service root and an OpenAI-compatible `/compatible-mode/v1` prefix, so the
 * address alone decides the body shape — the user never has to know which is which.
 *
 * Note: `/compatible-mode/v1` is OpenAI-shaped only for chat; the native TTS and image
 * services are NOT reachable beneath that prefix. Those kinds always use the native
 * body (with the prefix stripped from the endpoint), so their flavor is 'native'.
 */
function flavorOf(kind, baseURL) {
  const text = String(baseURL ?? '');
  if (/\/compatible-mode/i.test(text)) {
    // The OpenAI shape this plugin can speak is `audio/speech` + `images/generations`;
    // Token Plan does not expose either under the compatible prefix, so keep native.
    return 'native';
  }
  if (/\/apps\/anthropic/i.test(text)) return 'anthropic';
  return 'native';
}

/** Fill in the protocol a bare host address implies, so `auto` starts from the right guess. */
function inferProtocol(kind, provider, requested) {
  if (requested && requested !== 'auto') return requested;
  const base = String(provider?.baseURL ?? '');
  // Token Plan: neither `/compatible-mode/v1` nor `/apps/anthropic` serves TTS or image
  // generation, so point every guess at the native service root.
  if (/token-plan\./i.test(base)) return 'tokenplan';
  // Ark Agent Plan is the `/api/plan/...` surface; the bare `/api/v3` path bills pay-as-you-go.
  if (/\/api\/plan\b/i.test(base)) return 'arkplan';
  if (/ark\.(cn-)?[a-z0-9-]*\.volces\.com/i.test(base)) return 'ark';
  if (/\/(apps\/anthropic|compatible-mode)\//i.test(base)) return 'openai';
  return 'auto';
}

function joinUrl(baseURL, suffix) {
  const base = String(baseURL ?? '').replace(/\/+$/, '');
  const tail = String(suffix ?? '').replace(/^\/+/, '');
  if (!base) throw new Error('服务地址 baseURL 未配置');
  return tail ? `${base}/${tail}` : base;
}

/** Same as joinUrl but without the "missing baseURL" guard (used for well-known paths). */
function joinUrlLoose(baseURL, suffix) {
  const base = String(baseURL ?? '').replace(/\/+$/, '');
  const tail = String(suffix ?? '').replace(/^\/+/, '');
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

/* ── HTTP ─────────────────────────────────────────────────────────────────── */

/**
 * Fold a chunked response into one object: audio chunks concatenated into `data`,
 * and the last non-null code/message kept (the terminal chunk carries the real code).
 */
function parseNdjson(raw) {
  const merged = { data: '' };
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let chunk;
    try { chunk = JSON.parse(trimmed); } catch { continue; }
    if (typeof chunk.data === 'string') merged.data += chunk.data;
    if (chunk.code !== undefined) merged.code = chunk.code;
    if (chunk.message !== undefined) merged.message = chunk.message;
    if (chunk.header && typeof chunk.header === 'object') merged.header = chunk.header;
  }
  return merged;
}

async function postJson(url, body, apiKey, { timeoutMs = 180000, headers = {}, auth = 'bearer' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey && auth === 'bearer' ? { authorization: `Bearer ${apiKey}` } : {}),
        ...(apiKey && auth === 'x-api-key' ? { 'x-api-key': apiKey } : {}),
        ...headers,
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
    const bytes = Buffer.from(await response.arrayBuffer());
    // Take the body as bytes first and sniff the shape: 火山语音 openspeech answers
    // with `application/json` yet the payload is a base64 wrapper, and some gateways
    // answer `text/plain` with JSON inside. Sniffing keeps both paths on one branch.
    const head = bytes.subarray(0, 64).toString('utf8').trimStart();
    if (head.startsWith('{') || head.startsWith('[') || contentType.includes('application/json')) {
      const raw = bytes.toString('utf8');
      let json = null;
      try { json = JSON.parse(raw); } catch { json = null; }
      // 火山语音 (openspeech / Agent Plan) streams newline-delimited JSON chunks:
      // {"code":0,"data":"<base64>"} per line, terminated by {"code":20000000,"data":null}.
      if (!json && /\n/.test(raw.trim())) json = parseNdjson(raw);
      if (json && typeof json === 'object') return { json };
    }
    return { bytes, contentType };
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

/* ── response scanning ───────────────────────────────────────────────────── */

function walk(node, visit, depth = 0) {
  if (!node || depth > 8) return false;
  if (visit(node) === true) return true;
  if (Array.isArray(node)) {
    for (const item of node) if (walk(item, visit, depth + 1)) return true;
    return false;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node)) if (walk(value, visit, depth + 1)) return true;
  }
  return false;
}

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|flac|pcm|webm)(\?|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i;

/** First http(s) URL in the tree whose path looks like audio (or any URL if `any`). */
function findUrl(node, extension, any = false) {
  let found;
  walk(node, (value) => {
    if (typeof value !== 'string') return false;
    if (!/^https?:\/\//i.test(value)) return false;
    if (any || extension.test(value)) {
      found = value;
      return true;
    }
    return false;
  });
  return found;
}

/** Any base64 blob big enough to be real audio/image payload. */
function findBase64(node, minLength) {
  let found;
  walk(node, (value) => {
    if (typeof value === 'string' && value.length > minLength && /^[A-Za-z0-9+/=\s]+$/.test(value)) {
      found = value;
      return true;
    }
    return false;
  });
  return found;
}

/** URL points at data that is not audio (e.g. a task status page). */
function isAudioBytes(bytes) {
  if (!bytes || bytes.length < 128) return false;
  const head = bytes.subarray(0, 12);
  const text = head.toString('latin1');
  if (text.startsWith('RIFF') || text.startsWith('ID3') || text.startsWith('OggS') || text.startsWith('fLaC')) return true;
  if (text.startsWith('fLaC')) return true;
  // ADTS AAC / MP3 frame sync
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true;
  // MP4/M4A container
  if (text.slice(4, 8) === 'ftyp') return true;
  return false;
}

/** Trim a data URL to its base64 body (also handles `base64,`-only payloads). */
function toBase64(value) {
  if (typeof value !== 'string') return undefined;
  const marker = value.indexOf('base64,');
  if (marker >= 0) return value.slice(marker + 7);
  return value;
}

function audioExtensionFrom(contentType, fallback) {
  const type = String(contentType ?? '').toLowerCase();
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav') || type.includes('wave')) return 'wav';
  if (type.includes('ogg') || type.includes('opus')) return 'ogg';
  if (type.includes('aac')) return 'aac';
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('flac')) return 'flac';
  return fallback;
}

const IMAGE_SIGNATURE = [
  [0x89, 0x50, 0x4e, 0x47], // png
  [0xff, 0xd8, 0xff], // jpeg
  [0x47, 0x49, 0x46], // gif
  [0x42, 0x4d], // bmp
];

function looksLikeImage(bytes) {
  if (!bytes || bytes.length < 64) return false;
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') return true;
  if (bytes.subarray(4, 8).toString('latin1') === 'ftyp' && /avi[fs]/.test(bytes.subarray(8, 12).toString('latin1'))) return true;
  return IMAGE_SIGNATURE.some((sig) => sig.every((byte, index) => bytes[index] === byte));
}

function imageExtension(bytes) {
  if (!bytes) return 'png';
  if (bytes[0] === 0x89) return 'png';
  if (bytes[0] === 0xff) return 'jpg';
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF') return 'webp';
  if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') return 'avif';
  return 'png';
}

/* ── TTS ──────────────────────────────────────────────────────────────────── */

function ttsRequest(protocol, { provider, text, model, voice, format, extraBody }) {
  const modelId = String(model ?? provider.model ?? '');
  const voiceId = String(voice ?? provider.voice ?? '');
  const audioFormat = String(format ?? provider.format ?? 'mp3');
  switch (protocol) {
    case 'dashscope': {
      // Qwen-TTS: input.text/voice/language_type; audio is returned as a URL.
      const input = {
        text,
        ...(voiceId ? { voice: voiceId.trim() } : {}),
        ...(audioFormat && audioFormat !== 'mp3' ? { format: audioFormat } : {}),
        ...(provider.language ? { language_type: String(provider.language) } : {}),
      };
      return {
        body: { model: modelId, input, ...extraBody },
        auth: 'bearer',
      };
    }
    case 'tokenplan': {
      // Two wire shapes for the same plan:
      //  - native `/api/v1/services/audio/tts/SpeechSynthesizer`: input{text,voice,format,sample_rate} → output.audio.url
      //  - OpenAI-compatible `/compatible-mode/v1/audio/speech`: {input,model,voice,response_format} → audio bytes
      if (provider.flavor === 'compatible') {
        return {
          body: {
            input: text,
            ...(modelId ? { model: modelId } : {}),
            ...(voiceId ? { voice: voiceId } : {}),
            ...(audioFormat ? { response_format: audioFormat } : {}),
            ...extraBody,
          },
          auth: 'bearer',
        };
      }
      return {
        body: {
          model: modelId,
          input: {
            text,
            ...(voiceId ? { voice: voiceId } : {}),
            format: audioFormat,
            sample_rate: Number(provider.sampleRate) > 0 ? Number(provider.sampleRate) : 22050,
            ...(provider.language ? { language_type: String(provider.language) } : {}),
          },
          ...extraBody,
        },
        auth: 'bearer',
      };
    }
    case 'ark':
    case 'openspeech':
    case 'arkplan': {
      // 火山语音: req_params{ text, speaker, audio_params{format,sample_rate} }
      // Agent Plan reuses the openspeech wire format but demands an explicit
      // x-api-resource-id; without it the server answers 403 code 45000030
      // "extract request resource id: get resource id empty".
      const resourceId = protocol === 'arkplan'
        ? (provider.resourceId ? String(provider.resourceId) : 'seed-tts-2.0')
        : (modelId ? (/tts/i.test(modelId) ? modelId.replace(/^doubao-/, '') : modelId) : '');
      return {
        body: {
          ...(modelId ? { model: modelId } : {}),
          req_params: {
            text,
            ...(voiceId ? { speaker: voiceId } : {}),
            audio_params: {
              format: audioFormat,
              ...(provider.sampleRate ? { sample_rate: Number(provider.sampleRate) } : {}),
            },
          },
          ...extraBody,
        },
        auth: 'x-api-key',
        headers: {
          ...(resourceId ? { 'x-api-resource-id': resourceId } : {}),
        },
      };
    }
    default:
      return {
        body: {
          input: text,
          ...(modelId ? { model: modelId } : {}),
          ...(voiceId ? { voice: voiceId } : {}),
          ...(audioFormat ? { response_format: audioFormat } : {}),
          ...extraBody,
        },
        auth: 'bearer',
      };
  }
}

async function ttsResponse(protocol, result, { apiKey, timeoutMs, format }) {
  const fallbackExt = String(format ?? '').toLowerCase() || 'mp3';
  const json = result.json ?? {};
  // Check the decoded JSON wrapper first: a binary-looking `bytes` also rides along
  // whenever postJson parsed a JSON body, and that snapshot would shadow the audio.
  if (!result.json && result.bytes) {
    if (!isAudioBytes(result.bytes)) {
      // Some gateways answer errors with a JSON body but a non-JSON content type.
      const text = result.bytes.toString('utf8').trim();
      if (text.startsWith('{')) {
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = null; }
        if (parsed) {
          const code = parsed.code ?? parsed.header?.code ?? parsed.error?.code;
          const info = parsed.message ?? parsed.header?.message ?? parsed.error?.message ?? text;
          throw new Error(`语音接口返回错误（code ${code ?? '?'}）：${String(info).slice(0, 300)}`);
        }
      }
      throw new Error(`返回的二进制不是音频（可能是错误页或 JSON）：${text.slice(0, 200)}`);
    }
    return { bytes: result.bytes, ext: audioExtensionFrom(result.contentType, fallbackExt) };
  }
  const direct = json.data;
  // 火山语音 openspeech: {"data": "<base64 chunk>", "code": 0} — served with an
  // `application/json` content type, so the raw bytes would fail the audio sniff.
  // Ark Agent Plan speech rides the same openspeech endpoint and payload shape.
  if ((protocol === 'openspeech' || protocol === 'arkplan') && typeof direct === 'string') {
    const base64 = toBase64(direct);
    if (base64 && base64.length > 64) return { bytes: Buffer.from(base64, 'base64'), ext: fallbackExt };
  }
  if (Number(json.code) && json.code !== 0 && !direct) {
    throw new Error(`语音接口返回错误（code ${json.code}）：${String(json.message ?? json.msg ?? '').slice(0, 300)}`);
  }
  const explicit = [json.audio, json.audio_base64, json.audioContent, json.data?.audio];
  for (const candidate of explicit) {
    const base64 = toBase64(candidate);
    if (typeof base64 === 'string' && base64.length > 64) return { bytes: Buffer.from(base64, 'base64'), ext: fallbackExt };
  }
  const remote = json.audio?.url ?? json.url ?? findUrl(json, AUDIO_EXT) ?? findUrl(json, AUDIO_EXT, true);
  if (remote) {
    const bytes = await fetchBytes(remote, undefined, timeoutMs);
    if (!isAudioBytes(bytes)) throw new Error(`音频地址返回的不是音频：${remote}`);
    return { bytes, ext: audioExtensionFrom('', fallbackExt) };
  }
  const base64 = findBase64(json, 128);
  if (base64) return { bytes: Buffer.from(toBase64(base64), 'base64'), ext: fallbackExt };
  throw new Error(`响应里没有音频数据：${JSON.stringify(json).slice(0, 400)}`);
}

function readError(error) {
  let message = String(error?.message ?? error);
  // The endpoint exists but the router rejects it (e.g. `/apps/anthropic` prepended
  // to a native service path). Say so instead of echoing the portal URL.
  if (/url error/i.test(message)) message = `接口路径不被该地址接受（url error），baseURL 应填服务根地址：${message}`;
  // Ark Agent Plan: the plan is active but its deduction switch is off for this seat.
  if (/AgentPlanDeductNotEnabled/i.test(message)) {
    message = 'Agent Plan 抵扣开关未开启：请到火山方舟控制台「Agent Plan」页面打开抵扣（deduction）设置，'
      + '否则套餐内模型一律拒绝调用。原始信息：' + message;
  }
  if (/get resource id empty/i.test(message)) {
    message = '缺少 x-api-resource-id 请求头（Agent Plan 语音必须带，如 seed-tts-2.0）。原始信息：' + message;
  }
  return message.replace(/\s+/g, ' ').slice(0, 300);
}

/**
 * Text-to-speech.
 * @param {{provider:object, apiKey?:string, text:string, outFile:string,
 *          voice?:string, model?:string, format?:string, timeoutMs?:number}} options
 * @returns {Promise<{path:string, bytes:number, model:string, protocol:string}>}
 */
export async function synthesizeSpeech({ provider, apiKey, text, outFile, voice, format, model, timeoutMs }) {
  if (!String(text ?? '').trim()) throw new Error('TTS 文本为空');
  if (!outFile) throw new Error('TTS 缺少输出文件路径');
  if (!String(provider?.baseURL ?? '').trim()) throw new Error('服务地址 baseURL 未配置');
  if (isAnthropicBase(provider.baseURL)) throw new Error(anthropicRefusal('tts'));

  provider = { ...provider, flavor: flavorOf('tts', provider.baseURL) };
  const requested = inferProtocol('tts', provider, normalizeProtocol(provider.protocol));
  const attempts = requested === 'auto' ? TTS_ORDER : [requested];
  const extraBody = parseExtraBody(provider.extraBody, 'TTS');
  const errors = [];

  for (const protocol of attempts) {
    let url;
    try {
      url = endpointFor('tts', provider, protocol);
    } catch (error) {
      throw error;
    }
    try {
      const request = ttsRequest(protocol, { provider, text, model, voice, format, extraBody });
      const result = await postJson(url, request.body, apiKey, {
        timeoutMs,
        auth: request.auth,
        headers: request.headers,
      });
      const { bytes, ext } = await ttsResponse(protocol, result, {
        apiKey,
        timeoutMs,
        format: String(format ?? provider.format ?? 'mp3'),
      });
      const target = ensureExtension(outFile, ext);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      return { path: target, bytes: bytes.length, model: String(model ?? provider.model ?? ''), protocol };
    } catch (error) {
      errors.push(`${PROTOCOL_LABEL[protocol] ?? protocol}：${readError(error)}`);
      if (requested !== 'auto') break;
    }
  }
  const tried = attempts.map((protocol) => PROTOCOL_LABEL[protocol] ?? protocol).join(' / ');
  throw new Error(
    `${requested === 'auto' ? '所有接口协议都没成功' : '请求失败'}（${tried}）：\n${errors.join('\n')}`,
  );
}

/* ── image ────────────────────────────────────────────────────────────────── */

function imageRequest(protocol, { provider, prompt, size, model, extraBody }) {
  const modelId = String(model ?? provider.model ?? '');
  const imageSize = String(size ?? provider.size ?? '');
  switch (protocol) {
    case 'dashscope':
    case 'tokenplan':
      // Qwen-Image: input.messages[] with a text content part (Token Plan 同形状)。
      // Token Plan 的尺寸写法是 1024*1024，这里顺手把 1024x1024 归一化。
      // The OpenAI-compatible flavour of Token Plan uses the plain images/generations body instead.
      if (protocol === 'tokenplan' && provider.flavor === 'compatible') {
        return {
          body: {
            prompt,
            n: 1,
            ...(modelId ? { model: modelId } : {}),
            ...(imageSize ? { size: imageSize } : {}),
            ...extraBody,
          },
          auth: 'bearer',
        };
      }
      return {
        body: {
          model: modelId,
          input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
          parameters: { ...(imageSize ? { size: imageSize.replace(/[x×*]/i, '*') } : {}), ...extraBody },
        },
        auth: 'bearer',
      };
    case 'ark':
    case 'arkplan':
      // 方舟: OpenAI-like body, response is {data:[{url}]} (valid 24h).
      // Agent Plan uses the identical shape, only the endpoint carries `/plan`.
      return {
        body: {
          ...(modelId ? { model: modelId } : {}),
          prompt,
          ...(imageSize ? { size: imageSize } : {}),
          response_format: 'url',
          ...extraBody,
        },
        auth: 'bearer',
      };
    default:
      return {
        body: {
          prompt,
          n: 1,
          ...(modelId ? { model: modelId } : {}),
          ...(imageSize ? { size: imageSize } : {}),
          ...extraBody,
        },
        auth: 'bearer',
      };
  }
}

async function imageResponse(result, { apiKey, timeoutMs }) {
  if (result.bytes) {
    if (!looksLikeImage(result.bytes)) throw new Error('返回的二进制不是图片，请检查 baseURL 与 path');
    return result.bytes;
  }
  const json = result.json ?? {};
  const item = json.data?.[0] ?? json.output?.[0] ?? json;
  if (typeof item?.b64_json === 'string') return Buffer.from(item.b64_json, 'base64');
  const remote =
    (typeof item?.url === 'string' ? item.url : undefined) ??
    (typeof item?.image === 'string' ? item.image : undefined) ??
    findUrl(json, IMAGE_EXT) ??
    findUrl(json, IMAGE_EXT, true);
  if (remote) return fetchBytes(remote, undefined, timeoutMs);
  const base64 = findBase64(json, 512);
  if (base64) return Buffer.from(toBase64(base64), 'base64');
  throw new Error(`响应里没有图片数据：${JSON.stringify(json).slice(0, 400)}`);
}

/**
 * Image generation.
 * @returns {Promise<{path:string, bytes:number, model:string, protocol:string}>}
 */
export async function generateImage({ provider, apiKey, prompt, outFile, size, model, timeoutMs }) {
  if (!String(prompt ?? '').trim()) throw new Error('生图 prompt 为空');
  if (!outFile) throw new Error('生图缺少输出文件路径');
  if (!String(provider?.baseURL ?? '').trim()) throw new Error('服务地址 baseURL 未配置');
  if (isAnthropicBase(provider.baseURL)) throw new Error(anthropicRefusal('image'));

  provider = { ...provider, flavor: flavorOf('image', provider.baseURL) };
  const requested = inferProtocol('image', provider, normalizeProtocol(provider.protocol));
  const attempts = requested === 'auto' ? IMAGE_ORDER : [requested];
  const extraBody = parseExtraBody(provider.extraBody, '生图');
  const errors = [];

  for (const protocol of attempts) {
    let url;
    try {
      url = endpointFor('image', provider, protocol);
    } catch (error) {
      throw error;
    }
    try {
      const request = imageRequest(protocol, { provider, prompt, size, model, extraBody });
      const result = await postJson(url, request.body, apiKey, { timeoutMs, auth: request.auth });
      const bytes = await imageResponse(result, { apiKey, timeoutMs });
      if (!looksLikeImage(bytes)) throw new Error('下载到的数据不是有效图片');
      const target = ensureExtension(outFile, imageExtension(bytes));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      return { path: target, bytes: bytes.length, model: String(model ?? provider.model ?? ''), protocol };
    } catch (error) {
      errors.push(`${PROTOCOL_LABEL[protocol] ?? protocol}：${readError(error)}`);
      if (requested !== 'auto') break;
    }
  }
  const tried = attempts.map((protocol) => PROTOCOL_LABEL[protocol] ?? protocol).join(' / ');
  throw new Error(
    `${requested === 'auto' ? '所有接口协议都没成功' : '请求失败'}（${tried}）：\n${errors.join('\n')}`,
  );
}

/** Replace the file extension when the provider returned another container. */
function ensureExtension(file, ext) {
  if (!ext) return file;
  const current = basename(file).split('.').pop()?.toLowerCase();
  if (!current) return `${file}.${ext}`;
  if (current === ext) return file;
  if (/^(mp3|png|wav|m4a|aac|ogg|jpg|jpeg|webp|opus|flac)$/i.test(current)) {
    return file.replace(/\.[^.\\/]+$/, `.${ext}`);
  }
  return file;
}

/** Default file name for a generated asset inside a project. */
export function assetPath(projectDir, folder, name, extension) {
  return join(projectDir, 'public', folder, `${name}.${extension}`);
}

export { PROTOCOL_LABEL };