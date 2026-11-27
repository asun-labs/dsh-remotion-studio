# Remotion 影棚 · 使用与配置

[← 返回作品展示](../README.md) · [运行文档样片](showcase/README.md)

一个 DSH 插件，把 [Remotion](https://github.com/remotion-dev/remotion) 的完整能力接到 DeepSeek Harness 里，
并提供**一个**设置面板让用户自行配置配音（TTS）与生图等模型服务。

## 设计原则：Remotion 源码零修改

- 不 reimplement、不 patch、不 fork Remotion。所有渲染/预览/打包操作都通过**项目内官方 `@remotion/cli`**
  执行（等价于 `npx remotion ...`），所以 Remotion 的全部功能、全部参数、全部升级路径都保持原样。
- 新建项目只是写入一份**标准 Remotion 工程**（`package.json` / `remotion.config.ts` / `src/Root.tsx` …），
  用户可以继续手写 composition、用 Studio、升 Remotion 版本，甚至删掉本插件后项目照常运行。
- 插件只做两件事：定位那个 CLI 并用正确的环境变量运行它；把模型服务配置传给 composition 代码。

## 三层结构：插件 / 工具 / Skill

本插件按宿主的标准形态拆成三层，各层职责不重叠：

| 层 | DSH 机制 | 本插件里是什么 | 谁消费 |
| --- | --- | --- | --- |
| **插件（接入形态）** | bundle + `cordis.patch.yml` | 让 DSH 认识这个包：Host 半边（`index.js`）与 Web 半边（`client.js`） | 宿主 |
| **工具（给 agent 操作）** | `ctx.tools.register()` | 11 个 `remotion_*` 工具 + `/dsh-remotion/api`、`/dsh-remotion/bridge` | 模型（对话中调用） |
| **Skill（说明书）** | `ctx.skills.register()` | `skill/remotion-studio.md`：什么时候用、标准流程、工具速查、坑清单 | 模型（按需读取） |

> 关于 MCP：DSH 宿主的工具注册表（`ctx.tools.register`）就是「给 agent 操作用的工具面」，
> 与本插件同时注册的工具共用同一套调用约定，因此本插件不再额外起一个 MCP server 进程
> （宿主只提供 `mcpResources` 用于消费**已配置的外部** MCP server 资源，没有把工具暴露成 MCP server 的接口）。
> 若你需要把 Remotion 能力供给别的 MCP 客户端，可另起一个薄的 MCP server 转发到这些 CLI 调用。

Skill 与插件的对应关系：

- Skill 在 `index.js` 里通过 `ctx.get('skills').register(...)` 注册，`source: 'runtime'`，
  内容每次从 `skill/remotion-studio.md` 读取，改说明书不用改代码。
- `resourceBase` 指向插件根目录，模型可以把说明书里的相对路径当基准去读。
- 与外部 skill `remotion-video-creation`（29 条 Remotion 领域规则）互补：那份讲「怎么写好画面」，
  这份讲「在这个宿主的插件里怎么跑起来」。

## 工具（由 agent 调用）

| 工具 | 作用 |
| --- | --- |
| `remotion_doctor` | 检查 Node/npm、项目依赖、`remotion versions`、浏览器与模型服务配置 |
| `remotion_project_create` | 在 `projectsDir` 下新建标准 Remotion 工程（可选顺带 `npm install`） |
| `remotion_project_install` | 在项目里 `npm install` |
| `remotion_projects_list` | 列出项目 |
| `remotion_compositions` | 列出 composition（id / 尺寸 / 时长 / fps） |
| `remotion_render` | 渲染视频/音频（codec、props、并发、附加参数） |
| `remotion_still` | 渲染单帧静图 |
| `remotion_studio` | 后台启动官方 Studio 预览 |
| `remotion_cli` | CLI 透传：任意受支持子命令原样执行 |
| `remotion_tts` | 用配置的 TTS 服务合成配音，存到 `public/tts/` |
| `remotion_image` | 用配置的生图服务生成图片，存到 `public/images/` |

## 创作面板（预览与时间轴）

本插件**不往左侧菜单加图标**。创作面板是「在浏览器里打开的官方 Studio 页面」：

- 对话过程中让助手调用 `remotion_studio`（或让助手新建项目后预览），插件会在后台启动该项目自带的
  `remotion studio` 开发服务器，**等页面真正可访问后再自动用系统默认浏览器打开**（默认 3111 端口）。
- 打开的就是 **Remotion 官方前端**：画面预览、**时间轴轨道**、composition 列表、属性/Props 面板、
  逐帧调试、快捷键全部原样，插件只负责启动/复用进程，因此不存在「自己写一个简化版时间轴」带来的功能缩水。
- 开关：`设置 → Remotion 影棚 → 创作面板 → 自动打开浏览器`。关闭后启动 Studio 只返回地址，
  可在设置页点 `启动 Studio` 手动打开。
- 工具与设置页共用同一个进程注册表：谁先启动，另一边直接复用。

> 说明：宿主没有向右侧内置浏览器面板推送 URL 的公开接口（`sidebar.right.pane.tab` 的浏览器标签由内置
> 浏览器自动化驱动），所以这里用系统默认浏览器打开同一个页面。

设置项仍在 `设置 → Remotion 影棚`，两处互不干扰。

## 设置面板

`设置 → Remotion 影棚`（宿主 Web UI 的一个 settings section）：

- **项目与输出**：项目目录、输出目录、默认编码、并发、附加渲染参数、超时、npm 源、
  新建项目使用的 Remotion 版本、浏览器模式（自动下载 / 本机 Chrome）。
- **配音服务**、**生图服务**：**接口协议**下拉 + `baseURL` + 接口路径 + 模型 + 音色/尺寸 +
  附加请求体，以及 **API Key**（存入 Host 的 credential record，不写进设置文件）与「测试连通性」按钮。
- **环境**：一键环境检查、项目目录入口、配置文件位置。已有项目通过创作面板的项目下拉选择。

### 接口协议（各家差异由插件吃掉）

配音与生图各有一个「接口协议」下拉，默认 `auto`（依次探测，哪种返回真实音频/图片就用哪种）：

| 协议 | 典型 `baseURL` | 默认接口路径（留空即用） | 备注 |
| --- | --- | --- | --- |
| `openai` | `https://api.openai.com/v1` | `/audio/speech`、`/images/generations` | 各类 OpenAI 兼容聚合站、自建 vLLM/Ollama |
| `dashscope` | `https://dashscope.aliyuncs.com` | `/api/v1/services/aigc/multimodal-generation/generation`（TTS 亦可用 `/api/v1/services/audio/tts/SpeechSynthesizer`） | 阿里云百炼；响应给的是 URL，插件自动下载；TTS 可填 `language` |
| `tokenplan` | `https://token-plan.cn-beijing.maas.aliyuncs.com` | TTS `/api/v1/services/audio/tts/SpeechSynthesizer`、生图 `/api/v1/services/aigc/multimodal-generation/generation` | 阿里云 Token Plan 订阅套餐（`sk-sp-` Key）。baseURL 带 `/compatible-mode/v1` 也能用（插件自动折算到根地址），但 **不要**带 `/apps/anthropic`（对话专用端点，不提供配音/生图）；音色要用套餐音色名（如 `longanhuan_v3.6`，`Cherry` 会报 `[cosyvoice:]Engine error [411]`）；尺寸写成 `1024*1024` |
| `ark` | `https://ark.cn-beijing.volces.com/api/plan/v3` | `/images/generations` | 火山方舟生图，`data[0].url` 约 24 小时有效；需 Agent Plan 专属 Key |
| `arkplan` | `https://ark.cn-beijing.volces.com`（或带 `/api/plan/v3`） | 生图 `/api/plan/v3/images/generations`、TTS `/api/v3/plan/tts/unidirectional` | 火山方舟 Agent Plan 订阅套餐（`ark-` Key）。路径必须含 `/plan`，用 `/api/v3` 会静默走按量付费；生图模型 `doubao-seedream-5.0-pro` / `-flash`，**尺寸面积需 ≥ 921600 px（`1024x1024` 会被拒，用 `2048x2048` 或 `2K`）**；配音固定走 `openspeech.bytedance.com` 且必须带 `x-api-resource-id: seed-tts-2.0`（填模型名会报 `requested resource not granted`），响应是 NDJSON 多行 base64 块（插件已合并），模型 `doubao-seed-tts-2.0`，音色如 `zh_female_gaolengyujie_uranus_bigtts`；报 `AgentPlanDeductNotEnabled` 表示控制台未打开抵扣开关 |
| `openspeech` | `https://openspeech.bytedance.com` | `/api/v3/tts/unidirectional` | 火山语音 TTS，`x-api-key` 鉴权，`req_params{text,speaker,audio_params}` |

选错协议不会静默失败：显式选协议时错误以 `请求失败（协议名）：…` 开头，`auto` 则列出每个协议的失败原因。
需要服务商特有参数时，把 JSON 写进「附加请求体」，插件会合并进请求体。

非密钥设置保存在 `~/.dsh/remotion-studio/settings.json`；密钥通过 `credentials` 服务的
`remotion-studio.tts` / `remotion-studio.image` record 管理（该服务不可用时回退到设置文件内的 `_secrets`）。

## composition 里怎么用配音/配图

浏览器里跑 composition 时读不到宿主进程的环境变量（Remotion 的 webpack 只内联 `NODE_ENV`），
所以插件用**两级桥接**把设置面板里的服务商送到 composition：

1. 渲染/预览前，插件在项目里写一份 `public/dsh-providers.json`（模型名、音色、尺寸等非密钥配置，
   以及一个**进程级随机 token**）。composition 用 `staticFile()` 读它，无需打包期注入。
2. composition 调用时把请求发给宿主侧的 loopback 代理 `POST /dsh-remotion/bridge`
   （带 `x-dsh-token`）。真正的服务商调用在 Host 里完成，**桥接可用时 API Key 不传给 composition 浏览器**，
   同时绕开服务商普遍不允许浏览器直连的 CORS 限制。音频/图片以 base64 回给 composition。
3. 只有桥不可用（例如用户自己 `npx remotion render`）时，才退回浏览器直连，此时才把 key 写进该 json。

项目里的 `src/dsh/providers.ts` 已经把这一切封装好：

```tsx
import { speak, generateImage, hasTtsProvider } from './dsh/providers';
import { Audio, Img } from 'remotion';

const voice = await speak('你好，世界');            // 返回 data URL，直接给 <Audio src>
const image = await generateImage('一只在雨中打伞的猫'); // 返回 data URL，直接给 <Img src>
```

记得用 `delayRender()` / `continueRender()` 把异步生成包住，否则 Remotion 会在结果回来之前就截帧。

若用户手动在项目目录执行官方 CLI，插件导出的环境变量同样可用：`DSH_TTS_BASE_URL` / `_PATH` /
`_MODEL` / `_VOICE` / `_FORMAT` / `_API_KEY` / `_EXTRA_BODY` 以及对应的 `DSH_IMAGE_*`。

## 文件结构

```
index.js            Host 半边：注册工具 + 设置接口 + 服务商桥 + Skill
client.js           Web 半边：设置面板（含创作面板卡片：启动 Studio / 自动打开浏览器）
skill/remotion-studio.md  Skill 说明书（给模型读的流程与坑清单）
src/skill.js        Skill 注册（读说明书 → ctx.skills.register）
src/settings.js     设置与密钥存储
src/runner.js       Remotion CLI 定位、进程执行、dsh-providers.json 生成
src/providers.js    TTS / 生图多协议适配（openai / dashscope / tokenplan / ark / arkplan / openspeech + auto）
src/scaffold.js     标准 Remotion 工程模板
src/tools.js        agent 工具定义
src/api.js          /dsh-remotion/api 设置与 Studio 接口 + /dsh-remotion/bridge 服务商代理
src/bridge.js       桥的地址与 token
src/studio.js       `remotion studio` 进程注册表（工具与设置页共用）+ 浏览器打开
```

## 已知前提

- 首次渲染需要联网下载 Remotion 的 Headless Shell（或在设置里指定本机 Chrome）。
- Studio 首次启动要构建一次前端（通常 10–40 秒），就绪后才自动打开浏览器；之后复用同一进程。
- 项目依赖通过 `npm install` 安装，不使用插件自带依赖，因此插件本身零第三方依赖、加载失败风险最低。
