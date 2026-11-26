/**
 * Web half of remotion-studio: one settings page (设置 → Remotion 影棚).
 *
 * Rendered as plain React inside the harness (no iframe), styled exclusively
 * with `--dsw-alias-*` theme tokens, talking to the Host over the same-origin
 * `/dsh-remotion/api` endpoint registered by src/api.js.
 *
 * Layout contract: the settings shell owns the scrolling column, so the page
 * contributes content only. Nothing here is `position: sticky/fixed`, and the
 * save controls sit inline at the end of the content — a sticky footer both
 * painted over the next card and ended up below the viewport once the shell's
 * own scroll (and the composer overlay under the modal) took part.
 */
window.__ModuleLoader__.load({
  id: 'remotion-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'remotion-studio';
    const API = '/dsh-remotion/api';

    const DICT = {
      zh: {
        nav: 'Remotion 影棚',
        title: 'Remotion 影棚',
        subtitle: '基于官方 Remotion 的视频生成环境：项目、渲染、配音与配图。',
        save: '保存',
        saving: '保存中…',
        reset: '恢复默认',
        saved: '设置已保存',
        discard: '放弃修改',
        unsaved: '有未保存的修改',
        loadFailed: '读取设置失败',
        groupProject: '项目与输出',
        groupTts: '配音服务（TTS）',
        groupImage: '生图服务',
        groupStatus: '环境',
        projectsDir: '项目目录',
        projectsDirHint: '项目存放目录，支持 ~ 开头',
        outDir: '输出目录',
        outDirHint: '相对路径相对项目目录，例如 out',
        codec: '默认编码',
        concurrency: '并发数',
        concurrencyHint: '0 表示由 Remotion 决定',
        extraFlags: '附加渲染参数',
        extraFlagsHint: '例如 --crf=16 --audio-codec=aac',
        timeout: '渲染超时（毫秒）',
        registry: 'npm 源',
        version: '新建项目使用的 Remotion 版本',
        chrome: '浏览器',
        chromeDownload: '由 Remotion 自动下载',
        chromePath: '使用本机 Chrome',
        chromePathLabel: 'Chrome 可执行文件路径',
        baseURL: '服务地址（baseURL）',
        path: '接口路径',
        pathHint: '留空用协议默认端点',
        protocol: '接口协议',
        proto_auto: '自动识别（推荐）',
        proto_openai: 'OpenAI 兼容',
        proto_dashscope: '阿里云百炼 DashScope',
        proto_tokenplan: '阿里云 Token Plan（订阅套餐）',
        proto_ark: '火山方舟 Ark',
        proto_arkplan: '火山方舟 Agent Plan（订阅套餐）',
        proto_openspeech: '火山语音 openspeech',
        protoHint_auto: '不确定就选这个，插件挨个试。',
        protoHint_openai: '按量付费的 OpenAI 兼容 API（sk- 开头）。',
        protoHint_dashscope: '按量付费的阿里云 key（sk- 开头，dashscope 域名）。',
        protoHint_tokenplan: '阿里云订阅套餐 key（sk-sp- 开头，token-plan 域名）。',
        protoHint_ark: '按量付费的火山方舟 key（/api/v3 路径）。',
        protoHint_arkplan: '火山方舟订阅套餐 key（ark- 开头，/api/plan 路径）。',
        protoHint_openspeech: '火山语音服务（openspeech 域名，仅配音）。',
        model: '模型',
        voice: '音色',
        format: '输出格式',
        language: '语言（可选）',
        languageHint: '仅 Qwen-TTS 用，其他留空',
        size: '图片尺寸',
        resourceId: '资源 ID（可选）',
        customValue: '自定义',
        extraBody: '附加请求体（JSON）',
        extraBodyHint: '合并进请求 body',
        apiKey: 'API Key',
        keySet: '已配置',
        keyUnset: '未配置',
        saveKey: '保存密钥',
        clearKey: '清除',
        test: '测试连通性',
        testing: '测试中…',
        doctor: '检查环境',
        checking: '检查中…',
        groupStatus: '环境',
        noProjects: '还没有项目，让助手新建。',
        settingsFile: '配置文件',
        runtime: '运行环境',
        emptyBase: '不配服务商也能渲染，只是不能自动配音/配图。',
        keySaved: '密钥已保存',
        keyCleared: '密钥已清除',
        resetDone: '已恢复默认设置',
        openDir: '打开项目目录',
        creator: '创作面板',
        groupStudio: '创作面板（预览与时间轴）',
        groupStudioHint: '启动官方 studio，就绪后自动打开浏览器。',
        autoOpen: '自动打开浏览器',
        autoOpenHint: '就绪后自动打开系统浏览器。',
        studioProject: '项目',
        studioOpened: 'Studio 已打开：',
        studioStarting: '正在启动 Studio…',
        studioReady: 'Studio 已就绪',
        studioStopped: '未启动',
        studioFailed: '启动失败',
        studioStart: '启动 Studio',
        studioReload: '刷新画面',
        studioOpenTab: '新标签打开',
        studioStop: '停止',
        studioEmpty: '选一个项目，这里会载入官方 Remotion Studio。',
        studioNoProject: '还没有项目，让助手新建。',
        studioSettingsHint: '配音 / 生图在 设置 → Remotion 影棚 配置。',
      },
      en: {
        nav: 'Remotion Studio',
        title: 'Remotion Studio',
        subtitle: 'Video production on top of official Remotion: projects, rendering, voice-over and images.',
        save: 'Save',
        saving: 'Saving…',
        reset: 'Reset to defaults',
        saved: 'Settings saved',
        discard: 'Discard changes',
        unsaved: 'Unsaved changes',
        loadFailed: 'Failed to load settings',
        groupProject: 'Projects & output',
        groupTts: 'Text to speech',
        groupImage: 'Image generation',
        groupStatus: 'Environment',
        projectsDir: 'Projects directory',
        projectsDirHint: 'Where projects live; ~ is expanded',
        outDir: 'Output folder',
        outDirHint: 'Relative to the project, e.g. out',
        codec: 'Default codec',
        concurrency: 'Concurrency',
        concurrencyHint: '0 lets Remotion decide',
        extraFlags: 'Extra render flags',
        extraFlagsHint: 'e.g. --crf=16 --audio-codec=aac',
        timeout: 'Render timeout (ms)',
        registry: 'npm registry',
        version: 'Remotion version for new projects',
        chrome: 'Browser',
        chromeDownload: 'Downloaded by Remotion',
        chromePath: 'Local Chrome',
        chromePathLabel: 'Chrome executable path',
        baseURL: 'Base URL',
        path: 'Endpoint path',
        pathHint: 'Blank = protocol default',
        protocol: 'Wire protocol',
        proto_auto: 'Auto-detect (recommended)',
        proto_openai: 'OpenAI-compatible',
        proto_dashscope: 'Alibaba DashScope',
        proto_tokenplan: 'Alibaba Token Plan (subscription)',
        proto_ark: 'Volcengine Ark',
        proto_arkplan: 'Volcengine Ark Agent Plan (subscription)',
        proto_openspeech: 'Volcengine openspeech',
        protoHint_auto: 'Not sure? Pick this — the plugin tries each in turn.',
        protoHint_openai: 'Pay-as-you-go OpenAI-compatible API (sk- keys).',
        protoHint_dashscope: 'Pay-as-you-go Alibaba Cloud key (sk-, dashscope domain).',
        protoHint_tokenplan: 'Alibaba subscription key (sk-sp-, token-plan domain).',
        protoHint_ark: 'Pay-as-you-go Volcengine Ark key (/api/v3 paths).',
        protoHint_arkplan: 'Volcengine Ark subscription key (ark-, /api/plan paths).',
        protoHint_openspeech: 'Volcengine speech service (openspeech domain, speech only).',
        model: 'Model',
        voice: 'Voice',
        format: 'Format',
        language: 'Language (optional)',
        languageHint: 'Qwen-TTS only; leave blank otherwise',
        size: 'Image size',
        resourceId: 'Resource ID (optional)',
        customValue: 'Custom',
        extraBody: 'Extra request body (JSON)',
        extraBodyHint: 'Merged into the request body',
        apiKey: 'API key',
        keySet: 'Configured',
        keyUnset: 'Not configured',
        saveKey: 'Save key',
        clearKey: 'Clear',
        test: 'Test connection',
        testing: 'Testing…',
        doctor: 'Check environment',
        checking: 'Checking…',
        noProjects: 'No projects yet — ask the assistant to scaffold one.',
        settingsFile: 'Settings file',
        runtime: 'Runtime',
        emptyBase: 'Rendering works without a provider — only voice-over and images need one.',
        keySaved: 'API key saved',
        keyCleared: 'API key cleared',
        resetDone: 'Defaults restored',
        openDir: 'Open projects folder',
        creator: 'Creator',
        groupStudio: 'Creator panel (preview & timeline)',
        groupStudioHint: 'Starts the official studio and opens your browser.',
        autoOpen: 'Open browser automatically',
        autoOpenHint: 'Open your browser once the Studio is ready.',
        studioProject: 'Project',
        studioOpened: 'Studio opened:',
        studioStarting: 'Starting Studio…',
        studioReady: 'Studio ready',
        studioStopped: 'Not running',
        studioFailed: 'Start failed',
        studioStart: 'Start Studio',
        studioReload: 'Reload view',
        studioOpenTab: 'Open in new tab',
        studioStop: 'Stop',
        studioEmpty: 'Pick a project to load the official Remotion Studio.',
        studioNoProject: 'No project yet — ask the assistant to scaffold one.',
        studioSettingsHint: 'Providers live in Settings → Remotion Studio.',
      },
    };

    const css = `
.dshrs-root{display:flex;flex-direction:column;gap:18px;width:100%;max-width:720px;font-size:13px;color:var(--dsw-alias-label-primary,#0f1115)}
.dshrs-head{display:flex;flex-direction:column;gap:6px}
.dshrs-title{font-size:14px;font-weight:600;line-height:22px}
.dshrs-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);line-height:1.6}
.dshrs-card{border:1px solid var(--dsw-alias-border-l2,#ffffff1f);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);padding:16px;display:flex;flex-direction:column;gap:12px}
.dshrs-card-title{font-size:13px;font-weight:600}
.dshrs-row{display:flex;align-items:flex-start;gap:12px}
.dshrs-label{width:190px;flex:none;font-size:12px;color:var(--dsw-alias-label-secondary,#4b5563);padding-top:7px;line-height:1.5}
.dshrs-control{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.dshrs-input,.dshrs-select,.dshrs-area{width:100%;box-sizing:border-box;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#ffffff1f);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#0f1115);font-size:13px;font-family:inherit;outline:none}
.dshrs-input::placeholder{color:var(--dsw-alias-state-idle-primary,#9ca3af)}
.dshrs-select option{background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#0f1115)}
.dshrs-area{height:68px;padding:8px 10px;resize:vertical;line-height:1.5}
.dshrs-box{width:16px;height:16px;margin-top:8px;accent-color:var(--dsw-alias-brand-primary,#0f1115);cursor:pointer}
.dshrs-input:focus,.dshrs-select:focus,.dshrs-area:focus{border-color:var(--dsw-alias-border-l1,#9ca3af)}
.dshrs-hint{font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);line-height:1.5}
.dshrs-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dshrs-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border-radius:16px;border:1px solid var(--dsw-alias-border-l2,#ffffff1f);background:transparent;color:var(--dsw-alias-label-primary,#0f1115);font-size:12px;line-height:1;cursor:pointer;font-family:inherit;white-space:nowrap}
.dshrs-btn:hover{background:var(--dsw-alias-bg-layer-2,#0000000f)}
.dshrs-btn:disabled{opacity:.45;cursor:default}
.dshrs-btn:disabled:hover{background:transparent}
.dshrs-btn-primary{background:var(--dsw-alias-brand-primary,#0f1115);border-color:transparent;color:var(--dsw-alias-bg-base,#fff)}
.dshrs-btn-primary:hover{opacity:.88;background:var(--dsw-alias-brand-primary,#0f1115);color:var(--dsw-alias-bg-base,#fff)}
.dshrs-btn-primary:disabled:hover{background:var(--dsw-alias-brand-primary,#0f1115)}
.dshrs-btn-sm{height:28px;padding:0 10px;border-radius:14px}
.dshrs-badge{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2,#ffffff1f);color:var(--dsw-alias-label-secondary,#6b7280)}
.dshrs-badge-on{color:var(--dsw-alias-label-primary,#0f1115)}
.dshrs-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding-top:12px;margin-top:2px;border-top:1px solid var(--dsw-alias-border-l2,#ffffff1f)}
.dshrs-foot-msg{margin-right:auto;min-width:0}
.dshrs-msg{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}
.dshrs-msg-err{color:var(--dsw-alias-state-error-primary,#e5484d)}
.dshrs-list{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dshrs-check{display:flex;gap:8px;font-size:12px;line-height:1.6}
.dshrs-preview{max-width:180px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2)}
.dshrs-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all}
`;

    function createT(ctx) {
      const locale = ctx.locale;
      if (locale && typeof locale.bind === 'function' && typeof locale.register === 'function') {
        try {
          ctx.effect(() => locale.register(NS, DICT));
          const bound = locale.bind(NS);
          return (key) => {
            try {
              const value = bound(key);
              return value && value !== key ? value : DICT.zh[key] || key;
            } catch {
              return DICT.zh[key] || key;
            }
          };
        } catch {
          /* fall through */
        }
      }
      return (key) => DICT.zh[key] || key;
    }

    async function call(action, payload) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...(payload ?? {}) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
      if (json && json.ok === false) throw new Error(json.error || '操作失败');
      return json;
    }

    const EDITABLE = [
      'projectsDir',
      'outDir',
      'defaultCodec',
      'concurrency',
      'extraRenderFlags',
      'timeoutMs',
      'npmRegistry',
      'remotionVersion',
      'chromeMode',
      'chromePath',
      'autoOpenStudio',
    ];

    function draftFrom(settings) {
      const draft = {};
      for (const key of EDITABLE) draft[key] = settings[key];
      draft.concurrency = Number(settings.concurrency ?? 0);
      draft.timeoutMs = Number(settings.timeoutMs ?? 3600000);
      draft.autoOpenStudio = settings.autoOpenStudio !== false;
      draft.providers = {
        tts: { ...(settings.providers?.tts ?? {}) },
        image: { ...(settings.providers?.image ?? {}) },
      };
      return draft;
    }

    const CODECS = ['h264', 'h265', 'vp8', 'vp9', 'prores', 'gif', 'mp3', 'wav', 'aac', 'flac'];

    const row = (label, hint, control) =>
      h(
        'div',
        { className: 'dshrs-row' },
        h('div', { className: 'dshrs-label' }, label),
        h('div', { className: 'dshrs-control' }, control, hint ? h('div', { className: 'dshrs-hint' }, hint) : null),
      );

    const input = (value, onChange, extra) =>
      h('input', { className: 'dshrs-input', value: value ?? '', onChange, ...(extra ?? {}) });

    /** `input()` already spreads `value`; drop the duplicate so React keeps it controlled. */
    const fieldInput = (value, onChange, extra) => {
      const { value: _ignored, ...rest } = extra ?? {};
      return h('input', { className: 'dshrs-input', value: value ?? '', onChange, ...rest });
    };

    function SettingsPage() {
      const [snapshot, setSnapshot] = React.useState(null);
      const [draft, setDraft] = React.useState(null);
      const [busy, setBusy] = React.useState('');
      const [message, setMessage] = React.useState('');
      const [error, setError] = React.useState('');
      const [checks, setChecks] = React.useState(null);
      const [tests, setTests] = React.useState({});
      const [secretInput, setSecretInput] = React.useState({ tts: '', image: '' });
      const [studioProject, setStudioProject] = React.useState('');
      const t = (key) => tGlobal(key);

      const applySnapshot = React.useCallback((state) => {
        if (!state) return;
        setSnapshot(state);
        setDraft(draftFrom(state.settings ?? {}));
      }, []);

      const load = React.useCallback(async () => {
        setError('');
        try {
          applySnapshot(await call('getState'));
        } catch (caught) {
          setError(`${tGlobal('loadFailed')}：${String(caught?.message ?? caught)}`);
        }
      }, [applySnapshot]);

      React.useEffect(() => {
        void load();
      }, [load]);

      if (!draft || !snapshot) {
        return h('div', { className: 'dshrs-root' }, h('style', { 'data-plugin-css': NS }, css), h('div', { className: 'dshrs-msg' }, error || '…'));
      }

      const setField = (key) => (event) => {
        const value = event.target.value;
        setDraft((current) => ({ ...current, [key]: key === 'concurrency' || key === 'timeoutMs' ? Number(value) : value }));
        setMessage('');
      };

      const setFlag = (key) => (event) => {
        const checked = Boolean(event.target.checked);
        setDraft((current) => ({ ...current, [key]: checked }));
        setMessage('');
      };

      const setProvider = (provider, key) => (event) => {
        const value = event.target && 'target' in event ? event.target.value : event;
        setDraft((current) => ({
          ...current,
          providers: { ...current.providers, [provider]: { ...current.providers[provider], [key]: value } },
        }));
        setMessage('');
      };

      const save = async () => {
        setBusy('save');
        setError('');
        try {
          const next = await call('saveSettings', { patch: draft });
          applySnapshot(next);
          setMessage(tGlobal('saved'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const reset = async () => {
        setBusy('reset');
        try {
          applySnapshot(await call('reset'));
          setMessage(tGlobal('resetDone'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const saveSecret = async (provider) => {
        setBusy(`key-${provider}`);
        try {
          applySnapshot(await call('setSecret', { provider, value: secretInput[provider] }));
          setSecretInput((current) => ({ ...current, [provider]: '' }));
          setMessage(tGlobal('keySaved'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const clearSecret = async (provider) => {
        setBusy(`key-${provider}`);
        try {
          applySnapshot(await call('clearSecret', { provider }));
          setMessage(tGlobal('keyCleared'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const runTest = async (provider) => {
        setBusy(`test-${provider}`);
        try {
          const result = await call('testProvider', { provider });
          setTests((current) => ({ ...current, [provider]: result }));
        } catch (caught) {
          setTests((current) => ({ ...current, [provider]: { ok: false, detail: String(caught?.message ?? caught) } }));
        } finally {
          setBusy('');
        }
      };

      const runDoctor = async () => {
        setBusy('doctor');
        try {
          const result = await call('doctor');
          setChecks(result.checks ?? []);
        } catch (caught) {
          setChecks([{ name: 'doctor', ok: false, detail: String(caught?.message ?? caught) }]);
        } finally {
          setBusy('');
        }
      };

      const openProjectsDir = async () => {
        setBusy('openDir');
        setError('');
        try {
          await call('openProjectsDir');
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const PROTOCOLS = ['auto', 'openai', 'dashscope', 'tokenplan', 'ark', 'arkplan', 'openspeech'];

      /**
       * Volcengine speech voices, shared by Ark, Agent Plan and openspeech — all three
       * reach the same voice catalogue, and the id is what `req_params.speaker` carries.
       */
      const VOLC_VOICES = [
        { value: 'zh_female_gaolengyujie_uranus_bigtts', label: '高冷御姐·女' },
        { value: 'zh_female_shuangkuaisisi_uranus_bigtts', label: '爽快思思·女' },
        { value: 'zh_female_tianmeixiaoyuan_uranus_bigtts', label: '甜美小源·女' },
        { value: 'zh_female_wanwanxiaohe_uranus_bigtts', label: '湾湾小何·女' },
        { value: 'zh_female_vv_uranus_bigtts', label: 'Vv·女' },
        { value: 'zh_female_xiaohe_uranus_bigtts', label: '小何·女' },
        { value: 'zh_female_cancan_uranus_bigtts', label: '灿灿·女' },
        { value: 'zh_female_qingxinnvsheng_uranus_bigtts', label: '清新女声·女' },
        { value: 'zh_male_lengyue_uranus_bigtts', label: '冷月·男' },
        { value: 'zh_male_yangguangqingnian_uranus_bigtts', label: '阳光青年·男' },
        { value: 'zh_male_jingqiangkanye_uranus_bigtts', label: '京腔侃爷·男' },
        { value: 'zh_male_naiqimengwa_uranus_bigtts', label: '奶气萌娃·童' },
      ];

      /** Endpoint and format presets per protocol, mirroring `DEFAULT_TTS_PATH` / `DEFAULT_IMAGE_PATH` in src/providers.js. */
      /** The value each protocol uses when the field is left blank, matching src/providers.js. */
      const SUGGEST = {
        tts: {
          openai: { baseURL: 'https://api.openai.com/v1', format: 'mp3', model: 'gpt-4o-mini-tts', voice: 'alloy' },
          dashscope: { baseURL: 'https://dashscope.aliyuncs.com', format: 'mp3', language: 'Chinese', model: 'qwen-audio-3.0-tts-plus', voice: 'Cherry' },
          tokenplan: { baseURL: 'https://dashscope.aliyuncs.com', format: 'mp3', model: 'qwen-audio-3.0-tts-plus', voice: 'Cherry' },
          ark: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', format: 'mp3', model: 'doubao-seed-tts-2.0', voice: 'zh_female_gaolengyujie_uranus_bigtts' },
          arkplan: { baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', format: 'mp3', resourceId: 'seed-tts-2.0', model: 'doubao-seed-tts-2.0', voice: 'zh_female_gaolengyujie_uranus_bigtts' },
          openspeech: { baseURL: 'https://openspeech.bytedance.com', format: 'mp3', model: 'doubao-seed-tts-2.0', voice: 'zh_female_gaolengyujie_uranus_bigtts' },
        },
        image: {
          openai: { baseURL: 'https://api.openai.com/v1', size: '1024x1024', model: 'gpt-image-1' },
          dashscope: { baseURL: 'https://dashscope.aliyuncs.com', size: '1024x1024', model: 'qwen-image-3.0-pro' },
          tokenplan: { baseURL: 'https://dashscope.aliyuncs.com', size: '1024x1024', model: 'qwen-image-3.0-pro' },
          ark: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', size: '2048x2048', model: 'doubao-seedream-5.0-pro' },
          arkplan: { baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', size: '2048x2048', model: 'doubao-seedream-5.0-pro' },
          openspeech: { baseURL: 'https://openspeech.bytedance.com', size: '1024x1024', model: '' },
        },
      };

      /**
       * Every model and voice the providers document. A field that has a list renders as a
       * `<select>`; anything the user typed that is not listed stays visible as one more
       * option, so a custom id is never silently swapped for a preset.
       */
      const MODELS = {
        tts: {
          openai: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
          dashscope: ['qwen-audio-3.0-tts-plus', 'qwen-tts'],
          tokenplan: ['qwen-audio-3.0-tts-plus', 'qwen-tts'],
          ark: ['doubao-seed-tts-2.0'],
          arkplan: ['doubao-seed-tts-2.0'],
          openspeech: ['doubao-seed-tts-2.0'],
        },
        image: {
          openai: ['gpt-image-1', 'dall-e-3'],
          dashscope: ['qwen-image-3.0-pro', 'wan2.7-image-pro', 'wan2.7-image'],
          tokenplan: ['qwen-image-3.0-pro', 'wan2.7-image-pro', 'wan2.7-image'],
          ark: ['doubao-seedream-5.0-pro', 'doubao-seedream-5.0-flash'],
          arkplan: ['doubao-seedream-5.0-pro', 'doubao-seedream-5.0-flash'],
          openspeech: [],
        },
      };

      const VOICES = {
        tts: {
          openai: [
            { value: 'alloy', label: 'alloy（中性）' },
            { value: 'ash', label: 'ash（低沉）' },
            { value: 'ballad', label: 'ballad（叙事）' },
            { value: 'coral', label: 'coral（明亮）' },
            { value: 'echo', label: 'echo（男声）' },
            { value: 'fable', label: 'fable（英式）' },
            { value: 'nova', label: 'nova（女声）' },
            { value: 'onyx', label: 'onyx（浑厚男声）' },
            { value: 'sage', label: 'sage（柔和）' },
            { value: 'shimmer', label: 'shimmer（轻柔女声）' },
          ],
          dashscope: [
            { value: 'Cherry', label: 'Cherry（芊悦·女）' },
            { value: 'Serena', label: 'Serena（苏瑶·女）' },
            { value: 'Ethan', label: 'Ethan（晨煦·男）' },
            { value: 'Chelsie', label: 'Chelsie（千雪·女）' },
            { value: 'Dylan', label: 'Dylan（晓东·男·京腔）' },
            { value: 'Jada', label: 'Jada（阿珍·女·吴语）' },
            { value: 'Sunny', label: 'Sunny（晴儿·女·四川话）' },
            { value: 'Nofish', label: 'Nofish（不吃鱼·男）' },
          ],
          tokenplan: [
            { value: 'Cherry', label: 'Cherry（芊悦·女）' },
            { value: 'Serena', label: 'Serena（苏瑶·女）' },
            { value: 'Ethan', label: 'Ethan（晨煦·男）' },
            { value: 'Chelsie', label: 'Chelsie（千雪·女）' },
            { value: 'Dylan', label: 'Dylan（晓东·男·京腔）' },
            { value: 'Jada', label: 'Jada（阿珍·女·吴语）' },
            { value: 'Sunny', label: 'Sunny（晴儿·女·四川话）' },
            { value: 'Nofish', label: 'Nofish（不吃鱼·男）' },
          ],
          ark: VOLC_VOICES,
          arkplan: VOLC_VOICES,
          openspeech: VOLC_VOICES,
        },
      };

      const SIZES = {
        image: {
          openai: ['1024x1024', '1024x1536', '1536x1024', 'auto'],
          dashscope: ['1024x1024', '1328x1328', '1664x928', '928x1664'],
          tokenplan: ['1024x1024', '1328x1328', '1664x928', '928x1664'],
          ark: ['2048x2048', '2048x1152', '1152x2048', '1024x1024'],
          arkplan: ['2048x2048', '2048x1152', '1152x2048', '1024x1024'],
          openspeech: ['1024x1024'],
        },
      };

      /** A `<select>` whose list is the provider's documented values plus whatever is stored. */
      const choiceField = (value, options, onChange) => {
        const current = String(value ?? '');
        const normalised = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
        const known = normalised.some((option) => option.value === current);
        const extra = current !== '' && !known ? [{ value: current, label: `${current}（${t('customValue')}）` }] : [];
        return h(
          'select',
          { className: 'dshrs-select', value: current, onChange: (event) => onChange(event.target.value) },
          ...normalised.map((option) => h('option', { value: option.value, key: option.value }, option.label)),
          ...extra.map((option) => h('option', { value: option.value, key: '__custom' }, option.label)),
        );
      };

      const providerCard = (provider, fields, titleKey) => {
        const config = draft.providers[provider] ?? {};
        const status = snapshot.settings?.providers?.[provider]?.apiKeyConfigured;
        const test = tests[provider];
        const protocolHint = config.protocol && config.protocol !== 'auto' ? t(`protoHint_${config.protocol}`) : t('protoHint_auto');
        const effective = PROTOCOLS.includes(config.protocol) ? config.protocol : 'auto';
        return h(
          'div',
          { className: 'dshrs-card' },
          h(
            'div',
            { className: 'dshrs-inline' },
            h('div', { className: 'dshrs-card-title' }, t(titleKey)),
            h('span', { className: `dshrs-badge${status ? ' dshrs-badge-on' : ''}` }, status ? t('keySet') : t('keyUnset')),
          ),
          row(
            t('protocol'),
            protocolHint,
            h(
              'select',
              {
                className: 'dshrs-select',
                // Normalise so a value that is not in the list never displays as the first option.
                value: PROTOCOLS.includes(config.protocol) ? config.protocol : 'auto',
                onChange: (event) => setProvider(provider, 'protocol')(event.target.value),
              },
              ...PROTOCOLS.map((value) => h('option', { value, key: value }, t(`proto_${value}`))),
            ),
          ),
          ...fields.map((field) => {
            const key = field.key;
            const value = config[key] ?? '';
            const options =
              key === 'model'
                ? (MODELS[provider]?.[effective] ?? [])
                : key === 'voice'
                  ? (VOICES[provider]?.[effective] ?? [])
                  : key === 'size'
                    ? (SIZES[provider]?.[effective] ?? [])
                    : null;
            const suggestion = SUGGEST[provider]?.[effective]?.[key];
            const control =
              options && options.length > 0
                ? choiceField(value, options, setProvider(provider, key))
                : field.type === 'area'
                  ? h('textarea', {
                      className: 'dshrs-area',
                      value,
                      placeholder: suggestion && key !== 'extraBody' ? String(suggestion) : '',
                      onChange: setProvider(provider, key),
                    })
                  : fieldInput(value, setProvider(provider, key), {
                      placeholder: suggestion ? String(suggestion) : '',
                      ...(field.type === 'number' ? { type: 'number' } : {}),
                    });
            return row(field.label, field.hint, control);
          }),
          row(
            t('apiKey'),
            null,
            h(
              'div',
              { className: 'dshrs-inline' },
              h('input', {
                className: 'dshrs-input',
                style: { flex: '1', minWidth: '160px' },
                type: 'password',
                placeholder: status ? '••••••••' : '',
                value: secretInput[provider] ?? '',
                onChange: (event) => setSecretInput((current) => ({ ...current, [provider]: event.target.value })),
              }),
              h(
                'button',
                {
                  className: 'dshrs-btn dshrs-btn-sm',
                  disabled: busy !== '' || (secretInput[provider] ?? '').trim() === '',
                  onClick: () => saveSecret(provider),
                },
                t('saveKey'),
              ),
              h(
                'button',
                { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '' || !status, onClick: () => clearSecret(provider) },
                t('clearKey'),
              ),
              h(
                'button',
                { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '', onClick: () => runTest(provider) },
                busy === `test-${provider}` ? t('testing') : t('test'),
              ),
            ),
          ),
          test
            ? h(
                'div',
                { className: 'dshrs-check' },
                h('span', null, test.ok ? '✅' : '❌'),
                h('div', null, test.detail, test.preview ? h('div', null, h('img', { className: 'dshrs-preview', src: test.preview })) : null),
              )
            : null,
        );
      };

      const projects = snapshot.projects ?? [];
      const selectedStudio = studioProject || projects[0]?.name || '';

      const launchStudio = async () => {
        if (!selectedStudio) return;
        setBusy('studio');
        setError('');
        setMessage('');
        try {
          const result = await call('studioStart', { project: selectedStudio });
          if (!result?.url) throw new Error('未返回 Studio 地址');
          if (!result.ready) {
            setError(`${t('studioStarting')} ${result.url}`);
          } else if (result.autoOpen) {
            setMessage(`${t('studioOpened')} ${result.url}`);
          } else {
            window.open(result.url, '_blank', 'noopener');
            setMessage(`${t('studioOpened')} ${result.url}`);
          }
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const studioCard = h(
        'div',
        { className: 'dshrs-card' },
        h('div', { className: 'dshrs-card-title' }, t('groupStudio')),
        h('div', { className: 'dshrs-hint' }, t('groupStudioHint')),
        row(
          t('autoOpen'),
          t('autoOpenHint'),
          h('input', {
            type: 'checkbox',
            className: 'dshrs-box',
            checked: draft.autoOpenStudio !== false,
            onChange: setFlag('autoOpenStudio'),
          }),
        ),
        row(
          t('studioProject'),
          null,
          h(
            'div',
            { className: 'dshrs-inline' },
            projects.length
              ? h(
                  'select',
                  { className: 'dshrs-select dshrs-select-sm', value: selectedStudio, onChange: (event) => setStudioProject(event.target.value) },
                  ...projects.map((project) => h('option', { key: project.name, value: project.name }, project.name)),
                )
              : h('span', { className: 'dshrs-hint' }, t('noProjects')),
            h(
              'button',
              {
                className: 'dshrs-btn dshrs-btn-sm dshrs-btn-primary',
                disabled: busy !== '' || !selectedStudio,
                onClick: launchStudio,
              },
              busy === 'studio' ? t('studioStarting') : t('studioStart'),
            ),
          ),
        ),
      );

      return h(
        'div',
        { className: 'dshrs-root' },
        h('style', { 'data-plugin-css': NS }, css),
        h('div', { className: 'dshrs-head' }, h('div', { className: 'dshrs-sub' }, t('subtitle'))),
        studioCard,
        h(
          'div',
          { className: 'dshrs-card' },
          h('div', { className: 'dshrs-card-title' }, t('groupProject')),
          row(t('projectsDir'), t('projectsDirHint'), input(draft.projectsDir, setField('projectsDir'))),
          h('div', { className: 'dshrs-mono' }, snapshot.paths?.projectsDirAbs ?? ''),
          row(t('outDir'), t('outDirHint'), input(draft.outDir, setField('outDir'))),
          row(
            t('codec'),
            null,
            h(
              'select',
              { className: 'dshrs-select', value: draft.defaultCodec, onChange: setField('defaultCodec') },
              ...CODECS.map((codec) => h('option', { key: codec, value: codec }, codec)),
            ),
          ),
          row(t('concurrency'), t('concurrencyHint'), input(draft.concurrency, setField('concurrency'), { type: 'number', min: 0 })),
          row(t('extraFlags'), t('extraFlagsHint'), input(draft.extraRenderFlags, setField('extraRenderFlags'))),
          row(t('timeout'), null, input(draft.timeoutMs, setField('timeoutMs'), { type: 'number', min: 1000 })),
          row(t('registry'), null, input(draft.npmRegistry, setField('npmRegistry'))),
          row(t('version'), null, input(draft.remotionVersion, setField('remotionVersion'))),
          row(
            t('chrome'),
            null,
            h(
              'select',
              { className: 'dshrs-select', value: draft.chromeMode, onChange: setField('chromeMode') },
              h('option', { value: 'download' }, t('chromeDownload')),
              h('option', { value: 'path' }, t('chromePath')),
            ),
          ),
          draft.chromeMode === 'path' ? row(t('chromePathLabel'), null, input(draft.chromePath, setField('chromePath'))) : null,
        ),
        providerCard(
          'tts',
          [
            { key: 'baseURL', label: t('baseURL') },
            { key: 'path', label: t('path'), hint: t('pathHint') },
            { key: 'model', label: t('model') },
            { key: 'voice', label: t('voice') },
            { key: 'format', label: t('format') },
            { key: 'language', label: t('language'), hint: t('languageHint') },
            { key: 'resourceId', label: t('resourceId') },
            { key: 'extraBody', label: t('extraBody'), hint: t('extraBodyHint'), type: 'area' },
          ],
          'groupTts',
        ),
        providerCard(
          'image',
          [
            { key: 'baseURL', label: t('baseURL') },
            { key: 'path', label: t('path'), hint: t('pathHint') },
            { key: 'model', label: t('model') },
            { key: 'size', label: t('size') },
            { key: 'extraBody', label: t('extraBody'), hint: t('extraBodyHint'), type: 'area' },
          ],
          'groupImage',
        ),
        h(
          'div',
          { className: 'dshrs-card' },
          h('div', { className: 'dshrs-card-title' }, t('groupStatus')),
          h(
            'div',
            { className: 'dshrs-inline' },
            h('button', { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '', onClick: runDoctor }, busy === 'doctor' ? t('checking') : t('doctor')),
            h('button', { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '', onClick: openProjectsDir }, t('openDir')),
          ),
          checks
            ? h(
                'div',
                { className: 'dshrs-list' },
                ...checks.map((check, index) =>
                  h('div', { className: 'dshrs-check', key: `${check.name}-${index}` }, h('span', null, check.ok ? '✅' : '❌'), h('div', null, h('strong', null, check.name), ' · ', String(check.detail))),
                ),
              )
            : null,
          h('div', { className: 'dshrs-mono' }, `${t('settingsFile')}: ${snapshot.paths?.settingsFile ?? ''}`),
          h('div', { className: 'dshrs-mono' }, `${t('runtime')}: Node ${snapshot.runtime?.node ?? '?'} · ${snapshot.runtime?.platform ?? ''}`),
          // Save controls close out this card in normal flow: the settings
          // shell owns the scrolling column, so anything sticky or portalled
          // would paint over whatever card scrolls beneath it.
          h(
            'div',
            { className: 'dshrs-foot' },
            h('div', { className: 'dshrs-foot-msg dshrs-msg' + (error ? ' dshrs-msg-err' : '') }, error || message),
            h('button', { className: 'dshrs-btn', disabled: busy !== '', onClick: load }, t('discard')),
            h('button', { className: 'dshrs-btn', disabled: busy !== '', onClick: reset }, t('reset')),
            h('button', { className: 'dshrs-btn dshrs-btn-primary', disabled: busy !== '', onClick: save }, busy === 'save' ? t('saving') : t('save')),
          ),
        ),
      );
    }

    let tGlobal = (key) => DICT.zh[key] || key;

    /**
     * Nav icon for this section. The shell draws the settings nav row itself
     * and asks `settings.section.icon` for the glyph addressed by the matching
     * `settings.section` id, so this gets only the id and must paint inline.
     */
    function SectionIcon(props) {
      const size = Number(props?.size) || 16;
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
          style: { display: 'block' },
        },
        h('rect', { x: 2.25, y: 4.75, width: 13.5, height: 14.5, rx: 3, stroke: 'currentColor', 'stroke-width': 1.6 }),
        h('path', { d: 'M9 9.4v5.2l4.4-2.6L9 9.4Z', fill: 'currentColor' }),
        h('path', { d: 'M18 8.6v6.8M20.75 10.2v3.6', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        tGlobal = createT(ctx);
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register({ name: 'settings.section', id: NS, order: 60, label: () => tGlobal('nav') }, SettingsPage),
        );
        ctx.slots.inject('settings.section.icon', () =>
          ctx.slots.register({ name: 'settings.section.icon', id: NS, order: 0 }, SectionIcon),
        );
      },
    };
  },
});