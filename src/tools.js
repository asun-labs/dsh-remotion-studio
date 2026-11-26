/**
 * Agent tools.
 *
 * Every tool is a thin wrapper around the official Remotion CLI (see
 * runner.js) or around the user-configured model providers (providers.js).
 * No Remotion behaviour is re-implemented, so anything the CLI can do stays
 * reachable — including through the `remotion_cli` passthrough tool.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve as pathResolve } from 'node:path';
import { CLI_SUBCOMMANDS, doctor, listProjects, projectPath, runNpm, runRemotionCli } from './runner.js';
import { startStudio, stopAllStudios } from './studio.js';
import { assetPath, generateImage, synthesizeSpeech } from './providers.js';
import { createProject } from './scaffold.js';

const CODEC_EXT = {
  h264: 'mp4',
  'h264-mkv': 'mkv',
  h265: 'mp4',
  vp8: 'webm',
  vp9: 'webm',
  prores: 'mov',
  gif: 'gif',
  wav: 'wav',
  mp3: 'mp3',
  aac: 'aac',
  flac: 'flac',
};

/** Standard output envelope: a boolean, a one-line summary, and a detail blob. */
function textOut(detailSchema = {}, detailRequired = []) {
  return {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        summary: { type: 'string' },
        details: { type: 'string' },
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        items: { type: 'array', items: { type: 'string' } },
        ...detailSchema,
      },
      required: ['ok', 'summary', ...detailRequired],
    },
    render: (_args, value) => {
      const lines = [value?.summary ?? '(no summary)'];
      if (value?.details) lines.push('', String(value.details));
      if (value?.stdout) lines.push('', '--- stdout ---', String(value.stdout).slice(-8000));
      if (value?.stderr) lines.push('', '--- stderr ---', String(value.stderr).slice(-8000));
      if (Array.isArray(value?.items) && value.items.length > 0) {
        lines.push('', ...value.items.map((item) => `• ${typeof item === 'string' ? item : JSON.stringify(item)}`));
      }
      return [{ type: 'text', text: lines.join('\n') }];
    },
  };
}

function tail(text, limit = 4000) {
  const value = String(text ?? '').trim();
  return value.length > limit ? `…${value.slice(-limit)}` : value;
}

function flags(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return [];
  return value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^['"]|['"]$/g, '')) ?? [];
}

/** Resolve a project reference (name under projectsDir, or an absolute path). */
function resolveProject(settings, reference) {
  if (!reference) throw new Error('缺少 project 参数（projectsDir 下的项目名）');
  const candidate = isAbsolute(reference) ? pathResolve(reference) : projectPath(settings, reference);
  if (!existsSync(candidate)) throw new Error(`项目不存在：${candidate}`);
  if (!existsSync(join(candidate, 'package.json'))) throw new Error(`目录不是 Remotion 项目（没有 package.json）：${candidate}`);
  return candidate;
}

async function secretsOf(store) {
  return { tts: await store.readSecret('tts'), image: await store.readSecret('image') };
}

export function registerTools(ctx, { store, logger }) {
  const tool = (definition) => ctx.tools.register(definition);

  ctx.effect(() => {
    const disposers = [];

    // ── doctor ───────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_doctor',
        description:
          '检查 Remotion 运行环境：Node/npm 版本、projectsDir、项目内 @remotion/cli 是否安装、`remotion versions`、Chrome/Headless Shell 配置、TTS/生图服务商配置状态。渲染失败或首次使用前先跑这个。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '可选，项目名或绝对路径；不传则只做全局检查' },
          },
        },
        output: textOut({ checks: { type: 'array', items: { type: 'object' } } }, ['checks']),
        async execute(args) {
          const settings = store.load();
          const projectDir = args.project ? resolveProject(settings, args.project) : undefined;
          const secrets = await secretsOf(store);
          const checks = await doctor({ settings, projectDir, secrets });
          const failed = checks.filter((check) => !check.ok);
          return {
            ok: failed.length === 0,
            summary:
              failed.length === 0
                ? `环境检查通过（${checks.length} 项）`
                : `${failed.length} 项检查未通过：${failed.map((c) => c.name).join(', ')}`,
            checks,
            details: checks.map((c) => `${c.ok ? '✅' : '❌'} ${c.name}: ${c.detail}`).join('\n'),
          };
        },
      }),
    );

    // ── project create ───────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_project_create',
        description:
          '在 projectsDir 下新建一个标准 Remotion 工程（package.json / tsconfig / remotion.config.ts / src/index.ts / src/Root.tsx / src/Composition.tsx / src/dsh/providers.ts）。这是官方标准结构，Remotion 源码未被修改；创建后一般需要再调用 remotion_project_install 安装依赖。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', description: '项目目录名，例如 my-video' },
            force: { type: 'boolean', description: '目录已存在时是否覆盖（默认 false）' },
            install: { type: 'boolean', description: '创建后立即 npm install（默认 false）' },
          },
          required: ['name'],
        },
        output: textOut({ dir: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, ['dir']),
        async execute(args) {
          const settings = store.load();
          const dir = projectPath(settings, args.name);
          const result = createProject({
            dir,
            name: args.name,
            remotionVersion: settings.remotionVersion,
            force: Boolean(args.force),
          });
          let installNote = '依赖尚未安装，下一步调用 remotion_project_install。';
          if (args.install) {
            const install = await runNpm({
              args: ['install', '--no-audit', '--no-fund', `--cache=${join(dir, '.npm-cache')}`],
              cwd: dir,
              registry: settings.npmRegistry || undefined,
            });
            installNote =
              install.code === 0 ? '依赖安装完成。' : `依赖安装失败（exit ${install.code}）：${tail(install.stderr || install.stdout, 1500)}`;
          }
          return {
            ok: true,
            summary: `已创建项目 ${args.name} → ${dir}。${installNote}`,
            dir,
            files: result.files,
            details: result.files.map((file) => `  ${file}`).join('\n'),
          };
        },
        timeoutMs: 1800000,
      }),
    );

    // ── install ──────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_project_install',
        description: '在项目里执行 npm install（安装/升级 Remotion 依赖）。首次渲染前必须完成。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
          },
          required: ['project'],
        },
        output: textOut(),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const result = await runNpm({
            args: ['install', '--no-audit', '--no-fund', `--cache=${join(dir, '.npm-cache')}`],
            cwd: dir,
            registry: settings.npmRegistry || undefined,
          });
          return {
            ok: result.code === 0,
            summary: result.code === 0 ? `依赖安装完成：${dir}` : `npm install 失败（exit ${result.code}）`,
            stdout: tail(result.stdout),
            stderr: tail(result.stderr),
          };
        },
        timeoutMs: 2400000,
      }),
    );

    // ── list ─────────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_projects_list',
        description: '列出 projectsDir 下的所有 Remotion 项目（名称、路径、Remotion 版本、依赖是否已安装）。',
        parameters: { type: 'object', additionalProperties: false, properties: {} },
        output: textOut({ projects: { type: 'array', items: { type: 'object' } }, root: { type: 'string' } }, ['projects']),
        async execute() {
          const settings = store.load();
          const projects = listProjects(settings);
          return {
            ok: true,
            summary:
              projects.length === 0
                ? `projectsDir（${settings.projectsDirAbs}）下还没有项目`
                : `${projects.length} 个项目`,
            root: settings.projectsDirAbs,
            projects,
            items: projects.map((p) => `${p.name} · ${p.remotion ?? '未知版本'} ${p.installed ? '已安装依赖' : '未安装'}`),
          };
        },
      }),
    );

    // ── compositions ─────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_compositions',
        description: '列出项目里注册的所有 composition（id / 尺寸 / 时长 / fps）。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            entryPoint: { type: 'string', description: '入口文件，默认 src/index.ts' },
          },
          required: ['project'],
        },
        output: textOut({ compositions: { type: 'string' } }, ['compositions']),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const secrets = await secretsOf(store);
          const entry = args.entryPoint || 'src/index.ts';
          const result = await runRemotionCli({
            settings,
            secrets,
            projectDir: dir,
            args: ['compositions', entry, '--quiet'],
            timeoutMs: 300000,
          });
          const text = `${result.stdout}`.trim() || `${result.stderr}`.trim();
          return {
            ok: result.code === 0,
            summary: result.code === 0 ? '已获取 compositions' : `remotion compositions 失败（exit ${result.code}）`,
            compositions: text,
            details: text,
          };
        },
        timeoutMs: 600000,
      }),
    );

    // ── render ───────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_render',
        description:
          '渲染一个 composition 为视频/音频文件。内部调用官方 `remotion render`，支持 codec、并发、额外 CLI 参数与 props，可满足 Remotion 全部渲染能力。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            compositionId: { type: 'string', description: 'Composition id，例如 Main' },
            entryPoint: { type: 'string', description: '入口文件，默认 src/index.ts' },
            output: { type: 'string', description: '输出路径；留空则写入项目 outDir/<id>.<ext>' },
            codec: { type: 'string', description: '编码，例如 h264 / vp9 / prores / gif / mp3 / wav，默认取设置里的 defaultCodec' },
            props: { type: 'object', description: '传入 composition 的 input props', additionalProperties: true },
            extraFlags: { type: 'string', description: '追加的 CLI 参数，例如 "--crf=16 --audio-codec=aac"' },
            timeoutMs: { type: 'number', description: '覆盖渲染超时（毫秒）' },
          },
          required: ['project', 'compositionId'],
        },
        output: textOut({ outputPath: { type: 'string' }, code: { type: 'number' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const secrets = await secretsOf(store);
          const codec = args.codec || settings.defaultCodec || 'h264';
          const ext = CODEC_EXT[codec] ?? 'mp4';
          const outDir = isAbsolute(settings.outDir) ? settings.outDir : join(dir, settings.outDir || 'out');
          const outputPath = args.output
            ? isAbsolute(args.output)
              ? args.output
              : join(dir, args.output)
            : join(outDir, `${args.compositionId}.${ext}`);
          mkdirSync(dirname(outputPath), { recursive: true });

          const cliArgs = ['render', args.entryPoint || 'src/index.ts', args.compositionId, outputPath, `--codec=${codec}`];
          if (settings.concurrency > 0) cliArgs.push(`--concurrency=${settings.concurrency}`);
          if (args.props && Object.keys(args.props).length > 0) {
            const propsFile = join(dir, '.dsh-props.json');
            writeFileSync(propsFile, JSON.stringify(args.props), 'utf8');
            cliArgs.push(`--props=${propsFile}`);
          }
          cliArgs.push(...flags(settings.extraRenderFlags), ...flags(args.extraFlags));

          const result = await runRemotionCli({
            settings,
            secrets,
            projectDir: dir,
            args: cliArgs,
            timeoutMs: args.timeoutMs ?? settings.timeoutMs,
          });
          const ok = result.code === 0 && existsSync(outputPath);
          return {
            ok,
            summary: ok
              ? `渲染完成：${outputPath}`
              : `渲染失败（exit ${result.code}${result.timedOut ? '，已超时' : ''}）`,
            outputPath: ok ? outputPath : '',
            code: result.code ?? -1,
            stdout: tail(result.stdout),
            stderr: tail(result.stderr),
          };
        },
        timeoutMs: 3600000,
      }),
    );

    // ── still ────────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_still',
        description: '渲染单帧图片（PNG/JPEG）用于预览，调用官方 `remotion still`。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            compositionId: { type: 'string', description: 'Composition id' },
            entryPoint: { type: 'string', description: '入口文件，默认 src/index.ts' },
            frame: { type: 'number', description: '第几帧，默认 0' },
            output: { type: 'string', description: '输出图片路径，默认 out/<id>-frame.png' },
            props: { type: 'object', description: 'input props', additionalProperties: true },
          },
          required: ['project', 'compositionId'],
        },
        output: textOut({ outputPath: { type: 'string' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const secrets = await secretsOf(store);
          const outDir = isAbsolute(settings.outDir) ? settings.outDir : join(dir, settings.outDir || 'out');
          const outputPath = args.output
            ? isAbsolute(args.output)
              ? args.output
              : join(dir, args.output)
            : join(outDir, `${args.compositionId}-frame${args.frame ?? 0}.png`);
          mkdirSync(dirname(outputPath), { recursive: true });
          const cliArgs = ['still', args.entryPoint || 'src/index.ts', args.compositionId, outputPath, `--frame=${args.frame ?? 0}`];
          if (args.props && Object.keys(args.props).length > 0) {
            const propsFile = join(dir, '.dsh-props.json');
            writeFileSync(propsFile, JSON.stringify(args.props), 'utf8');
            cliArgs.push(`--props=${propsFile}`);
          }
          const result = await runRemotionCli({ settings, secrets, projectDir: dir, args: cliArgs, timeoutMs: 600000 });
          const ok = result.code === 0 && existsSync(outputPath);
          return {
            ok,
            summary: ok ? `已渲染静帧：${outputPath}` : `渲染静帧失败（exit ${result.code}）`,
            outputPath: ok ? outputPath : '',
            stdout: tail(result.stdout),
            stderr: tail(result.stderr),
          };
        },
        timeoutMs: 900000,
      }),
    );

    // ── studio ───────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_studio',
        description:
          '在后台启动项目自带的 Remotion Studio（官方预览/时间轴编辑器）并返回访问地址；就绪后按设置自动用浏览器打开。同一项目重复调用会复用已启动的实例。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            port: { type: 'number', description: '端口，默认 3111（与创作面板共用）' },
          },
          required: ['project'],
        },
        output: textOut({ url: { type: 'string' }, pid: { type: 'number' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const secrets = await secretsOf(store);
          const result = await startStudio({ dir, settings, secrets, port: args.port });
          const opening = result.started && result.autoOpen ? '（就绪后会自动在浏览器打开）' : '';
          return {
            ok: true,
            summary: result.started
              ? `Remotion Studio 已启动：${result.url}${opening}`
              : `Studio 已在运行：${result.url}`,
            url: result.url,
            pid: result.pid ?? 0,
          };
        },
      }),
    );

    // ── CLI passthrough ──────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_cli',
        description:
          'Remotion CLI 透传：直接以官方 CLI 参数执行任意受支持子命令（render/still/bundle/compositions/benchmark/ffmpeg/ffprobe/versions/upgrade/browser/lambda/cloudrun/gpu/record 等）。当上面的封装工具不够用时用它，Args 会原样传给 CLI。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            args: { type: 'array', items: { type: 'string' }, description: '完整 CLI 参数，第一项是子命令，例如 ["render","src/index.ts","Main","out/a.mp4"]' },
            timeoutMs: { type: 'number', description: '超时毫秒数' },
          },
          required: ['project', 'args'],
        },
        output: textOut({ code: { type: 'number' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const secrets = await secretsOf(store);
          const argv = Array.isArray(args.args) ? args.args.map(String) : [];
          if (argv.length === 0) throw new Error('args 不能为空');
          const sub = argv[0];
          if (!CLI_SUBCOMMANDS.includes(sub)) {
            throw new Error(`不支持的子命令：${sub}。可用：${CLI_SUBCOMMANDS.join(', ')}`);
          }
          const result = await runRemotionCli({
            settings,
            secrets,
            projectDir: dir,
            args: argv,
            timeoutMs: args.timeoutMs ?? settings.timeoutMs,
          });
          return {
            ok: result.code === 0,
            summary: `remotion ${sub} ${result.code === 0 ? '成功' : `失败（exit ${result.code}${result.timedOut ? '，已超时' : ''}）`}`,
            code: result.code ?? -1,
            stdout: tail(result.stdout, 6000),
            stderr: tail(result.stderr, 6000),
          };
        },
        timeoutMs: 3600000,
      }),
    );

    // ── TTS ──────────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_tts',
        description:
          '用设置页配置的 TTS 服务商合成配音，并保存为项目 public/tts 下的音频文件（可在 composition 里用 staticFile 引用）。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            text: { type: 'string', description: '要合成的文本' },
            name: { type: 'string', description: '文件名（不含扩展名），默认 voice-<时间戳>' },
            voice: { type: 'string', description: '覆盖设置里的音色' },
            format: { type: 'string', description: '覆盖输出格式，默认 mp3' },
            model: { type: 'string', description: '覆盖设置里的模型' },
          },
          required: ['project', 'text'],
        },
        output: textOut({ path: { type: 'string' }, publicPath: { type: 'string' }, bytes: { type: 'number' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const provider = store.providerConfig('tts');
          if (!provider.baseURL) {
            throw new Error('还没有配置配音服务：请在 设置 → Remotion 影棚 → 配音服务 里填写 baseURL、模型与 API Key');
          }
          const apiKey = await store.readSecret('tts');
          const format = args.format || provider.format || 'mp3';
          const name = args.name || `voice-${Date.now()}`;
          const outFile = assetPath(dir, 'tts', name, format);
          const result = await synthesizeSpeech({
            provider,
            apiKey,
            text: args.text,
            outFile,
            voice: args.voice,
            format,
            model: args.model,
          });
          // The saved file may not carry the requested extension (provider format wins).
          const savedPath = result.path ?? outFile;
          const savedName = basename(savedPath);
          return {
            ok: true,
            summary: `配音已生成：${savedPath}（${Math.round(result.bytes / 1024)} KB）`,
            path: savedPath,
            publicPath: `staticFile('tts/${savedName}')`,
            bytes: result.bytes,
          };
        },
        timeoutMs: 300000,
      }),
    );

    // ── image ────────────────────────────────────────────────────────────────
    disposers.push(
      tool({
        name: 'remotion_image',
        description:
          '用设置页配置的生图服务商生成图片，保存为项目 public/images 下的文件（composition 里用 staticFile 引用）。',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project: { type: 'string', description: '项目名或绝对路径' },
            prompt: { type: 'string', description: '图片描述' },
            name: { type: 'string', description: '文件名（不含扩展名）' },
            size: { type: 'string', description: '尺寸，例如 1024x1024' },
            model: { type: 'string', description: '覆盖设置里的模型' },
            format: { type: 'string', description: '文件扩展名，默认 png' },
          },
          required: ['project', 'prompt'],
        },
        output: textOut({ path: { type: 'string' }, publicPath: { type: 'string' }, bytes: { type: 'number' } }),
        async execute(args) {
          const settings = store.load();
          const dir = resolveProject(settings, args.project);
          const provider = store.providerConfig('image');
          if (!provider.baseURL) {
            throw new Error('还没有配置生图服务：请在 设置 → Remotion 影棚 → 生图服务 里填写 baseURL、模型与 API Key');
          }
          const apiKey = await store.readSecret('image');
          const format = args.format || 'png';
          const name = args.name || `image-${Date.now()}`;
          const outFile = assetPath(dir, 'images', name, format);
          const result = await generateImage({
            provider,
            apiKey,
            prompt: args.prompt,
            outFile,
            size: args.size,
            model: args.model,
          });
          // The provider may return JPEG under a .png request; report the real file.
          const savedPath = result.path ?? outFile;
          const savedName = basename(savedPath);
          return {
            ok: true,
            summary: `图片已生成：${savedPath}（${Math.round(result.bytes / 1024)} KB）`,
            path: savedPath,
            publicPath: `staticFile('images/${savedName}')`,
            bytes: result.bytes,
          };
        },
        timeoutMs: 300000,
      }),
    );

    return () => {
      for (const dispose of disposers) {
        try {
          dispose?.();
        } catch (error) {
          logger?.warn?.(`[remotion-studio] tool dispose failed: ${String(error?.message ?? error)}`);
        }
      }
      stopAllStudios();
    };
  });
}