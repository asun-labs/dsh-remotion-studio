# Remotion 影棚（remotion-studio）

用**官方 Remotion** 把代码渲染成视频。Remotion 源码零修改：所有能力都来自项目内的
`node_modules/@remotion/cli`，本插件只做三件事——调用、配置、把产物交回对话。

## 什么时候用这个 skill

- 用户要做「一段视频 / 动画 / 片头 / 字幕视频 / 数据可视化动画 / 宣传片」；
- 用户要在已有 Remotion 工程里加 composition、改参数、出静帧或整片；
- 用户要配音（TTS）、配图（生图）并合成进视频；
- 用户要预览、拖时间轴调试 → `remotion_studio`（会自己开浏览器）。

不要在还没有项目的时候一上来就 `remotion_render`。

## 三层结构（为什么是「插件 + 工具 + skill」）

| 层 | 在 DSH 里的形态 | 管什么 |
| --- | --- | --- |
| 插件 bundle | `package.json` 的 `dsh.bundle` + `index.js` + `client.js` | 接入形态：Host 服务、工具注册、设置页、loopback 路由 |
| 工具层 | `ctx.tools.register(...)`，11 个 `remotion_*` | 给 agent 的动作，DSH 里等价于 MCP 的 tool 面；不需要额外 MCP 进程 |
| Skill 层 | `ctx.skills.register(...)` → 本文件 | 说明书：何时用、怎么用、坑在哪 |

DSH 没有独立的「MCP 服务器」环节：工具直接注册进 Host 的工具注册表，模型拿到的就是同一套
schema；外部 MCP server 的工具也走这张表。

## 标准流程

1. `remotion_doctor` —— 首次使用或渲染报错时先自检（node / npm / projectsDir / 项目内 CLI / chrome / 服务商配置）。
2. `remotion_project_create { name, install: true }` —— 生成**官方标准工程**（9 个文件）并装依赖。
   首次需要联网：`npm install` 拉 `remotion` + `@remotion/cli`，首次渲染还要下载 131MB
   Chrome Headless Shell。
3. 用 `read` / `edit` / `write` 直接改项目源码：`src/Root.tsx` 注册 composition，
   `src/Composition.tsx` 写画面。
4. `remotion_compositions { project }` —— 确认 composition 的 id / 尺寸 / 时长 / fps。
   **id 写错是最常见失败原因**，先列出来再渲染。
5. `remotion_still { project, compositionId, frame }` —— 先出一张静帧看构图，比整片快得多。
6. `remotion_render { project, compositionId, props }` —— 出片到 `<项目>/out/`（或设置里的 outDir）。
7. 把产物的**绝对路径**回报给用户；用户要预览就让 `remotion_studio`。

## 工具速查

| 工具 | 必填参数 | 说明 |
| --- | --- | --- |
| `remotion_doctor` | – | 环境自检；传 `project` 连项目一起查 |
| `remotion_project_create` | `name` | `install:true` 顺带装依赖，`force:true` 覆盖已有目录 |
| `remotion_project_install` | `project` | 在项目里 `npm install` |
| `remotion_projects_list` | – | 列出项目、Remotion 版本、依赖是否装好 |
| `remotion_compositions` | `project` | 列出 composition（id / 尺寸 / 时长 / fps） |
| `remotion_render` | `project`, `compositionId` | 可加 `codec` / `props` / `extraFlags` / `output` / `timeoutMs` |
| `remotion_still` | `project`, `compositionId` | 单帧图片，`frame` 默认 0 |
| `remotion_studio` | `project` | 后台启动官方 Studio，就绪后按设置自动开浏览器；同项目复用实例 |
| `remotion_cli` | `project`, `args` | 官方 CLI 原样透传：render / still / bundle / compositions / benchmark / ffmpeg / ffprobe / versions / upgrade / browser / lambda / cloudrun / gpu / record / help |
| `remotion_tts` | `project`, `text` | 生成 `public/tts/<name>.<fmt>`，回 `staticFile('tts/…')` |
| `remotion_image` | `project`, `prompt` | 生成 `public/images/<name>.<fmt>`，回 `staticFile('images/…')` |

`project` 既可以是项目名（相对 projectsDir），也可以是绝对路径。
官方旗标不知道怎么写时，用 `remotion_cli { args: ["render", "--help"] }` 查权威列表，
或用 `extraFlags`（引号感知切分，如 `"--crf=16 --audio-codec=aac"`）。

## 工程结构与 composition 写法

```
<project>/
  package.json  tsconfig.json  remotion.config.ts
  src/index.ts        # registerRoot(RemotionRoot)
  src/Root.tsx        # <Composition id=... component=... durationInFrames fps width height defaultProps />
  src/Composition.tsx # 画面本体
  src/dsh/providers.ts# 配音/生图桥（见下节）
  public/             # staticFile() 的根
  out/                # 渲染产物
```

- 一帧一个 `useCurrentFrame()`，时间点用 `interpolate` / `spring` 算，不要用 `setTimeout`。
- 素材用 `staticFile('xx.png')` 引用 `public/`；外部 URL 也可以，但会受 CORS 影响。
- 想加第二个视频：在 `Root.tsx` 里再写一个 `<Composition>`，id 唯一。
- 渲染参数也可以写进 `remotion.config.ts`（官方 API，如 `Config.setVideoImageFormat('jpeg')`），
  但**不要**为了插件去改 Remotion 自己的文件。

## 配音 / 配图的三条路径

设置页（设置 → Remotion 影棚）里配置 TTS 与生图服务商，密钥存在 DSH credentials 里，
不进项目文件。配音与生图各有一个**接口协议**下拉，按服务商选对即可，请求体与响应解析
由插件内部适配：

| 协议 | baseURL 示例 | 默认接口路径 | 说明 |
| --- | --- | --- | --- |
| `auto`（默认） | 任意 | 各协议默认端点 | 依次试 openai → openspeech → dashscope → ark，哪种返回真实音频/图片就用哪种 |
| `openai` | `https://api.openai.com/v1` | `/audio/speech`、`/images/generations` | 各家聚合站、自建 vLLM/Ollama 也走这个 |
| `dashscope` | `https://dashscope.aliyuncs.com` 或 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com` | `/api/v1/services/aigc/multimodal-generation/generation`（TTS 也可用 `/api/v1/services/audio/tts/SpeechSynthesizer`） | 阿里百炼，返回里是音频/图片 URL，插件自动下载；TTS 可另填 `language`（`Chinese`/`English`） |
| `tokenplan` | `https://token-plan.cn-beijing.maas.aliyuncs.com`（**不要**带 `/apps/anthropic`） | TTS `/api/v1/services/audio/tts/SpeechSynthesizer`、生图 `/api/v1/services/aigc/multimodal-generation/generation` | 阿里云 Token Plan 订阅套餐（`sk-sp-` Key）。音色必须用套餐音色名（如 `longanhuan_v3.6`）；生图尺寸写 `1024*1024`；`Cherry` 这类百炼音色会报 `[cosyvoice:]Engine error [411]` |
| `ark` | `https://ark.cn-beijing.volces.com/api/plan/v3` | `/images/generations` | 火山方舟生图，`data[0].url` 约 24 小时有效；**必须用 Agent Plan 专属 Key**，baseURL 含 `/plan` |
| `openspeech` | `https://openspeech.bytedance.com` | `/api/v3/tts/unidirectional` | 火山语音 TTS，鉴权头 `x-api-key`，`req_params{text,speaker,audio_params}`，返回 base64 音频 |

接口路径留空 = 用该协议的默认端点；只有服务商文档给了特殊路径时才填。
`extraBody` 会合并进请求体，专门用来塞服务商特有参数。

1. **推荐：先出素材，再当静态资源用**
   `remotion_tts` / `remotion_image` 生成文件到 `public/tts`、`public/images`，
   composition 里 `<Audio src={staticFile('tts/x.mp3')} />`、`<Img src={staticFile('images/y.png')} />`。
   最稳、可重复渲染、产物可交付。
2. **运行期生成：composition 内 `speak()` / `generateImage()`**（`src/dsh/providers.ts`）
   适合「每个 props 都要不同配音」的场景。渲染时请求走 Host 的 loopback 桥
   `/dsh-remotion/bridge`（凭 `public/dsh-providers.json` 里的 url + token），
   真正的服务商调用发生在 Host 侧，**密钥不出宿主**，也绕开浏览器 CORS。
   用了就必须 `delayRender()` / `continueRender()` 包住（见坑 1）。
3. **兜底：浏览器直连**，仅当桥不可用时才会走，此时才可能把 key 写进 `public/dsh-providers.json`。

## props 与编码

- `props` 会写到项目根 `.dsh-props.json` 并作为 `--props=<file>` 传给 CLI（已在 .gitignore）。
- `codec` 决定扩展名：h264→mp4、vp9→webm、prores→mov、gif→gif、mp3/wav→纯音频。
- 并发默认交给 Remotion 自己算；只有设置里 `concurrency > 0` 才会传 `--concurrency`。

## 常见坑（都是实测踩过的）

1. **异步没等**：composition 里 `await` 出来的数据必须用 `delayRender()` 拿到 handle、
   `finally` 里 `continueRender(handle)`，否则渲染会在 Promise 完成前结束，错误还会被
   `catch` 吞掉——表现就是「服务商一个请求都没收到」。
2. **图太小被拒**：8×8 或调色板 PNG 会被 Remotion `Img` 的重试机制判为加载失败
   （`Error loading image with src: ... Failed 3 times (maxRetries: 2)`），用真实尺寸的图。
3. **音频必须是真容器**：`<Audio>` 的音频会被 ffprobe 校验，伪造的字节会报
   `Invalid data found when processing input` / `get-audio-channels.js` 失败。
4. **`Config.setConcurrency(undefined)` 会炸**：日志出现 `Concurrency NaNx`，随后
   `RangeError: Invalid array length`。别设，或设正整数。
5. **用本机 Chrome**：设置里 `chromeMode=path` + 填 `chromePath`，插件会映射到官方
   `--browser-executable`；路径不存在时报 `"browserExecutable" was specified as '...' but the path doesn't exist.`
6. **`response_format: 'b64_json'` 不是所有模型都吃**（例如 gpt-image-1 会 400），直连时别硬写。
7. **协议选错只是报错，不会静默失败**：显式选协议时错误以 `请求失败（协议名）：…` 开头；
   `auto` 会列出每个协议各自的失败原因（`所有接口协议都没成功（A / B / C）`）。
8. **接口路径留空才用协议默认端点**：老版本会把 `/audio/speech`、`/images/generations`
   写进配置文件；如果换了 dashscope/ark/openspeech 却忘了清空路径，会打到错误的地址。
9. **改插件源码后要重载**：`plugin_manager remove_bundle` → `install_bundle`，
   否则旧 Host 模块继续跑（`already-installed` 表示没重载）。
10. **不要动 `node_modules`**：那等于改 Remotion 源码，升级即丢，也破坏「零修改」承诺。
   需要额外能力就用 CLI 透传或 `remotion.config.ts` 的官方 API。

## 官方文档

- 总览 <https://www.remotion.dev/docs>
- CLI render <https://www.remotion.dev/docs/cli/render>
- Composition / 参数 <https://www.remotion.dev/docs/composition>
- `useCurrentFrame` <https://www.remotion.dev/docs/use-current-frame>
- `delayRender` <https://www.remotion.dev/docs/delay-render>
- `<Audio>` <https://www.remotion.dev/docs/audio> · `<Img>` <https://www.remotion.dev/docs/img>
- Chrome 模式 <https://www.remotion.dev/docs/options/chrome-mode>