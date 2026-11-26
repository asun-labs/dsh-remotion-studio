/**
 * Project scaffolding.
 *
 * Creates a plain, conventional Remotion project (the same shape the official
 * docs describe) so everything Remotion can do stays available: the user can
 * keep writing compositions, use the Studio, upgrade Remotion, or delete this
 * plugin and the project still works. Nothing here patches Remotion itself.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REACT_VERSION = '19.0.0';

function pkgJson(name, remotionVersion) {
  return JSON.stringify(
    {
      name: name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'remotion-video',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'remotion studio',
        studio: 'remotion studio',
        render: 'remotion render',
        still: 'remotion still',
        upgrade: 'remotion upgrade',
      },
      dependencies: {
        '@remotion/cli': remotionVersion,
        react: REACT_VERSION,
        'react-dom': REACT_VERSION,
        remotion: remotionVersion,
      },
    },
    null,
    2,
  );
}

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": false,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowJs": true
  },
  "include": ["src", "remotion.config.ts"]
}
`;

const REMOTION_CONFIG = `import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
`;

const INDEX_TS = `import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
`;

const ROOT_TSX = `import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Composition';

/**
 * Register every composition here. Add as many as you like — each one shows up
 * in the Studio sidebar and is addressable from the CLI by its id.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: '你好，Remotion', withVoiceover: false, imagePrompt: '' }}
      />
    </>
  );
};
`;

const COMPOSITION_TSX = `import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { generateImage, speak } from './dsh/providers';

export type MainProps = {
  title?: string;
  withVoiceover?: boolean;
  imagePrompt?: string;
};

/**
 * A deliberately small starter composition: animated title, optional
 * generated image, optional TTS voice-over. Both providers are configured in
 * DSH 设置 → Remotion 影棚, and reach this code through ./dsh/providers.
 *
 * Note the delayRender/continueRender pair: rendering waits until the async
 * provider work finishes, otherwise the frame is captured before audio/images
 * arrive.
 */
export const Main: React.FC<MainProps> = ({ title = 'Hello Remotion', withVoiceover, imagePrompt }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [voice, setVoice] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string | null>(null);
  const [handle] = React.useState(() => delayRender('生成配音与图片'));

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (withVoiceover) {
        const audio = await speak(title);
        if (!cancelled) setVoice(audio);
      }
      if (imagePrompt) {
        const picture = await generateImage(imagePrompt);
        if (!cancelled) setImage(picture);
      }
    })()
      .catch((error) => console.error('[remotion-studio] provider call failed', error))
      .finally(() => continueRender(handle));
    return () => {
      cancelled = true;
    };
  }, [withVoiceover, imagePrompt, title, handle]);

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 20, durationInFrames - 20, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0d12', fontFamily: 'system-ui, sans-serif' }}>
      {voice ? <Audio src={voice} /> : null}
      {image ? (
        <Img
          src={image}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
          }}
        />
      ) : null}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
        <h1
          style={{
            color: '#ffffff',
            fontSize: 96,
            margin: 0,
            transform: \`translateY(\${(1 - enter) * 40}px)\`,
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          {title}
        </h1>
        <p style={{ color: '#8b93a7', fontSize: 28, marginTop: 24 }}>由 DSH remotion-studio 生成</p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
`;

const PROVIDERS_TS = `/**
 * Model-provider helpers for composition code (generated by DSH remotion-studio).
 *
 * Composition code is bundled for the browser, where \`process.env\` is not
 * available. The plugin therefore writes \`public/dsh-providers.json\` before
 * every render and Studio start, and this module reads it with staticFile().
 * Those values come from 设置 → Remotion 影棚, so no endpoint, model or key is
 * ever hard-coded here.
 */
import { continueRender, delayRender, staticFile } from 'remotion';

export type ProviderConfig = {
  baseURL?: string;
  path?: string;
  model?: string;
  voice?: string;
  format?: string;
  size?: string;
  apiKey?: string;
  extraBody?: Record<string, unknown>;
};

export type ProvidersBridge = {
  bridge?: { url?: string; token?: string };
  tts?: ProviderConfig;
  image?: ProviderConfig;
};

let cached: ProvidersBridge | null = null;
let loading: Promise<ProvidersBridge> | null = null;

/** Read (once) the provider settings the DSH plugin exported into public/. */
export function loadProviders(): Promise<ProvidersBridge> {
  if (cached) return Promise.resolve(cached);
  if (loading) return loading;
  const handle = delayRender('读取 DSH 服务商配置');
  loading = (async () => {
    let config: ProvidersBridge = {};
    try {
      const response = await fetch(staticFile('dsh-providers.json'), { cache: 'no-store' });
      if (response.ok) {
        const parsed = (await response.json()) as ProvidersBridge;
        if (parsed && typeof parsed === 'object') config = parsed;
      } else {
        console.warn('[dsh] dsh-providers.json 不可读，HTTP ' + response.status);
      }
    } catch (error) {
      console.warn('[dsh] 读取 dsh-providers.json 失败，请先在本页面配置服务商', error);
    }
    cached = config;
    continueRender(handle);
    return config;
  })();
  return loading;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\\/+$/, '') + '/' + path.replace(/^\\/+/, '');
}

async function toDataUrl(bytes: ArrayBuffer, mime: string): Promise<string> {
  const view = new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return 'data:' + mime + ';base64,' + btoa(binary);
}

export async function hasTtsProvider(): Promise<boolean> {
  const { tts } = await loadProviders();
  return Boolean(tts && tts.baseURL);
}

export async function hasImageProvider(): Promise<boolean> {
  const { image } = await loadProviders();
  return Boolean(image && image.baseURL);
}

/**
 * Ask the DSH Host to perform the call. Preferred over a direct browser fetch:
 * the API key stays in the Host, and the provider never sees a browser origin
 * (which most of them block with CORS).
 */
async function callBridge(action: 'tts' | 'image', payload: Record<string, unknown>): Promise<string | null> {
  const { bridge } = await loadProviders();
  if (!bridge || !bridge.url) return null;
  try {
    const response = await fetch(bridge.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dsh-token': bridge.token ?? '' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!response.ok) {
      console.warn('[dsh] bridge HTTP ' + response.status);
      return null;
    }
    const json: any = await response.json();
    if (!json || json.ok !== true || typeof json.base64 !== 'string') {
      console.warn('[dsh] bridge 调用失败：' + String(json && json.error));
      return null;
    }
    return 'data:' + String(json.mime || 'application/octet-stream') + ';base64,' + json.base64;
  } catch (error) {
    console.warn('[dsh] bridge 不可达，改为直接请求服务商', error);
    return null;
  }
}

/** Synthesize speech; returns a data URL usable by <Audio src={...} />. */
export async function speak(
  text: string,
  options: { voice?: string; model?: string; format?: string } = {},
): Promise<string> {
  const { tts } = await loadProviders();
  if (!tts || !tts.baseURL) {
    throw new Error('未配置 TTS 服务商：请在 DSH 设置 → Remotion 影棚 里填写');
  }
  const format = options.format || tts.format || 'mp3';
  const bridged = await callBridge('tts', {
    text,
    format,
    ...(options.voice ? { voice: options.voice } : {}),
    ...(options.model ? { model: options.model } : {}),
  });
  if (bridged) return bridged;
  const body = {
    input: text,
    model: options.model || tts.model || undefined,
    voice: options.voice || tts.voice || undefined,
    response_format: format,
    ...(tts.extraBody ?? {}),
  };
  const response = await fetch(joinUrl(tts.baseURL, tts.path || '/audio/speech'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(tts.apiKey ? { authorization: 'Bearer ' + tts.apiKey } : {}),
    },
    body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== ''))),
  });
  if (!response.ok) {
    throw new Error('TTS HTTP ' + response.status + '：' + (await response.text()).slice(0, 300));
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json: any = await response.json();
    const base64 = typeof json?.audio === 'string' ? json.audio : typeof json?.data === 'string' ? json.data : null;
    if (!base64) throw new Error('TTS 响应里没有音频数据');
    return 'data:audio/' + (format === 'mp3' ? 'mpeg' : format) + ';base64,' + base64;
  }
  return toDataUrl(await response.arrayBuffer(), 'audio/' + (format === 'mp3' ? 'mpeg' : format));
}

/** Generate one image; returns a data URL usable by <Img src={...} />. */
export async function generateImage(
  prompt: string,
  options: { size?: string; model?: string } = {},
): Promise<string> {
  const { image } = await loadProviders();
  if (!image || !image.baseURL) {
    throw new Error('未配置生图服务商：请在 DSH 设置 → Remotion 影棚 里填写');
  }
  const bridged = await callBridge('image', {
    prompt,
    ...(options.size ? { size: options.size } : {}),
    ...(options.model ? { model: options.model } : {}),
  });
  if (bridged) return bridged;
  const response = await fetch(joinUrl(image.baseURL, image.path || '/images/generations'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(image.apiKey ? { authorization: 'Bearer ' + image.apiKey } : {}),
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      model: options.model || image.model || undefined,
      size: options.size || image.size || '1024x1024',
      // No response_format here: gpt-image-1 rejects it, and both base64
      // and url answers are handled below.
      ...(image.extraBody ?? {}),
    }),
  });
  if (!response.ok) {
    throw new Error('生图 HTTP ' + response.status + '：' + (await response.text()).slice(0, 300));
  }
  const json: any = await response.json();
  const item = json?.data?.[0] ?? json?.output?.[0] ?? json;
  if (typeof item?.b64_json === 'string') return 'data:image/png;base64,' + item.b64_json;
  if (typeof item?.url === 'string') {
    const download = await fetch(item.url);
    return toDataUrl(await download.arrayBuffer(), 'image/png');
  }
  throw new Error('生图响应里没有图片数据');
}
`;

const GITIGNORE = `node_modules
out

# Remotion
.remotion

# Generated by DSH remotion-studio: provider endpoints, bridge token, render props
public/dsh-providers.json
.dsh-props.json
`;

/**
 * Write a fresh Remotion project.
 * @param {{dir:string, name:string, remotionVersion:string, force?:boolean}} options
 * @returns {{dir:string, files:string[]}}
 */
export function createProject({ dir, name, remotionVersion, force = false }) {
  const packagePath = join(dir, 'package.json');
  if (existsSync(packagePath) && !force) {
    throw new Error(`目录已存在且包含 package.json：${dir}（如需覆盖请传 force=true，或换一个项目名）`);
  }
  const files = [
    ['package.json', pkgJson(name, remotionVersion)],
    ['tsconfig.json', TSCONFIG],
    ['remotion.config.ts', REMOTION_CONFIG],
    ['.gitignore', GITIGNORE],
    [join('src', 'index.ts'), INDEX_TS],
    [join('src', 'Root.tsx'), ROOT_TSX],
    [join('src', 'Composition.tsx'), COMPOSITION_TSX],
    [join('src', 'dsh', 'providers.ts'), PROVIDERS_TS],
    [join('public', '.gitkeep'), ''],
  ];
  for (const [rel, content] of files) {
    const target = join(dir, rel);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content, 'utf8');
  }
  return { dir, files: files.map(([rel]) => join(dir, rel)) };
}